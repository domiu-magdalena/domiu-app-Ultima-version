import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { calcularTarifas, geocodificar, haversineKm } from "@/lib/tarifas";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdmin() {
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = getAdmin();
    const { pedido_cliente_id, negocio_id } = await req.json();

    if (!pedido_cliente_id || !negocio_id) {
      return NextResponse.json({ error: "pedido_cliente_id y negocio_id requeridos" }, { status: 400 });
    }

    // Obtener datos del pedido y negocio
    const { data: pedido, error: e1 } = await supabase
      .from("pedidos_cliente")
      .select("codigo, cliente_nombre, cliente_telefono, cliente_direccion, domicilio, negocios(nombre, direccion, latitud, longitud)")
      .eq("id", pedido_cliente_id)
      .single();
    if (e1 || !pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    const negocio = Array.isArray(pedido.negocios) ? pedido.negocios[0] : pedido.negocios;

    // Verificar que no exista ya un domicilio disponible para este pedido
    const { data: existing } = await supabase
      .from("domicilios_disponibles")
      .select("id, estado")
      .eq("pedido_cliente_id", pedido_cliente_id)
      .neq("estado", "cancelado")
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Este pedido ya tiene un domicilio publicado", data: existing }, { status: 400 });
    }

    // Calcular distancia automáticamente
    let km = null;
    if (negocio?.direccion && pedido.cliente_direccion) {
      const [origCoords, destCoords] = await Promise.all([
        geocodificar(negocio.direccion),
        geocodificar(pedido.cliente_direccion),
      ]);
      if (origCoords && destCoords) {
        km = haversineKm(origCoords, destCoords);
      }
    }

    // Calcular tarifa automáticamente con la misma fórmula del admin
    const tarifa = km !== null && km > 0 ? calcularTarifas(km) : null;
    const valorDomicilio = tarifa ? tarifa.precio : (pedido.domicilio || 5000);
    const pagoRepartidor = tarifa ? tarifa.pagoRepartidor : Math.round((pedido.domicilio || 5000) * 0.75);
    const empresaRecibe = valorDomicilio - pagoRepartidor;

    const domicilio = {
      pedido_cliente_id,
      negocio_id,
      direccion_origen: negocio?.nombre || "Restaurante",
      direccion_destino: pedido.cliente_direccion,
      valor_domicilio: valorDomicilio,
      distancia_km: km,
      cliente_nombre: pedido.cliente_nombre,
      cliente_telefono: pedido.cliente_telefono,
      negocio_nombre: negocio?.nombre || "Negocio",
      pedido_codigo: pedido.codigo,
      origen_lat: negocio?.latitud || null,
      origen_lng: negocio?.longitud || null,
    };

    const { data: inserted, error: e2 } = await supabase
      .from("domicilios_disponibles")
      .insert(domicilio)
      .select()
      .single();

    if (e2) throw e2;

    // Actualizar estado del pedido y asignar pago_repartidor calculado
    await supabase
      .from("pedidos_cliente")
      .update({
        estado: "esperando_domiciliario",
        pago_repartidor: pagoRepartidor,
        comision_empresa: empresaRecibe,
        ganancia_empresa: empresaRecibe,
      })
      .eq("id", pedido_cliente_id);

    // Enviar push notification a todos los repartidores
    try {
      const { enviarPushATodos } = await import("@/lib/push");
      await enviarPushATodos(inserted);
    } catch (e) { console.error("Error enviando push:", e); }

    return NextResponse.json({ success: true, data: inserted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
