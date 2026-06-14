const SUPABASE_URL = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTY0OCwiZXhwIjoyMDkzMDkxNjQ4fQ.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function main() {
  // Check mensajes_chat table - try to select 1 row
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/mensajes_chat?select=id&limit=1`, { headers: H });
  console.log("mensajes_chat exists?", r1.status, r1.status === 200 ? "✅" : "❌");

  // Check publication membership
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST", headers: H,
    body: JSON.stringify({}),
  });
  // Try to check via pg_publication_tables
  const r3 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: "GET", headers: H
  });
  console.log("API root:", r3.status);

  // Check columns of pedidos_cliente
  const r4 = await fetch(`${SUPABASE_URL}/rest/v1/pedidos_cliente?select=id,codigo,estado,cliente_nombre,negocio_id,repartidor_id,metodo_pago&limit=1`, { headers: H });
  console.log("pedidos_cliente columns check:", r4.status, r4.status === 200 ? "✅" : "❌");
  if (r4.ok) console.log("Sample:", JSON.stringify(await r4.json()).slice(0, 200));

  // Check if we can run raw SQL via the supabase API
  // Use the introspection endpoint
  const r5 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST", headers: H,
    body: JSON.stringify({ query_text: "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'" }),
  });
  console.log("RPC exec_sql:", r5.status, r5.status === 200 ? "✅" : "❌");
  
  // Try to add mensajes_chat to realtime using a direct SQL query via the management API
  // Actually, let's just check via the schema endpoint
  const r6 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_table_info`, {
    method: "POST", headers: H,
    body: JSON.stringify({ table_name: "mensajes_chat" }),
  });
  console.log("get_table_info:", r6.status);
}
main().catch(e => console.error(e));
