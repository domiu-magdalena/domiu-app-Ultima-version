require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = 'bc239179-de7f-4945-ab44-e2e9442227a4';

  // 1. Delete any existing profile
  await fetch(url + '/rest/v1/profiles?id=eq.' + userId, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });

  // 2. Test each role
  const roles = ['courier', 'customer', 'merchant', 'admin'];
  for (const role of roles) {
    // Delete any existing profile
    await fetch(url + '/rest/v1/profiles?id=eq.' + userId, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });

    console.log('INSERT with role ' + role + '...');
    const res = await fetch(url + '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: userId,
        first_name: 'Alex',
        last_name: 'Rivera',
        email: 'alexriverapabon1@gmail.com',
        role: role,
        status: 'active'
      })
    });
    const text = await res.text();
    console.log('  Status: ' + res.status);
    if (res.ok) {
      console.log('  OK!');
    } else {
      console.log('  Error: ' + JSON.parse(text).message);
    }
  }
}
main();
