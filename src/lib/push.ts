import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT!;

export async function enviarPushATodos(domicilio: any) {
  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: subs } = await supabase.from("push_subscriptions").select("subscription_json");
    if (!subs || subs.length === 0) return { sent: 0 };

    const webpush = await import("web-push");
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title: "Nuevo domicilio disponible",
      body: `#${domicilio.pedido_codigo} - ${domicilio.cliente_nombre} - ${domicilio.direccion_destino?.substring(0, 40)} - $${domicilio.valor_domicilio?.toLocaleString() || "0"}`,
      domicilioId: domicilio.id,
    });

    let sent = 0;
    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          const sub = JSON.parse(s.subscription_json);
          await webpush.sendNotification(sub, payload);
          sent++;
        } catch (e: any) {
          if (e.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("subscription_json", s.subscription_json);
          }
        }
      })
    );

    return { sent };
  } catch (e) {
    console.error("Error enviando push:", e);
    return { sent: 0, error: e };
  }
}
