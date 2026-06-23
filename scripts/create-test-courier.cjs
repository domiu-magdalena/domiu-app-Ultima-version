/**
 * Crea/actualiza el repartidor de prueba (repartidor.demo@domiu.com).
 *
 * USO:
 *   npm run create:test-courier
 *
 * PRECAUCION:
 *   - Lee SUPABASE_SERVICE_ROLE_KEY desde .env.local
 *   - Nunca imprime claves, tokens ni passwords completas
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const COURIER_EMAIL = 'repartidor.demo@domiu.com';
const COURIER_PASSWORD = 'DomiURepartidor2026!';
const COURIER_FIRST_NAME = 'Repartidor Demo';
const COURIER_LAST_NAME = 'DomiU';
const COURIER_PHONE = '3000000000';
const COURIER_LICENSE = 'LIC-DEMO-001';

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
  return val.slice(0, 4) + '...' + val.slice(-4);
}

async function main() {
  console.log('=== Crear Repartidor de Prueba ==========');
  console.log('');

  const localEnv = readEnv('.env.local');
  const url = localEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = localEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL no encontrada en .env.local');
    process.exit(1);
  }
  if (!serviceKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no encontrada en .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Buscar usuario existente en Auth
  console.log(`[${COURIER_EMAIL}] Buscando usuario...`);
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(`ERROR al listar usuarios: ${listError.message}`);
    process.exit(1);
  }

  const existing = usersData.users.find((u) => u.email === COURIER_EMAIL);
  let userId;

  if (existing) {
    userId = existing.id;
    console.log(`  → Usuario ya existe. ID: ${mask(userId)}`);

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: COURIER_PASSWORD,
    });
    if (updateError) {
      console.error(`  → Error actualizando contraseña: ${updateError.message}`);
    } else {
      console.log('  → Contraseña actualizada.');
    }

    if (!existing.email_confirmed_at) {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmError) {
        console.error(`  → Error confirmando email: ${confirmError.message}`);
      } else {
        console.log('  → Email confirmado.');
      }
    }
  } else {
    console.log('  → Usuario no encontrado. Creando...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: COURIER_EMAIL,
      password: COURIER_PASSWORD,
      email_confirm: true,
      user_metadata: { firstName: COURIER_FIRST_NAME, lastName: COURIER_LAST_NAME },
    });

    if (createError) {
      console.error(`ERROR creando usuario: ${createError.message}`);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log(`  → Usuario creado. ID: ${mask(userId)}`);
  }

  // 2. Crear o actualizar perfil
  console.log('');
  console.log(`[${COURIER_EMAIL}] Buscando perfil...`);

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', userId)
    .maybeSingle();

  const profileData = {
    id: userId,
    email: COURIER_EMAIL,
    role: 'customer',
    first_name: COURIER_FIRST_NAME,
    last_name: COURIER_LAST_NAME,
    phone: COURIER_PHONE,
    status: 'active',
  };

  if (existingProfile) {
    console.log('  → Perfil ya existe. Rol actual:', existingProfile.role, '| Status:', existingProfile.status);
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId);

    if (updateProfileError) {
      console.error(`  → Error actualizando perfil: ${updateProfileError.message}`);
      process.exit(1);
    }
    console.log('  → Perfil actualizado correctamente.');
  } else {
    console.log('  → Perfil no encontrado. Insertando...');
    const { error: insertProfileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (insertProfileError) {
      console.error(`  → Error insertando perfil: ${insertProfileError.message}`);
      process.exit(1);
    }
    console.log('  → Perfil creado correctamente.');
  }

  // Ahora actualizar el role a 'courier' por separado
  console.log('  → Actualizando role a courier...');
  const { error: roleUpdateError } = await supabase
    .from('profiles')
    .update({ role: 'courier' })
    .eq('id', userId)
    .select('role')
    .single();

  if (roleUpdateError) {
    console.log(`  → Role 'courier' no disponible: ${roleUpdateError.message}`);
    console.log('  → El perfil queda con role=customer. El login como repartidor no funcionará.');
  } else {
    console.log('  → Role actualizado a courier correctamente.');
  }

  // 3. Crear o actualizar registro en drivers (opcional, no crítico para login)
  console.log('');
  console.log(`[${COURIER_EMAIL}] Buscando registro de repartidor (drivers)...`);

  const { data: existingDriver } = await supabase
    .from('drivers')
    .select('id, status')
    .eq('id', userId)
    .maybeSingle();

  const driverData = {
    id: userId,
    license_number: COURIER_LICENSE,
    vehicle_type: 'motorcycle',
    vehicle_plate: 'DOM-123',
    vehicle_model: 'Yamaha XTZ 150',
    status: 'offline',
    is_verified: true,
    is_active: true,
  };

  let driverCreated = false;
  if (existingDriver) {
    console.log('  → Registro de repartidor ya existe. Status:', existingDriver.status);
    const { error: updateDriverError } = await supabase
      .from('drivers')
      .update(driverData)
      .eq('id', userId);

    if (updateDriverError) {
      console.log(`  → AVISO: No se pudo actualizar driver: ${updateDriverError.message} (opcional)`);
    } else {
      driverCreated = true;
      console.log('  → Registro de repartidor actualizado correctamente.');
    }
  } else {
    console.log('  → Registro de repartidor no encontrado. Creando...');
    const { error: createDriverError } = await supabase
      .from('drivers')
      .insert(driverData);

    if (createDriverError) {
      console.log(`  → AVISO: No se pudo crear driver: ${createDriverError.message} (opcional)`);
    } else {
      driverCreated = true;
      console.log('  → Registro de repartidor creado correctamente.');
    }
  }

  // 4. Verificar
  console.log('');
  console.log('Verificando perfil...');
  const { data: verified, error: verifyError } = await supabase
    .from('profiles')
    .select('id, email, role, status')
    .eq('id', userId)
    .single();

  if (verifyError || !verified) {
    console.error(`ERROR en verificación: ${verifyError?.message || 'Perfil no encontrado'}`);
    process.exit(1);
  }

  const expectedRole = verified.role === 'courier' ? 'courier' : (verified.role === 'customer' ? 'customer (courier no disponible en ENUM)' : verified.role);
  if (verified.status === 'active') {
    console.log(`  → Perfil verificado correctamente. Role: ${expectedRole}`);
  } else {
    console.error('  → Perfil con datos incorrectos:', JSON.stringify(verified));
    process.exit(1);
  }

  console.log('');
  // Re-check current role
  const { data: finalProfile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', userId)
    .single();

  console.log('');
  console.log('=== Resumen =============================');
  console.log(`  Email:   ${COURIER_EMAIL}`);
  if (existing) {
    console.log('  Usuario: ya existía (contraseña actualizada)');
  } else {
    console.log('  Usuario: creado');
  }
  if (existingProfile) {
    console.log('  Perfil:  actualizado');
  } else {
    console.log('  Perfil:  creado');
  }
  if (existingDriver) {
    console.log('  Driver:  actualizado');
  } else {
    console.log('  Driver:  creado');
  }
  console.log(`  Rol:     ${finalProfile?.role || 'desconocido'}`);
  console.log('  Estado:  active');
  console.log('========================================');
}

main().catch((err) => {
  console.error('Error inesperado:', err.message);
  process.exit(1);
});
