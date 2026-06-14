import pkg from 'pg';
const { Client } = pkg;

const projectRef = 'auyzmvyfscvfzrhhjejq';
const password = '11930421042026';
const db = 'postgres';

const configs = [
  // Pooler variants
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: `postgres.${projectRef}` },
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432, user: `postgres.${projectRef}` },
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: `postgres.${projectRef}`, db: 'postgres' },
  // Session mode
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432, user: `postgres.${projectRef}` },
  // Different user format
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: projectRef },
  // No db prefix
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: 'postgres', db: projectRef },
];

async function tryConnect(cfg) {
  console.log(`\nTrying: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.db || 'postgres'}`);
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    database: cfg.db || 'postgres',
    user: cfg.user,
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    console.log('  ✅ CONECTADO!');
    const res = await client.query('SELECT 1 AS ok');
    console.log(`  Query: ${JSON.stringify(res.rows[0])}`);
    await client.end();
    return true;
  } catch (e) {
    console.log(`  ❌ ${e.message.slice(0, 120)}`);
    try { await client.end(); } catch(ex) {}
    return false;
  }
}

let connected = false;
for (const cfg of configs) {
  if (await tryConnect(cfg)) {
    connected = true;
    break;
  }
}
if (!connected) {
  console.log('\nNo se pudo conectar con ninguna configuracion.');
}
