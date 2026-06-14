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
    const pendientes = url.searchParams.get("pendientes");

    if (pendientes === "true") {
      const { data, error } = await supabase
        .from("movimientos_billetera")
        .select("*, billeteras!inner(cliente_telefono, cliente_nombre)")
        .eq("estado", "pendiente")
        .eq("tipo", "deposito")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data || []);
    }

    const { data: wallets, error } = await supabase
      .from("billeteras")
      .select("*")
      .order("cliente_nombre", { ascending: true });

    if (error) throw error;
    return NextResponse.json(wallets || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getAdminClient();
    const body = await req.json();
    const { action, movimiento_id, motivo } = body;

    if (action === "confirmar") {
      if (!movimiento_id) {
        return NextResponse.json({ error: "Movimiento requerido" }, { status: 400 });
      }

      const { data: mov } = await supabase
        .from("movimientos_billetera")
        .select("*, billeteras!inner(id, saldo, cliente_telefono)")
        .eq("id", movimiento_id)
        .single();

      if (!mov) {
        return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
      }
      if (mov.estado !== "pendiente") {
        return NextResponse.json({ error: "Ya fue procesado" }, { status: 400 });
      }

      const saldoAnterior = mov.billeteras.saldo;
      const saldoNuevo = saldoAnterior + mov.monto;

      const { error: updateError } = await supabase
        .from("billeteras")
        .update({ saldo: saldoNuevo, updated_at: new Date().toISOString() })
        .eq("id", mov.billetera_id);

      if (updateError) throw updateError;

      const { error: movError } = await supabase
        .from("movimientos_billetera")
        .update({ estado: "confirmado", saldo_anterior: saldoAnterior, saldo_nuevo: saldoNuevo })
        .eq("id", movimiento_id);

      if (movError) throw movError;

      return NextResponse.json({
        success: true,
        message: `Recarga de $${mov.monto.toLocaleString()} confirmada`,
      });
    }

    if (action === "rechazar") {
      if (!movimiento_id) {
        return NextResponse.json({ error: "Movimiento requerido" }, { status: 400 });
      }

      const { error } = await supabase
        .from("movimientos_billetera")
        .update({ estado: "rechazado" })
        .eq("id", movimiento_id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Recarga rechazada" });
    }

    if (action === "ajustar") {
      const { billetera_id, monto, motivo: razon } = body;
      if (!billetera_id || !monto) {
        return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
      }

      const { data: wallet } = await supabase
        .from("billeteras")
        .select("saldo")
        .eq("id", billetera_id)
        .single();

      if (!wallet) {
        return NextResponse.json({ error: "Billetera no encontrada" }, { status: 404 });
      }

      const saldoAnterior = wallet.saldo;
      const saldoNuevo = saldoAnterior + monto;

      if (saldoNuevo < 0) {
        return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
      }

      const { error: updError } = await supabase
        .from("billeteras")
        .update({ saldo: saldoNuevo, updated_at: new Date().toISOString() })
        .eq("id", billetera_id);

      if (updError) throw updError;

      await supabase.from("movimientos_billetera").insert({
        billetera_id,
        tipo: monto > 0 ? "deposito" : "retiro",
        monto: Math.abs(monto),
        saldo_anterior: saldoAnterior,
        saldo_nuevo: saldoNuevo,
        referencia: razon || "Ajuste admin",
        estado: "confirmado",
        creado_por: "admin",
      });

      return NextResponse.json({ success: true, message: "Saldo ajustado" });
    }

    return NextResponse.json({ error: "Accion no valida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
