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

async function synNegocio(supabase: any, data: any, user_id?: string, old_nombre?: string) {
  const neg: any = {
    nombre: data.nombre,
    direccion: data.direccion || "",
    telefono: data.telefono || "",
    descripcion: data.descripcion || "",
    horario: data.horario || "Lun-Dom 8:00-22:00",
    domicilio_cost: Number(data.domicilio_cost) || 3000,
    rating: Number(data.rating) || 4.5,
    abierto: data.abierto !== undefined ? data.abierto : true,
    destacado: data.destacado || false,
    activo: true,
    logo: data.logo || "",
    banner: data.banner || "",
    categoria: data.categoria || "General",
  };
  if (user_id) neg.usuario_id = user_id;

  const matchName = old_nombre || data.nombre;

  // Check if negocio exists for this local name
  const { data: existing } = await supabase.from("negocios").select("id").eq("nombre", matchName).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("negocios").update(neg).eq("nombre", matchName);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("negocios").insert(neg);
    if (error) throw error;
  }
}

export async function GET(req: Request) {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.from("locales").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getAdminClient();
    const body = await req.json();
    const { id, action, user_id, old_nombre, ...data } = body;

    if (action === "toggle") {
      const { error } = await supabase.from("locales").update({ activo: data.activo }).eq("id", id);
      if (error) throw error;
      await supabase.from("negocios").update({ activo: data.activo }).eq("nombre", data.nombre || old_nombre);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await supabase.from("locales").update({ activo: false }).eq("id", id);
      if (error) throw error;
      await supabase.from("negocios").update({ activo: false }).eq("nombre", data.nombre || old_nombre);
      return NextResponse.json({ success: true });
    }

    if (id) {
      const { data: updated, error } = await supabase.from("locales").update(data).eq("id", id).select().single();
      if (error) throw error;
      await synNegocio(supabase, data, user_id, old_nombre || data.nombre);
      return NextResponse.json({ data: updated });
    }

    const { data: nuevo, error } = await supabase.from("locales").insert({ ...data, user_id }).select().single();
    if (error) throw error;

    await synNegocio(supabase, data, user_id);
    return NextResponse.json({ success: true, data: nuevo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
