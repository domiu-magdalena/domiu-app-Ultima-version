import pkg from 'pg';
const { Client } = pkg;

const projectRef = 'auyzmvyfscvfzrhhjejq';
const password = '11930421042026';

// Try project-specific pooler subdomain
const hosts = [
  `${projectRef}.pooler.supabase.com`,
  `db.${projectRef}.supabase.co`,
  // try direct with just the hostname
  `db.${projectRef}.supabase.co`,
];

// Also try IPv6 resolved address manually
// From nslookup: 2600:1f16:15be:6702:b8b9:ab2b:1fba:8ddd

async function tryConfig(host, port, user, dbName) {
  const client = new Client({
    host, port,
    database: dbName || 'postgres',
    user: user || 'postgres',
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    const res = await client.query('SELECT current_database() as db, current_user as user');
    console.log(`✅ ${user}@${host}:${port} -> ${JSON.stringify(res.rows[0])}`);
    await client.end();
    return true;
  } catch (e) {
    console.log(`❌ ${user}@${host}:${port}  ${e.message.slice(0, 120)}`);
    try { await client.end(); } catch(ex) {}
    return false;
  }
}

async function resolveHost(hostname) {
  try {
    const dns = await import('dns');
    const v6 = await dns.promises.resolve6(hostname);
    return { v6: v6[0] };
  } catch(e) {
    return { v6: null };
  }
}

async function main() {
  // 1. Try project-specific pooler hosts
  console.log("=== Project-specific pooler ===");
  for (const host of hosts) {
    await tryConfig(host, 6543, `postgres.${projectRef}`);
    await tryConfig(host, 5432, `postgres.${projectRef}`);
    await tryConfig(host, 6543, 'postgres');
    await tryConfig(host, 5432, 'postgres');
  }

  // 2. Try direct with IPv6 address
  console.log("\n=== Direct IPv6 ===");
  const info = await resolveHost(`db.${projectRef}.supabase.co`);
  if (info.v6) {
    console.log(`Direct IPv6: ${info.v6}`);
    await tryConfig(info.v6, 5432, 'postgres');
  } else {
    console.log("No IPv6 resolved");
  }

  // 3. Try default pooler with just the ref as database
  console.log("\n=== Pooler with project ref as database ===");
  await tryConfig('aws-0-us-east-1.pooler.supabase.com', 6543, `postgres.${projectRef}`, projectRef);

  console.log("\nDone.");
}

main().catch(console.error);
