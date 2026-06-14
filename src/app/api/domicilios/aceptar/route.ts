import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
    const { domicilio_id, repartidor_id } = await req.json();

    if (!domicilio_id || !repartidor_id) {
      return NextResponse.json({ error: "domicilio_id y repartidor_id requeridos" }, { status: 400 });
    }

    // Atomic update: solo si estado sigue siendo 'disponible'
    // Esto previene race conditions - el primer UPDATE que coincida gana
    const { data: updated, error: e1 } = await supabase
      .from("domicilios_disponibles")
      .update({
        estado: "aceptado",
        repartidor_id,
        aceptado_at: new Date().toISOString(),
      })
      .eq("id", domicilio_id)
      .eq("estado", "disponible")
      .select();

    if (e1) throw e1;

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "Este domicilio ya fue aceptado por otro repartidor" }, { status: 409 });
    }

    const domicilio = updated[0];

    // Asignar repartidor al pedido y actualizar estado
    await supabase
      .from("pedidos_cliente")
      .update({
        repartidor_id,
        estado: "asignado",
      })
      .eq("id", domicilio.pedido_cliente_id);

    return NextResponse.json({ success: true, data: domicilio });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
