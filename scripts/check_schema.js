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

async function main() {
  const tables = ['locales', 'turnos', 'pedidos', 'pedidos_cliente', 'detalle_pedido_cliente'];
  for (const table of tables) {
    const { data, error } = await sb.from(table).select('*').limit(1);
    if (error) {
      console.log(`${table}: ERROR - ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`${table} (${data.length} rows): ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`${table}: empty table, trying to insert a temp row...`);
      // Try minimal insert to discover columns
      const tryInsert = async (obj) => {
        const r = await sb.from(table).insert(obj).select();
        if (r.error) {
          console.log(`  ${table} insert error: ${r.error.message}`);
          return null;
        }
        if (r.data && r.data.length > 0) {
          console.log(`  ${table} columns: ${Object.keys(r.data[0]).join(', ')}`);
          await sb.from(table).delete().eq('id', r.data[0].id);
          return r.data[0];
        }
        return null;
      };

      if (table === 'locales') await tryInsert({ nombre: 'Temp' });
      else if (table === 'turnos') await tryInsert({});
      else if (table === 'pedidos') {
        const pid = (await sb.from('profiles').select('id').limit(1)).data?.[0]?.id;
        if (pid) await tryInsert({ codigo: 'T', user_id: pid });
      }
    }
  }
}
main().catch(console.error);
