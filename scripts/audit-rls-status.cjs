#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

// Load .env.local manually
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  let tables;

  // Method 1: Supabase CLI (most reliable)
  tables = await queryViaSupabaseCLI();

  // Method 2: Direct PostgreSQL connection using pg
  if (!tables) {
    tables = await queryViaPg();
  }

  if (tables) {
    printReport(tables);
    return;
  }

  // Fallback: migration analysis
  console.log('Could not reach live database. Running migration-based analysis...\n');
  const migrations = loadMigrations();
  analyzeMigrations(migrations);
}

async function queryViaSupabaseCLI() {
  try {
    const { execSync } = require('child_process');
    const result = execSync(
      'supabase db query "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\' ORDER BY tablename;" --json 2>NUL',
      { encoding: 'utf-8', timeout: 15000 }
    );
    const rows = JSON.parse(result.trim());
    if (rows && rows.length > 0) {
      return rows.map(r => ({
        table_name: r.tablename,
        rls_enabled: r.rowsecurity
      }));
    }
  } catch (e) {
    // CLI not available or not linked
  }
  return null;
}

async function queryViaPg() {
  if (!SERVICE_ROLE_KEY) return null;
  try {
    // Parse connection info from Supabase URL
    const urlObj = new URL(SUPABASE_URL);
    const host = urlObj.hostname;
    const projectRef = host.split('.')[0];
    const dbUrl = `postgresql://postgres:${encodeURIComponent(SERVICE_ROLE_KEY)}@${host}:5432/postgres`;

    const { Client } = require('pg');
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const res = await client.query(
      "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    await client.end();
    return res.rows.map(r => ({
      table_name: r.tablename,
      rls_enabled: r.rowsecurity
    }));
  } catch (e) {
    console.error('  PG connection error:', e.message);
  }
  return null;
}

// ---------- MIGRATION-BASED ANALYSIS ----------

function loadMigrations() {
  const dir = path.resolve(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  return files.map(f => ({
    file: f,
    content: fs.readFileSync(path.join(dir, f), 'utf-8')
  }));
}

function analyzeMigrations(migrations) {
  // Extract all CREATE TABLE statements
  const createdTables = [];
  const enabledRLS = new Set();
  const disabledRLS = new Set();

  for (const m of migrations) {
    const content = m.content;

    // Find CREATE TABLE
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      createdTables.push({ table: match[1], file: m.file });
    }

    // Find ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    const enableRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
    while ((match = enableRegex.exec(content)) !== null) {
      enabledRLS.add(match[1]);
    }

    // Find ALTER TABLE ... DISABLE ROW LEVEL SECURITY
    const disableRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?(\w+)\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
    while ((match = disableRegex.exec(content)) !== null) {
      disabledRLS.add(match[1]);
    }
  }

  // Build the report
  const allTables = [...new Set(createdTables.map(t => t.table))].sort();
  const tablesWithRLS = allTables.filter(t => enabledRLS.has(t) && !disabledRLS.has(t));
  const tablesWithoutRLS = allTables.filter(t => !enabledRLS.has(t) || disabledRLS.has(t));
  
  // Check for final state - the most recent migration wins
  // A table that appears in both enable and disable lists:
  // - If the LAST operation was ENABLE, it has RLS
  // - If the LAST operation was DISABLE, it doesn't
  for (const t of allTables) {
    let lastOp = null;
    for (const m of migrations) {
      const enableR = new RegExp(`ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:public\\.)?${t}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      const disableR = new RegExp(`ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:public\\.)?${t}\\s+DISABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      if (enableR.test(m.content)) lastOp = 'ENABLE';
      if (disableR.test(m.content)) lastOp = 'DISABLE';
    }
    if (lastOp === 'DISABLE') {
      // Remove from tablesWithRLS and add to tablesWithoutRLS
      const idx = tablesWithRLS.indexOf(t);
      if (idx >= 0) tablesWithRLS.splice(idx, 1);
      if (!tablesWithoutRLS.includes(t)) tablesWithoutRLS.push(t);
    } else if (lastOp === 'ENABLE') {
      const idx = tablesWithoutRLS.indexOf(t);
      if (idx >= 0) tablesWithoutRLS.splice(idx, 1);
      if (!tablesWithRLS.includes(t)) tablesWithRLS.push(t);
    }
  }

  printReport({
    allTables: allTables,
    rlsEnabled: tablesWithRLS,
    rlsDisabled: tablesWithoutRLS,
    source: 'migrations'
  });
}

function printReport(data) {
  const isMigration = data.source === 'migrations';
  const rlsEnabled = data.rlsEnabled || [];
  const rlsDisabled = data.rlsDisabled || [];
  const allTables = data.allTables || [];
  const totalTables = allTables.length || (rlsEnabled.length + rlsDisabled.length);

  console.log('='.repeat(68));
  console.log('  SUPABASE RLS AUDIT REPORT');
  if (isMigration) console.log('  (Based on local migration files - connect to live DB for actual state)');
  else console.log('  (Live database)');
  if (SUPABASE_URL) console.log(`  Project: ${SUPABASE_URL}`);
  console.log('='.repeat(68));

  console.log(`\n  TABLES WITH RLS ENABLED (${rlsEnabled.length}/${totalTables}):`);
  console.log('  ' + '-'.repeat(50));
  if (rlsEnabled.length === 0) {
    console.log('    (none)');
  } else {
    rlsEnabled.forEach(t => console.log(`    ✅ ${t}`));
  }

  console.log(`\n  TABLES WITH RLS DISABLED (${rlsDisabled.length}/${totalTables}):`);
  console.log('  ' + '-'.repeat(50));
  if (rlsDisabled.length === 0) {
    console.log('    ✅ All tables have RLS enabled!');
  } else {
    const sensitive = [
      'profiles', 'users', 'orders', 'wallets', 'wallet_transactions',
      'messages', 'chats', 'notifications', 'customer_payment_methods',
      'admin_history', 'admin_sessions', 'admin_audit_log', 'audit_log',
      'drivers', 'driver_locations', 'device_tokens'
    ];
    rlsDisabled.forEach(t => {
      const isSensitive = sensitive.includes(t);
      console.log(`    ${isSensitive ? '🔴 CRITICAL' : '  ⚠️'} ${t}${isSensitive ? ' - sensitive data' : ''}`);
    });
  }

  console.log();
  console.log('='.repeat(68));

  if (!isMigration && rlsDisabled.length > 0) {
    console.log('\n  CORRECTIVE ACTIONS NEEDED:');
    console.log('  ' + '-'.repeat(50));
    rlsDisabled.forEach(t => {
      console.log(`    - Enable RLS on "${t}" and add policies`);
    });
  }

  if (isMigration) {
    console.log('\n  NOTE: This analysis is based on local migration files.');
    console.log('  The actual database state may differ if migrations were');
    console.log('  applied out of order or manually modified.');
    console.log('\n  To query the live database:');
    console.log('    1. Start local Supabase: supabase start');
    console.log('    2. Link project: supabase link --project-ref <ref>');
    console.log('    3. Run: npm run audit:rls');
    console.log('    4. Or check via Supabase Dashboard → SQL Editor:');
    console.log('       SELECT schemaname, tablename, rowsecurity');
    console.log('       FROM pg_tables');
    console.log('       WHERE schemaname = \'public\'');
    console.log('       ORDER BY tablename;');
  }

  console.log();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
