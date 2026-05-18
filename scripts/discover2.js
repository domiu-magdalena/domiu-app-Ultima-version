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
  // Get profile ID
  const { data: profiles } = await sb.from('profiles').select('id').limit(1);
  const pid = profiles?.[0]?.id;
  if (!pid) { console.log('No profiles found'); return; }
  console.log('Profile ID:', pid);

  // Try pedidos with various field combos 
  const inserts = [
    { codigo: 'TEST1', user_id: pid },
    { codigo: 'TEST1', cliente: 'Test', user_id: pid },
    { codigo: 'TEST1', cliente: 'Test', direccion: 'Addr', user_id: pid },
    { codigo: 'TEST1', cliente: 'Test', direccion: 'Addr', precio: 1000, user_id: pid },
  ];

  for (const ins of inserts) {
    const { data, error } = await sb.from('pedidos').insert(ins).select();
    if (error) {
      console.log(`FAIL (${Object.keys(ins).join(',')}): ${error.message}`);
    } else if (data?.[0]) {
      console.log(`OK (${Object.keys(ins).join(',')}): columns = ${Object.keys(data[0]).join(', ')}`);
      await sb.from('pedidos').delete().eq('id', data[0].id);
      break;
    }
  }

  // Try turnos
  const { data: turnoData, error: turnoErr } = await sb.from('turnos').insert({ user_id: pid }).select();
  if (turnoErr) {
    console.log('Turnos fail:', turnoErr.message);
    // Try with just minimal
    const t2 = await sb.from('turnos').insert({}).select();
    if (t2.error) console.log('Turnos minimal fail:', t2.error.message);
    else if (t2.data?.[0]) {
      console.log('Turnos OK:', Object.keys(t2.data[0]).join(', '));
      await sb.from('turnos').delete().eq('id', t2.data[0].id);
    }
  } else if (turnoData?.[0]) {
    console.log('Turnos OK:', Object.keys(turnoData[0]).join(', '));
    await sb.from('turnos').delete().eq('id', turnoData[0].id);
  }
}
main().catch(console.error);
