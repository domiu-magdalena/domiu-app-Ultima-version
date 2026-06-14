// Ejecuta SQL via la API REST de Supabase usando funciones RPC temporales
// Enfoque: crear una función que ejecute SQL, ejecutarla, luego eliminarla

const SUPABASE_URL = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTY0OCwiZXhwIjoyMDkzMDkxNjQ4fQ.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function apiPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, data: json, text };
}

async function main() {
  // Step 1: Create the exec_sql function
  console.log("1. Creando funcion exec_sql...");
  const { ok, data, status } = await apiPost("/rest/v1/rpc/", {
    query: `CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$ BEGIN EXECUTE sql; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`
  });
  console.log(`   Status: ${status}, Response: ${typeof data === 'string' ? data.slice(0,200) : JSON.stringify(data).slice(0,200)}`);

  if (status === 404) {
    // Try creating the function via a different approach
    console.log("2. Intentando enfoque alternativo - funcion pgquery...");
    const r2 = await apiPost("/rest/v1/rpc/", {
      query: ""
    });
    // Maybe use graphql?
    console.log("3. Probando enfoque con /pg/...");
    const r3 = await apiPost("/pg/", { query: "SELECT 1" });
    console.log(`   Status: ${r3.status}, Response: ${r3.text?.slice(0,200)}`);
  }
}

main().catch(console.error);
