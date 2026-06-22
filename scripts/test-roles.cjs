const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Clean up any test record first
  await supabase.from('profiles').delete().eq('id', '00000000-0000-0000-0000-000000000000');

  const roles = ['courier', 'merchant', 'customer', 'admin', 'repartidor', 'negocio', 'delivery'];

  for (const role of roles) {
    const { error } = await supabase
      .from('profiles')
      .insert({ id: '00000000-0000-0000-0000-000000000000', email: 'test@test.com', role: role, status: 'active' });

    if (error) {
      console.log('ROLE "' + role + '": ERROR - ' + error.message.replace(/\n/g, ' '));
    } else {
      console.log('ROLE "' + role + '": OK');
      await supabase.from('profiles').delete().eq('id', '00000000-0000-0000-0000-000000000000');
      return;
    }
  }
}
main();
