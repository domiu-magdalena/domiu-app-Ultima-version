import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = getAdmin();
    const { subscription, repartidor_id } = await req.json();

    if (!subscription || !repartidor_id) {
      return NextResponse.json({ error: "subscription y repartidor_id requeridos" }, { status: 400 });
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        repartidor_id,
        endpoint: subscription.endpoint,
        auth_key: subscription.keys?.auth || "",
        p256dh_key: subscription.keys?.p256dh || "",
        subscription_json: JSON.stringify(subscription),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "repartidor_id" }
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
