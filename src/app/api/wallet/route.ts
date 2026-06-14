import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: Request) {
  try {
    const supabase = getAdminClient();
    const url = new URL(req.url);
    const telefono = url.searchParams.get("telefono");

    if (!telefono) {
      return NextResponse.json({ error: "Telefono requerido" }, { status: 400 });
    }

    const { data: wallet, error } = await supabase
      .from("billeteras")
      .select("*")
      .eq("cliente_telefono", telefono)
      .maybeSingle();

    if (error) throw error;

    if (!wallet) {
      return NextResponse.json({ saldo: 0, movimientos: [] });
    }

    const { data: movimientos } = await supabase
      .from("movimientos_billetera")
      .select("*")
      .eq("billetera_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ ...wallet, movimientos: movimientos || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getAdminClient();
    const body = await req.json();
    const { action } = body;

    if (action === "crear") {
      const { cliente_telefono, cliente_nombre } = body;
      if (!cliente_telefono) {
        return NextResponse.json({ error: "Telefono requerido" }, { status: 400 });
      }

      const { data: exists } = await supabase
        .from("billeteras")
        .select("id")
        .eq("cliente_telefono", cliente_telefono)
        .maybeSingle();

      if (exists) {
        return NextResponse.json({ success: true, id: exists.id });
      }

      const { data, error } = await supabase
        .from("billeteras")
        .insert({ cliente_telefono, cliente_nombre: cliente_nombre || "" })
        .select("id")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, id: data.id });
    }

    if (action === "depositar") {
      const { cliente_telefono, monto, referencia, comprobante_url } = body;
      if (!cliente_telefono || !monto || monto <= 0) {
        return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
      }

      let { data: wallet } = await supabase
        .from("billeteras")
        .select("id, saldo")
        .eq("cliente_telefono", cliente_telefono)
        .maybeSingle();

      if (!wallet) {
        const { data: newWallet } = await supabase
          .from("billeteras")
          .insert({ cliente_telefono })
          .select("id, saldo")
          .single();
        wallet = newWallet;
      }

      const saldoAnterior = wallet.saldo;
      const saldoNuevo = saldoAnterior + monto;

      const { data: movimiento, error: movError } = await supabase
        .from("movimientos_billetera")
        .insert({
          billetera_id: wallet.id,
          tipo: "deposito",
          monto,
          saldo_anterior: saldoAnterior,
          saldo_nuevo: saldoNuevo,
          referencia: referencia || "",
          comprobante_url: comprobante_url || "",
          estado: "pendiente",
          creado_por: "cliente",
        })
        .select("id")
        .single();

      if (movError) throw movError;

      return NextResponse.json({
        success: true,
        message: "Solicitud de recarga enviada. Espera confirmacion del admin.",
        movimiento_id: movimiento.id,
      });
    }

    return NextResponse.json({ error: "Accion no valida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
