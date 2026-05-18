const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.trim().split('=');
  if (k && v.length) vars[k] = v.join('=');
});

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;

// Direct REST API call to bypass schema cache
async function restPost(path, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { data: JSON.parse(text), error: null, status: res.status }; }
  catch { return { data: null, error: text, status: res.status }; }
}

async function main() {
  const pid = '19b9974f-4c55-467d-a639-b06000a4798c';

  // Try insert into pedidos with various combos via REST
  const tests = [
    { codigo: 'T1', user_id: pid },
    { nombre_cliente: 'Test', user_id: pid },
    { cliente_nombre: 'Test', user_id: pid },
    { name: 'Test' },
    { title: 'Test' },
    { descripcion: 'Test' },
  ];

  for (const test of tests) {
    const r = await restPost('pedidos', test);
    if (r.status === 201 && r.data?.[0]) {
      console.log(`OK (${Object.keys(test).join(',')}): ${Object.keys(r.data[0]).join(', ')}`);
      // Delete it
      const id = r.data[0].id;
      await fetch(`${SUPABASE_URL}/rest/v1/pedidos?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
      });
      return;
    } else {
      console.log(`FAIL (${Object.keys(test).join(',')}): ${r.error || r.status}`);
    }
  }
}
main().catch(console.error);
