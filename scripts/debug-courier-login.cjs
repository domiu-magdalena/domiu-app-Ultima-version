/**
 * Diagnóstico de login para repartidor de prueba.
 *
 * USO: node scripts/debug-courier-login.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const EMAIL = 'repartidor.demo@domiu.com';
const PASSWORD = 'DomiURepartidor2026!';

function readEnv(fileName) {
  const envPath = path.resolve(__dirname, '..', fileName);
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, idx).trim()] = value;
  }
  return env;
}

function mask(val) {
  if (!val || typeof val !== 'string') return '';
  if (val.length <= 8) return '***';
  return val.slice(0, 6) + '...' + val.slice(-4);
}

function header(text) {
  console.log('');
  console.log('='.repeat(60));
  console.log(`  ${text}`);
  console.log('='.repeat(60));
}

async function main() {
  const localEnv = readEnv('.env.local');
  const url = localEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = localEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no encontradas');
    process.exit(1);
  }

  // FASE 1 — Login directo con anon key
  header('FASE 1 — Login directo');

  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let loginOk = false;
  let userId = null;

  try {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });

    if (error) {
      console.log('  [FAIL] Login FALLÓ:', error.message);
    } else {
      loginOk = true;
      userId = data.user.id;
      console.log('  [OK] Login EXITOSO');
      console.log('  User ID:', mask(userId));
      console.log('  Email:', data.user.email);
      console.log('  Email confirmed:', data.user.email_confirmed_at ? 'sí' : 'no');
    }
  } catch (err) {
    console.log('  [FAIL] Login lanzó excepción:', err.message);
  }

  if (!loginOk) {
    console.log('');
    console.log('No se puede continuar la verificación porque el login falló.');
    process.exit(1);
  }

  // FASE 2 — Verificar profile y driver con service role
  header('FASE 2 — Verificación de perfil y repartidor');

  if (!serviceKey) {
    console.log('  [SKIP] SUPABASE_SERVICE_ROLE_KEY no disponible — no se puede verificar DB');
    process.exit(0);
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Profile
  const { data: profile, error: profileErr } = await adminClient
    .from('profiles')
    .select('id, email, role, status, first_name, last_name, phone')
    .eq('id', userId)
    .single();

  if (profileErr) {
    console.log('  [FAIL] Error consultando profile:', profileErr.message);
  } else if (!profile) {
    console.log('  [FAIL] Profile NO existe');
  } else {
    console.log('  [OK] Profile existe');
    console.log('  Role:', profile.role);
    console.log('  Status:', profile.status);
    console.log('  Nombre:', profile.first_name, profile.last_name);
    console.log('  Teléfono:', profile.phone);

    if (profile.role === 'courier' && profile.status === 'active') {
      console.log('  [OK] Role y status correctos');
    } else {
      console.log('  [FAIL] Role o status incorrectos — se esperaba courier/active');
    }
  }

  // Driver
  const { data: driver, error: driverErr } = await adminClient
    .from('drivers')
    .select('id, vehicle_type, vehicle_plate, vehicle_model, status, is_verified, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (driverErr) {
    console.log('  [FAIL] Error consultando driver:', driverErr.message);
  } else if (!driver) {
    console.log('  [INFO] Driver record no existe (opcional para login)');
  } else {
    console.log('  [OK] Driver record existe');
    console.log('  Vehicle:', driver.vehicle_type, driver.vehicle_model);
    console.log('  Plate:', driver.vehicle_plate);
    console.log('  Verified:', driver.is_verified);
    console.log('  Active:', driver.is_active);
  }

  // FASE 3 — Resumen
  header('RESUMEN');
  console.log(`  Email:     ${EMAIL}`);
  console.log(`  Login:     ${loginOk ? 'OK' : 'FAIL'}`);
  console.log(`  Profile:   ${profile ? `${profile.role}/${profile.status}` : 'NO'}`);
  console.log(`  Driver:    ${driver ? 'sí' : 'no (opcional)'}`);
  console.log('');
  console.log('  Credenciales de prueba:');
  console.log('  URL:      http://localhost:3000/login');
  console.log('  Email:    repartidor.demo@domiu.com');
  console.log('  Password: DomiURepartidor2026!');
  console.log('');
}

main().catch((err) => {
  console.error('Error inesperado:', err.message);
  process.exit(1);
});
