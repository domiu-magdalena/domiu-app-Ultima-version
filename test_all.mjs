// Try EVERY possible hostname format for Supabase connection
import dns from 'dns';
import pkg from 'pg';
const { Client } = pkg;

const ref = 'auyzmvyfscvfzrhhjejq';
const pw = '11930421042026';

const hostnames = [
  // Direct DB (old format)
  `db.${ref}.supabase.co`,
  // Direct DB (new format)
  `${ref}.supabase.co`,
  // Pooler regional (format: {region}.pooler.supabase.com)
  'us-east-1.pooler.supabase.com',
  // Old pooler format
  `aws-0-us-east-1.pooler.supabase.com`,
  // Try supabase internal  
  `postgres.${ref}.supabase.co`,
];

async function resolveAll(hostname) {
  const result = { hostname, v4: null, v6: null };
  try { const a = await dns.promises.resolve4(hostname); result.v4 = a; } catch {}
  try { const a = await dns.promises.resolve6(hostname); result.v6 = a; } catch {}
  return result;
}

async function tryConnect(host, port, user, dbName, extra) {
  const client = new Client({
    host, port,
    database: dbName || 'postgres',
    user: user || 'postgres',
    password: pw,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  const label = `${user}@${host}:${port}/${dbName || 'postgres'}`;
  try {
    await client.connect();
    const r = await client.query('SELECT current_database() as db, version() as v');
    console.log(`✅ ${label} -> ${r.rows[0].db}`);
    await client.end();
    return true;
  } catch (e) {
    const msg = e.message;
    if (!msg.includes('Tenant') && !msg.includes('ENOTFOUND') && !msg.includes('ENETUNREACH') && !msg.includes('ECONNREFUSED') && !msg.includes('ETIMEOUT') && !msg.includes('timeout')) {
      console.log(`🔶 ${label} -> ${msg.slice(0, 150)}`);
    }
    try { await client.end(); } catch(ex) {}
    return false;
  }
}

async function main() {
  // Step 1: Resolve all hostnames
  console.log("=== Resolving hostnames ===");
  for (const h of hostnames) {
    const r = await resolveAll(h);
    const parts = [];
    if (r.v4) parts.push(`v4=${r.v4.join(',')}`);
    if (r.v6) parts.push(`v6=${r.v6.join(',')}`);
    console.log(`  ${h}: ${parts.join(', ') || 'NO RESOLUTION'}`);
  }

  // Step 2: Try connections
  console.log("\n=== Trying direct connections ===");
  for (const host of hostnames) {
    const r = await resolveAll(host);
    const ips = [...(r.v4 || []), ...(r.v6 || [])];
    for (const ip of ips.slice(0, 1)) {
      await tryConnect(ip, 5432, 'postgres');
      await tryConnect(ip, 5432, `postgres.${ref}`);
    }
  }

  // Step 3: Try pooler with more user formats
  console.log("\n=== Trying varied pooler configs ===");
  const poolerHost = 'aws-0-us-east-1.pooler.supabase.com';
  const users = [
    `postgres.${ref}`,
    `${ref}`,
    `postgres:${ref}`,
    `postgres`,
  ];
  const databases = ['postgres', ref, 'supabase'];
  for (const user of users) {
    for (const db of databases) {
      for (const port of [6543, 5432]) {
        const ok = await tryConnect(poolerHost, port, user, db);
        if (ok) {
          console.log(`\n🎯 FOUND WORKING CONFIG:`);
          console.log(`  host: ${poolerHost}`);
          console.log(`  port: ${port}`);
          console.log(`  user: ${user}`);
          console.log(`  database: ${db}`);
          console.log(`  password: ${pw}`);
          process.exit(0);
        }
      }
    }
  }

  console.log("\nNo working connection found.");
}

main().catch(console.error);
