require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = 'bc239179-de7f-4945-ab44-e2e9442227a4';

  // Check if driver record already exists
  let res = await fetch(url + '/rest/v1/drivers?id=eq.' + userId, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  let existing = await res.json();
  if (existing.length > 0) {
    console.log('Driver record already exists:');
    console.log(JSON.stringify(existing[0], null, 2));
    return;
  }

  // Create driver record
  console.log('Creating driver record...');
  res = await fetch(url + '/rest/v1/drivers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: userId,
      license_number: 'TEMP-' + userId.substring(0, 8),
      vehicle_type: 'bike',
      status: 'offline',
      is_active: true,
      is_verified: false,
      total_deliveries: 0,
      completed_deliveries: 0
    })
  });

  let text = await res.text();
  if (!res.ok) {
    console.log('Error: ' + text.substring(0, 300));
    return;
  }
  console.log('Driver record created successfully!');
  console.log(JSON.stringify(JSON.parse(text)[0], null, 2));
}
main();
