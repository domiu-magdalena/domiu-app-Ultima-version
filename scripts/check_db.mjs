const SUPABASE_URL = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTU2NDgsImV4cCI6MjA5MzA5MTY0OH0.2ZnamDE3m76IFCt-C2oDcngXCPWsrNUPn1SAcLia3F8";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTY0OCwiZXhwIjoyMDkzMDkxNjQ4fQ.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";

async function test(key, label) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/negocios?select=id,nombre&limit=5`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const text = await res.text();
    console.log(`${label} (${res.status}):`, text.slice(0, 300));
  } catch (e) {
    console.log(`${label} error:`, e.message);
  }
}

async function main() {
  await test(ANON_KEY, "Anon key");
  await test(SERVICE_KEY, "Service key");
}
main();
