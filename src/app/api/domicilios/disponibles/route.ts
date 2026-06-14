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

export async function GET(req: Request) {
  try {
    const supabase = getAdmin();
    const { searchParams } = new URL(req.url);
    const repartidorId = searchParams.get("repartidor_id");
    const onlyMine = searchParams.get("mis_aceptados") === "true";

    if (onlyMine && repartidorId) {
      const { data, error } = await supabase
        .from("domicilios_disponibles")
        .select("*")
        .eq("repartidor_id", repartidorId)
        .neq("estado", "cancelado")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data || []);
    }

    // Domicilios disponibles (no aceptados aun)
    const { data, error } = await supabase
      .from("domicilios_disponibles")
      .select("*")
      .eq("estado", "disponible")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
