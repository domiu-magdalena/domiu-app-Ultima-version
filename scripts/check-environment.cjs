const https = require('https');
const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const PASS = `${GREEN}✔${RESET}`;
const FAIL = `${RED}✘${RESET}`;
const WARN = `${YELLOW}⚠${RESET}`;

let allPassed = true;
let results = [];

function ok(label, detail = '') {
  results.push({ label, status: 'PASS', detail });
  console.log(`  ${PASS} ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail = '') {
  results.push({ label, status: 'FAIL', detail });
  allPassed = false;
  console.log(`  ${FAIL} ${label}${detail ? ` — ${detail}` : ''}`);
}

function warn(label, detail = '') {
  results.push({ label, status: 'WARN', detail });
  console.log(`  ${WARN} ${label}${detail ? ` — ${detail}` : ''}`);
}

function header(text) {
  console.log(`\n${CYAN}${BOLD}═══ ${text} ═══${RESET}\n`);
}

function tryReadEnv(key) {
  try {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'));
    if (!match) return null;
    let val = match[1].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val;
  } catch { return null; }
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log(`${BOLD}${CYAN}════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}   DomiU App — Environment Checker     ${RESET}`);
  console.log(`${BOLD}${CYAN}════════════════════════════════════════${RESET}`);

  // ── 1. Environment Variables ──
  header('Environment Variables (.env.local)');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
  ];
  let allEnvOk = true;
  const envVals = {};
  for (const key of requiredVars) {
    const val = tryReadEnv(key);
    envVals[key] = val;
    if (!val || val === '') {
      fail(key, 'no definida o vacía en .env.local');
      allEnvOk = false;
    } else if (val.startsWith('http')) {
      ok(key, val);
    } else {
      ok(key, `${val.slice(0, 20)}...`);
    }
  }

  // Check optional keys
  const mapsKey = tryReadEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
  if (!mapsKey) warn('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'no definida (opcional para maps)');
  else ok('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'definida');

  // ── 2. Supabase Connection ──
  header('Supabase Connection');
  const supabaseUrl = envVals['NEXT_PUBLIC_SUPABASE_URL'];
  if (supabaseUrl) {
    try {
      const res = await httpGet(`${supabaseUrl}/rest/v1/`);
      if (res.status === 200 || res.status === 400 || res.status === 401) {
        ok('API Reachable', `${supabaseUrl} — responded ${res.status}`);
      } else {
        warn('API Reachable', `${supabaseUrl} — status ${res.status} (unexpected)`);
      }
    } catch (e) {
      fail('API Reachable', `${supabaseUrl} — ${e.message}`);
    }
  }

  // ── 3. Storage ──
  header('Storage');
  const anonKey = envVals['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (supabaseUrl && anonKey) {
    try {
      const res = await httpGet(`${supabaseUrl}/storage/v1/bucket`);
      if (res.status === 200) {
        const buckets = JSON.parse(res.data);
        if (buckets.length > 0) {
          ok('Buckets accesibles', `${buckets.length} bucket(s) encontrados`);
        } else {
          warn('Buckets accesibles', '0 buckets encontrados (crear en Dashboard)');
        }
      } else if (res.status === 401) {
        warn('Buckets', 'requiere autenticación (esperado para service-role)');
      } else {
        warn('Buckets', `status ${res.status}`);
      }
    } catch (e) {
      warn('Storage', `no se pudo verificar — ${e.message}`);
    }
  }

  // ── 4. Auth ──
  header('Authentication');
  if (supabaseUrl) {
    try {
      const res = await httpGet(`${supabaseUrl}/auth/v1/settings`);
      if (res.status === 200) {
        ok('Auth settings', 'accesible');
      } else {
        ok('Auth endpoint reachable', `${supabaseUrl}/auth/v1/`);
      }
    } catch (e) {
      warn('Auth', `no se pudo verificar — ${e.message}`);
    }
  }

  // ── 5. Realtime ──
  header('Realtime');
  if (supabaseUrl) {
    try {
      const res = await httpGet(`${supabaseUrl}/realtime/v1/`);
      if (res.status === 200) {
        ok('Realtime endpoint', 'accessible');
      } else if (res.status === 404) {
        ok('Realtime endpoint', 'responded 404 (esquema esperado)');
      } else {
        warn('Realtime', `status ${res.status}`);
      }
    } catch (e) {
      warn('Realtime', `no se pudo verificar — ${e.message}`);
    }
  }

  // ── 6. Public URL ──
  header('Public URL');
  const appUrl = envVals['NEXT_PUBLIC_APP_URL'];
  if (appUrl) {
    if (appUrl === 'http://localhost:3000') {
      ok('NEXT_PUBLIC_APP_URL', 'localhost (desarrollo)');
    } else if (appUrl.startsWith('https://')) {
      ok('NEXT_PUBLIC_APP_URL', appUrl);
    } else {
      warn('NEXT_PUBLIC_APP_URL', `formato inesperado: ${appUrl}`);
    }
  }

  // ── 7. Supabase CLI ──
  header('Supabase CLI');
  const supabaseDir = path.resolve(__dirname, '..', 'supabase');
  const configExists = fs.existsSync(path.join(supabaseDir, 'config.toml'));
  if (configExists) ok('config.toml', 'presente');
  else fail('config.toml', 'no encontrado');

  const migrationsDir = path.join(supabaseDir, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    ok('Migrations', `${files.length} archivos SQL`);
  } else {
    fail('Migrations', 'directorio no encontrado');
  }

  // ── Summary ──
  header('Summary');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  console.log(`  ${GREEN}✔${RESET} ${passCount} passed`);
  if (warnCount > 0) console.log(`  ${YELLOW}⚠${RESET} ${warnCount} warnings`);
  if (failCount > 0) console.log(`  ${RED}✘${RESET} ${failCount} failed`);

  if (allPassed && warnCount === 0) {
    console.log(`\n  ${GREEN}${BOLD}Everything looks good!${RESET}`);
  } else if (allPassed) {
    console.log(`\n  ${YELLOW}All critical checks passed, but review warnings above.${RESET}`);
  } else {
    console.log(`\n  ${RED}Fix the failures above before proceeding.${RESET}`);
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error(`${FAIL} Script error:`, e);
  process.exit(1);
});
