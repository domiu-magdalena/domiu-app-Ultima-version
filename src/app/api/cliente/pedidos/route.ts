import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    if (!serviceKey) {
      return NextResponse.json({ error: "Servidor no configurado" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { cliente_nombre, cliente_telefono, cliente_direccion, cliente_barrio, nota, negocio_id, domicilio, metodo_pago, items, propina, tarifa_servicio, distancia_km } = body;

    if (!cliente_nombre || !cliente_telefono || !cliente_direccion || !negocio_id || !items || items.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    let itemSubtotal = 0;
    for (const item of items) {
      itemSubtotal += item.precio * item.cantidad;
    }
    const p = propina || 0;
    const ts = tarifa_servicio || 0;
    const total = itemSubtotal + (domicilio || 0) + p + ts;

    if (metodo_pago === "billetera") {
      const { data: wallet } = await supabase
        .from("billeteras")
        .select("id, saldo")
        .eq("cliente_telefono", cliente_telefono)
        .maybeSingle();

      if (!wallet) {
        return NextResponse.json({ error: "No tienes billetera. Crea una desde tu perfil." }, { status: 400 });
      }

      if (wallet.saldo < total) {
        return NextResponse.json({
          error: `Saldo insuficiente. Tienes $${wallet.saldo.toLocaleString()} y el total es $${total.toLocaleString()}`,
        }, { status: 400 });
      }
    }

    const pedidoPayload: Record<string, any> = {
      cliente_nombre,
      cliente_telefono,
      cliente_direccion,
      cliente_barrio: cliente_barrio || "",
      nota: nota || "",
      negocio_id,
      domicilio: domicilio || 0,
      total,
      estado: "recibido",
      metodo_pago: metodo_pago || "efectivo",
      propina: p,
      tarifa_servicio: ts,
      distancia_km: distancia_km || 0,
    };
    pedidoPayload.subtotal = itemSubtotal;

    let pedido: any;
    const { data: pedidoData, error: pedidoError } = await supabase
      .from("pedidos_cliente")
      .insert(pedidoPayload)
      .select("id, codigo")
      .single();

    if (pedidoError) {
      delete pedidoPayload.subtotal;
      const { data: pedidoFallback, error: pedidoError2 } = await supabase
        .from("pedidos_cliente")
        .insert(pedidoPayload)
        .select("id, codigo")
        .single();
      if (pedidoError2) throw pedidoError2;
      pedido = pedidoFallback;
    } else {
      pedido = pedidoData;
    }

    const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    let fallbackProductId: string | null = null;
    for (const item of items) {
      if (!isUUID(item.productId)) {
        const { data: p } = await supabase
          .from("productos")
          .select("id")
          .eq("negocio_id", negocio_id)
          .limit(1)
          .maybeSingle();
        if (p?.id) {
          fallbackProductId = p.id;
        } else {
          const { data: newP } = await supabase
            .from("productos")
            .insert({ negocio_id, nombre: item.nombre || "Producto personalizado", precio: item.precio, disponible: true })
            .select("id")
            .single();
          fallbackProductId = newP?.id || null;
        }
        break;
      }
    }
    const detalles = items.map((item: any) => ({
      pedido_id: pedido.id,
      producto_id: isUUID(item.productId) ? item.productId : (fallbackProductId || negocio_id),
      producto_nombre: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      subtotal: item.precio * item.cantidad,
    }));

    const { error: detalleError } = await supabase
      .from("detalle_pedido_cliente")
      .insert(detalles);

    if (detalleError) {
      const detallesSinSubtotal = detalles.map((d: any) => {
        const { subtotal, ...rest } = d;
        return rest;
      });
      const { error: detalleError2 } = await supabase
        .from("detalle_pedido_cliente")
        .insert(detallesSinSubtotal);
      if (detalleError2) throw detalleError2;
    }

    if (metodo_pago === "billetera") {
      const { data: wallet } = await supabase
        .from("billeteras")
        .select("id, saldo")
        .eq("cliente_telefono", cliente_telefono)
        .single();

      const saldoAnterior = wallet.saldo;
      const saldoNuevo = saldoAnterior - total;

      await supabase
        .from("billeteras")
        .update({ saldo: saldoNuevo, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);

      await supabase.from("movimientos_billetera").insert({
        billetera_id: wallet.id,
        tipo: "pago",
        monto: total,
        saldo_anterior: saldoAnterior,
        saldo_nuevo: saldoNuevo,
        referencia: `Pago pedido #${pedido.codigo}`,
        pedido_codigo: pedido.codigo,
        estado: "confirmado",
        creado_por: "sistema",
      });
    }

    // Auto-publicar a domicilios_disponibles (matching engine)
    try {
      const negData = await supabase.from("negocios").select("nombre, direccion").eq("id", negocio_id).maybeSingle();
      const negNombre = negData?.data?.nombre || "Negocio";
      const negDir = negData?.data?.direccion || "";
      await supabase.from("domicilios_disponibles").insert({
        pedido_cliente_id: pedido.id,
        negocio_id,
        direccion_origen: negNombre,
        direccion_destino: cliente_direccion,
        valor_domicilio: domicilio || 3000,
        distancia_km: distancia_km || null,
        cliente_nombre,
        cliente_telefono,
        negocio_nombre: negNombre,
        pedido_codigo: pedido.codigo,
      });
      try {
        const { enviarPushATodos } = await import("@/lib/push");
        await enviarPushATodos({
          titulo: "📦 Nuevo pedido disponible",
          cuerpo: `${cliente_nombre} · ${negNombre} · $${(domicilio || 3000).toLocaleString()}`,
          tipo: "nuevo_domicilio",
          pedido_codigo: pedido.codigo,
        });
      } catch {}
    } catch (e) { console.error("Error auto-publicando:", e); }

    return NextResponse.json({ success: true, pedido: { id: pedido.id, codigo: pedido.codigo } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const codigo = url.searchParams.get("codigo");
    const telefono = url.searchParams.get("telefono");

    if (codigo) {
      const { data, error } = await supabase
        .from("pedidos_cliente")
        .select("*, detalle_pedido_cliente(*), negocios(nombre, logo)")
        .eq("codigo", codigo)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json(data || null);
    }

    if (telefono) {
      const { data, error } = await supabase
        .from("pedidos_cliente")
        .select("*, negocios(nombre)")
        .eq("cliente_telefono", telefono)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json(data || []);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
