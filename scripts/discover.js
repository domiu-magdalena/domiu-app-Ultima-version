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

async function discoverColumns(table, attempts) {
  for (const obj of attempts) {
    const res = await sb.from(table).insert(obj).select();
    if (res.data && res.data.length > 0) {
      console.log(`${table} ✓: ${Object.keys(res.data[0]).join(', ')}`);
      await sb.from(table).delete().eq('id', res.data[0].id);
      return res.data[0];
    }
    if (res.error) {
      console.log(`${table} ✗ (${Object.keys(obj).join(',')}): ${res.error.message}`);
    }
  }
  return null;
}

async function main() {
  const pid = (await sb.from('profiles').select('id').limit(1)).data?.[0]?.id;
  console.log('Profile ID:', pid);

  // Turnos - try different combos
  await discoverColumns('turnos', [
    {},
    { repartidor_id: pid },
    { nota: 'test' },
  ]);

  // Pedidos - try different combos
  await discoverColumns('pedidos', [
    { user_id: pid },
    { usuario_id: pid },
    { nombre: 'test' },
    { cliente: 'test' },
  ]);

  // Pedidos_cliente
  await discoverColumns('pedidos_cliente', [
    { negocio_id: pid },
  ]);

  // Detalle_pedido_cliente
  await discoverColumns('detalle_pedido_cliente', [
    { pedido_id: pid, producto_id: pid },
  ]);
}
main().catch(console.error);
