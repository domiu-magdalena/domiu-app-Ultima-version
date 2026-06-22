require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Look at existing profiles to understand data
  console.log('=== Sample profiles ===');
  let res = await fetch(url + '/rest/v1/profiles?select=id,email,role,status&limit=10', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  let data = await res.json();
  console.log(JSON.stringify(data, null, 2));

  // 2. Try inserting with role 'admin' for our user
  console.log('\n=== Try INSERT with admin role ===');
  res = await fetch(url + '/rest/v1/profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: 'bc239179-de7f-4945-ab44-e2e9442227a4',
      first_name: 'Alex',
      last_name: 'Rivera',
      email: 'alexriverapabon1@gmail.com',
      role: 'admin',
      status: 'active'
    })
  });
  let text = await res.text();
  console.log('Status: ' + res.status);
  console.log('Response: ' + text.substring(0, 300));

  // 3. If admin works, try customer
  if (res.ok) {
    await fetch(url + '/rest/v1/profiles?id=eq.bc239179-de7f-4945-ab44-e2e9442227a4', {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
  }
}
main();
