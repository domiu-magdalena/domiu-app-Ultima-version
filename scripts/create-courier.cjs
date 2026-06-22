const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const email = 'alexriverapabon1@gmail.com';
  const password = 'AlexRivera2026';

  const { data: users } = await supabase.auth.admin.listUsers();
  let userId = users?.users?.find(u => u.email === email)?.id;

  if (userId) {
    console.log('User already exists, ID: ' + userId);
    await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Alex Rivera' }
    });
    if (error) { console.log('Auth error: ' + error.message); return; }
    userId = data.user.id;
    console.log('User created, ID: ' + userId);
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existing) {
    console.log('Profile already exists, updating...');
  }

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      first_name: 'Alex',
      last_name: 'Rivera',
      email: email,
      role: 'courier',
      status: 'active'
    }, { onConflict: 'id' })
    .select()
    .single();

  if (pErr) {
    console.log('Profile error: ' + pErr.message);
    return;
  }
  console.log('Profile OK');
  console.log('  Role: ' + profile.role);
  console.log('  Status: ' + profile.status);
  console.log('');
  console.log('Login credentials:');
  console.log('  Email: ' + email);
  console.log('  Password: ' + password);
  console.log('  URL: https://domiu-app-ultima-version.vercel.app/login');
}
main();
