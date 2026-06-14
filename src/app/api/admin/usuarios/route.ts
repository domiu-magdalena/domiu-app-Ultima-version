import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const { data: profiles } = await supabaseAdmin.from("profiles").select("*");

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const result = (users?.users || []).map((u: any) => {
      const p = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        nombre: p?.nombre || u.user_metadata?.nombre || "",
        telefono: p?.telefono || u.user_metadata?.telefono || "",
        rol: p?.rol || u.user_metadata?.rol || "desconocido",
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        confirmed: u.email_confirmed_at ? true : false,
        disabled: u.banned_until ? true : false,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, userId, email, password } = await request.json();
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    switch (action) {
      case "update-email": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
        if (error) throw error;
        return NextResponse.json({ success: true });
      }
      case "reset-password": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Contraseña restablecida" });
      }
      case "disable": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "24h" });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Usuario desactivado por 24h" });
      }
      case "enable": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Usuario activado" });
      }
      case "delete": {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Usuario eliminado" });
      }
      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
