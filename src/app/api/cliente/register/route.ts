import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { nombre, apellido, email, telefono, direccion, edad, fecha_nacimiento, documento_identidad, password, metodo } = await request.json();
    const authMethod = metodo === "phone" ? "phone" : "email";

    if (!nombre?.trim() || !apellido?.trim() || !telefono?.trim() || !direccion?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
    }
    if (authMethod === "email" && !email?.trim()) {
      return NextResponse.json({ error: "El correo electrónico es obligatorio" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: existingPhone } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("telefono", telefono.trim())
      .maybeSingle();

    if (existingPhone) {
      return NextResponse.json({ error: "Este número de teléfono ya está registrado" }, { status: 400 });
    }

    let createPayload: any = {
      password,
      email_confirm: true,
      user_metadata: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        edad: edad ? parseInt(edad) : null,
        fecha_nacimiento: fecha_nacimiento || null,
        documento_identidad: documento_identidad?.trim() || null,
        rol: "cliente",
      },
    };

    if (authMethod === "phone") {
      createPayload.phone = telefono.trim();
    } else {
      createPayload.email = email.trim();
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser(createPayload);

    if (authError) {
      if (authError.message.includes("already registered")) {
        const campo = authMethod === "phone" ? "teléfono" : "correo";
        return NextResponse.json({ error: `Este ${campo} ya está registrado` }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const profileData: any = {
      id: authUser.user!.id,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rol: "cliente",
      telefono: telefono.trim(),
      direccion: direccion.trim(),
      edad: edad ? parseInt(edad) : null,
      fecha_nacimiento: fecha_nacimiento || null,
      documento_identidad: documento_identidad?.trim() || null,
    };
    if (authMethod === "email") {
      profileData.email = email.trim();
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(profileData, { onConflict: "id" });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    return NextResponse.json({ success: true, user: { id: authUser.user!.id }, metodo: authMethod });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
