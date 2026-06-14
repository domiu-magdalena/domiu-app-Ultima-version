const SUPABASE_URL = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTY0OCwiZXhwIjoyMDkzMDkxNjQ4fQ.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function main() {
  // Get table columns via OpenAPI/Swagger introspection
  const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: "GET",
    headers: { ...H, Accept: "application/json" },
  });
  const text = await r.text();
  console.log("Root response:", text.slice(0, 200));

  // Try to insert and see error message for column info
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/mensajes_chat`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      pedido_cliente_id: "00000000-0000-0000-0000-000000000000",
      remitente_tipo: "cliente",
      remitente_nombre: "test",
      mensaje: "test",
    }),
  });
  console.log("Insert test:", r2.status);
  const errText = await r2.text();
  console.log("Error:", errText.slice(0, 300));

  // Try with pedido_id instead
  const r3 = await fetch(`${SUPABASE_URL}/rest/v1/mensajes_chat`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      pedido_id: "00000000-0000-0000-0000-000000000000",
      remitente_tipo: "cliente",
      remitente_nombre: "test",
      mensaje: "test",
    }),
  });
  console.log("Insert test (pedido_id):", r3.status);
  const errText2 = await r3.text();
  console.log("Error:", errText2.slice(0, 300));
}
main().catch(e => console.error(e));
