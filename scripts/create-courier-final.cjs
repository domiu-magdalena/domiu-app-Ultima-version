require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = 'bc239179-de7f-4945-ab44-e2e9442227a4';
  const email = 'alexriverapabon1@gmail.com';

  // Clean up
  await fetch(url + '/rest/v1/profiles?id=eq.' + userId, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });

  // Step 1: Insert WITHOUT role (let trigger set whatever it wants)
  console.log('Step 1: Insert without role...');
  let res = await fetch(url + '/rest/v1/profiles', {
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
      email: email,
      status: 'active'
    })
  });
  let text = await res.text();
  console.log('  Status: ' + res.status);
  if (!res.ok) {
    console.log('  Error: ' + text.substring(0, 200));
    return;
  }
  let profile = JSON.parse(text)[0];
  console.log('  Role after insert: ' + profile.role);

  // Step 2: Update role to 'courier'
  console.log('Step 2: Update role to courier...');
  res = await fetch(url + '/rest/v1/profiles?id=eq.' + userId, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      role: 'courier'
    })
  });
  text = await res.text();
  console.log('  Status: ' + res.status);
  if (!res.ok) {
    console.log('  Error: ' + text.substring(0, 200));
    return;
  }
  profile = JSON.parse(text)[0];
  console.log('  Role after update: ' + profile.role);

  if (profile.role === 'courier') {
    console.log('\nSUCCESS! Courier profile created.');
    console.log('Email: ' + email);
    console.log('Password: AlexRivera2026');
  }
}
main();
