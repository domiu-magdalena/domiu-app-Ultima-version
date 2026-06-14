const SUPABASE_URL = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTY0OCwiZXhwIjoyMDkzMDkxNjQ4fQ.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" };

const tests = [
  { pedido_id: "00000000-0000-0000-0000-000000000000", remitente_tipo: "cliente", mensaje: "test" },
  { pedido_id: "00000000-0000-0000-0000-000000000000", remitente_tipo: "cliente", remitente_nombre: "test", mensaje: "test" },
  { pedido_id: "00000000-0000-0000-0000-000000000000", remitente_tipo: "cliente", mensaje: "test", leido: false },
];

async function main() {
  for (const body of tests) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mensajes_chat`, {
      method: "POST", headers: H,
      body: JSON.stringify(body),
    });
    const err = await r.text();
    console.log(`Keys [${Object.keys(body).join(",")}] → ${r.status}: ${err.slice(0, 200)}`);
  }

  // Try to get a sample row to see columns
  const r = await fetch(`${SUPABASE_URL}/rest/v1/mensajes_chat?select=*&limit=1`, { headers: H });
  if (r.ok) {
    const row = await r.json();
    console.log("\nSample row columns:", Object.keys(row[0] || {}).join(", "));
  }
}
main().catch(e => console.error(e));
