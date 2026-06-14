import pkg from 'pg';
const { Client } = pkg;

const projectRef = 'auyzmvyfscvfzrhhjejq';
const password = '11930421042026';

const regions = [
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-us-west-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-0-eu-west-2.pooler.supabase.com',
  'aws-0-eu-west-3.pooler.supabase.com',
  'aws-0-sa-east-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-0-ap-southeast-2.pooler.supabase.com',
  'aws-0-ap-northeast-1.pooler.supabase.com',
  'aws-0-ap-northeast-2.pooler.supabase.com',
  'aws-0-ca-central-1.pooler.supabase.com',
];

const ports = [6543, 5432];
const users = [
  `postgres.${projectRef}`,
  `postgres:${projectRef}`,
  projectRef,
  'postgres',
];

async function tryConnect(host, port, user, database) {
  const client = new Client({
    host, port, database: database || 'postgres', user, password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch (e) {
    try { await client.end(); } catch(ex) {}
    if (!e.message.includes('Tenant or user not found')) {
      console.log(`  INTERESTING: ${user}@${host}:${port}/${database || 'postgres'} -> ${e.message.slice(0, 100)}`);
    }
    return false;
  }
}

async function main() {
  console.log("Probing different regions...");
  for (const host of regions) {
    for (const port of ports) {
      for (const user of users.slice(0, 2)) {
        const ok = await tryConnect(host, port, user, 'postgres');
        if (ok) {
          console.log(`\n✅ CONNECTED! ${user}@${host}:${port}/postgres`);
          console.log(`\nConnection config:\n  host: ${host}\n  port: ${port}\n  user: ${user}\n  password: ${password}\n  database: postgres`);
          process.exit(0);
        }
      }
    }
  }
  // Try direct IPv4
  console.log("\nTrying direct IPv4 resolve...");
  try {
    const dns = await import('dns');
    const addrs = await dns.promises.resolve4('db.auyzmvyfscvfzrhhjejq.supabase.co');
    console.log(`IPv4 addresses: ${addrs.join(', ')}`);
  } catch(e) {
    console.log(`No IPv4: ${e.message}`);
  }
  console.log("\nCould not connect to any endpoint.");
}

main().catch(console.error);
