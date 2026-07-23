import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPushToSubscription } from "@/lib/push";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getAdmin() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase no está configurado para probar notificaciones");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const { repartidor_id } = await req.json();
    if (!repartidor_id) {
      return NextResponse.json({ error: "repartidor_id requerido" }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data: subscription, error } = await supabase
      .from("push_subscriptions")
      .select("subscription_json")
      .eq("repartidor_id", repartidor_id)
      .maybeSingle();

    if (error) throw error;
    if (!subscription?.subscription_json) {
      return NextResponse.json(
        { error: "Este dispositivo todavía no tiene una suscripción push registrada" },
        { status: 404 },
      );
    }

    await sendPushToSubscription(subscription.subscription_json, {
      title: "DomiU: notificaciones activadas",
      body: "Tu dispositivo ya puede recibir nuevos domicilios cercanos.",
      url: "/repartidor",
      test: true,
    });

    return NextResponse.json({ success: true, sent: 1 });
  } catch (error: any) {
    console.error("Error probando Web Push:", error);
    return NextResponse.json(
      { error: error?.message || "No se pudo enviar la notificación de prueba" },
      { status: 500 },
    );
  }
}
