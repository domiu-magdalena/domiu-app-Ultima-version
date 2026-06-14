import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Nzc1MTU2NDgsImV4cCI6MjA5MzA5MTY0OH0.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";
const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  // List all negocios
  const { data: negocios, error } = await supabase.from("negocios").select("id, nombre, categoria");
  if (error) { console.error("Error:", error.message); return; }
  console.log("Negocios en DB:");
  for (const n of negocios) {
    console.log(`  ${n.id}  →  ${n.nombre} (${n.categoria})`);
  }

  // Check if Olma exists
  const olma = negocios.find(n => /olma/i.test(n.nombre));
  if (olma) {
    console.log("\n✅ Olma Wings encontrado:", olma.id, olma.nombre);

    // Check products
    const { count } = await supabase.from("productos").select("*", { count: "exact", head: true }).eq("negocio_id", olma.id);
    console.log(`Productos existentes: ${count}`);
  } else {
    console.log("\n❌ Olma Wings no encontrado en DB");
  }
}
main();
