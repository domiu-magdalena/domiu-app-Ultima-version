import { createClient } from "@supabase/supabase-js";

const url = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTY0OCwiZXhwIjoyMDkzMDkxNjQ4fQ.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";

const supabase = createClient(url, key);
// Wait - need auth option to disable auto-refresh for server-side
// Let me try without it

async function main() {
  // First, check if RPC works (list available functions)
  const { data: funcs, error: funcsErr } = await supabase.rpc("extensions.pg_available_extensions");
  console.log("rpc test:", funcsErr?.message || "OK");

  // Try calling a function that likely exists
  const { data: uuidResult, error: uuidErr } = await supabase.rpc("gen_random_uuid");
  console.log("gen_random_uuid:", uuidErr?.message || uuidResult);

  // List tables via the introspection API
  const { data: tables, error: tblErr } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");
  console.log("tables query:", tblErr?.message || tables?.map(t => t.table_name).join(", "));

  // Try to run SQL via RPC if there's a function that wraps queries
  const { data: version, error: verErr } = await supabase.rpc("version", {});
  console.log("version:", verErr?.message || version);

  // Check what columns mensajes_chat has via information_schema
  const { data: cols, error: colErr } = await supabase
    .from("information_schema.columns")
    .select("column_name, data_type")
    .eq("table_name", "mensajes_chat")
    .eq("table_schema", "public");
  console.log("\nCurrent mensajes_chat columns:");
  if (colErr) console.log("  Error:", colErr.message);
  else if (cols) cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
}
main().catch(e => console.error(e));
