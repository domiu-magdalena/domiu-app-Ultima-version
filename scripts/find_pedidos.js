const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.trim().split('=');
  if (k && v.length) vars[k] = v.join('=');
});

const sb = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findPedidoColumns() {
  const pid = (await sb.from('profiles').select('id').limit(1)).data?.[0]?.id;
  
  // Try ALL possible column combos
  const guesses = [
    { name: 'Test1' }, 
    { title: 'Test2' },
    { description: 'Test3' }, 
    { descripcion: 'Test4' },
    { cliente_nombre: 'Test5' },
    { nombre_cliente: 'Test6' },
    { customer_name: 'Test7' },
    { total: 1000 },
    { amount: 1000 },
    { monto: 1000 },
    { precio: 1000 },
    { status: 'test' },
    { estado: 'test' },
    { code: 'T1' },
    { reference: 'T1' },
  ];
  
  for (const g of guesses) {
    const { data, error } = await sb.from('pedidos').insert(g).select();
    if (error) continue;
    if (data?.[0]) {
      console.log('FOUND pedidos columns:', Object.keys(data[0]).join(', '));
      await sb.from('pedidos').delete().eq('id', data[0].id);
      return;
    }
  }
  
  // Try even simpler: just one column at a time
  const singleCols = [
    { id: crypto.randomUUID() },
  ];
  for (const g of singleCols) {
    const { data, error } = await sb.from('pedidos').insert(g).select();
    if (error) console.log(`FAIL ${Object.keys(g)[0]}: ${error.message}`);
    else if (data?.[0]) {
      console.log('FOUND:', Object.keys(data[0]).join(', '));
      await sb.from('pedidos').delete().eq('id', data[0].id);
      return;
    }
  }
  
  console.log('Could not find pedidos schema');
}
findPedidoColumns().catch(console.error);
