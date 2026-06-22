const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const testId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const roles = ['courier', 'merchant', 'customer', 'admin'];
  for (const role of roles) {
    const body = {
      id: testId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test-' + role + '@test.com',
      role: role,
      status: 'active'
    };

    const res = await fetch(url + '/rest/v1/profiles?on_conflict=id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(body)
    });

    console.log('Role "' + role + '": Status ' + res.status);
    const text = await res.text();
    if (res.status >= 400) {
      const parsed = JSON.parse(text);
      console.log('  Error: ' + parsed.message);
    } else {
      console.log('  OK: ' + text.substring(0, 100));
    }
  }
}
main();
