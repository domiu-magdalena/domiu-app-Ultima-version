const supabaseUrl = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTY0OCwiZXhwIjoyMDkzMDkxNjQ4fQ.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";

const sql = `
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'General';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES locales(id) ON DELETE SET NULL;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS banner TEXT DEFAULT '';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 4.5;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS tiempo_estimado TEXT DEFAULT '30-45 min';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
`;

async function main() {
  const endpoints = [
    "/rest/v1/rpc/",
    "/rest/v1/",
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${supabaseUrl}${ep}`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await res.text();
      console.log(`${ep}: status=${res.status}`);
      console.log(`  response: ${text.slice(0, 300)}`);
    } catch (e) {
      console.log(`${ep}: ERROR ${e.message}`);
    }
  }
  // Try /sql
  try {
    const res = await fetch(`${supabaseUrl}/sql`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    console.log(`/sql: status=${res.status}`);
    console.log(`  response: ${text.slice(0, 300)}`);
  } catch (e) {
    console.log(` /sql: ERROR ${e.message}`);
  }
}

main().catch(console.error);
