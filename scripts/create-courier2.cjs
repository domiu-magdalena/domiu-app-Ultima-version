const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const userId = 'bc239179-de7f-4945-ab44-e2e9442227a4';
  const email = 'alexriverapabon1@gmail.com';

  // Try INSERT (not upsert) with role: courier
  console.log('Attempt 1: INSERT with role courier');
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
      role: 'courier',
      status: 'active'
    })
  });

  let text = await res.text();
  console.log('Status: ' + res.status);
  console.log('Response: ' + text.substring(0, 200));

  if (res.status === 409) {
    // Profile already exists, try PATCH
    console.log('\nProfile exists, trying PATCH...');
    res = await fetch(url + '/rest/v1/profiles?id=eq.' + userId, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        first_name: 'Alex',
        last_name: 'Rivera',
        email: email,
        role: 'courier',
        status: 'active'
      })
    });

    text = await res.text();
    console.log('Status: ' + res.status);
    console.log('Response: ' + text.substring(0, 200));
  }
}
main();
