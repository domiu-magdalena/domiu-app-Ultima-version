/**
 * Crea o actualiza el negocio "Olma Wings and SmokeHouse" y su usuario propietario.
 *
 * USO:
 *   npm run create:olma-wings
 *
 * Idempotente: se puede ejecutar varias veces sin duplicar usuario ni negocio.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// ─── Datos del negocio ───────────────────────────────────────────────
const BUSINESS = {
  name: 'Olma Wings and SmokeHouse',
  slug: 'olma-wings-and-smokehouse',
  cuisineType: 'TRADICIONAL',
  phone: '3106437059',
  email: 'olmawings@gmail.com',
  address: 'Cl. 29h #21E-9, Comuna 1, Santa Marta, Magdalena',
  city: 'Santa Marta',
  latitude: 11.22603270355503,
  longitude: -74.1897235511212,
  isVerified: true,
};

// ─── Datos del propietario ───────────────────────────────────────────
const OWNER = {
  name: 'FERNANDO',
  email: 'olmawings@gmail.com',
  password: 'DomiULocal2026!',
  role: 'merchant',
  status: 'active',
};

// ─── Helpers ─────────────────────────────────────────────────────────
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
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function mask(val) {
  if (!val || typeof val !== 'string') return '';
  if (val.length <= 8) return '***';
  return val.slice(0, 4) + '...' + val.slice(-4);
}

function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

async function main() {
  console.log('=== Crear Negocio: Olma Wings and SmokeHouse =============');
  console.log('');

  // ── Cargar entorno ────────────────────────────────────────────────
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

  const ownerEmail = normalizeEmail(OWNER.email);
  const bizEmail = normalizeEmail(BUSINESS.email);

  // ── 1. Usuario Auth ────────────────────────────────────────────────
  console.log(`[${ownerEmail}] Buscando usuario Auth...`);
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(`ERROR al listar usuarios: ${listError.message}`);
    process.exit(1);
  }

  const existingUser = usersData.users.find((u) => u.email?.toLowerCase() === ownerEmail);
  let userId;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`  → Usuario ya existe. ID: ${mask(userId)}`);

    const { error: updatePwd } = await supabase.auth.admin.updateUserById(userId, {
      password: OWNER.password,
      email_confirm: true,
    });
    if (updatePwd) {
      console.error(`  → Error actualizando contraseña: ${updatePwd.message}`);
    } else {
      console.log('  → Contraseña actualizada. Email confirmado.');
    }
  } else {
    console.log('  → Usuario no encontrado. Creando...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: OWNER.password,
      email_confirm: true,
      user_metadata: { full_name: OWNER.name, source: 'admin_created' },
    });

    if (createError) {
      console.error(`ERROR creando usuario: ${createError.message}`);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log(`  → Usuario creado. ID: ${mask(userId)}`);
  }

  // ── 2. Profile ─────────────────────────────────────────────────────
  console.log('');
  console.log(`[${ownerEmail}] Buscando profile...`);

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', userId)
    .maybeSingle();

  const nameParts = OWNER.name.split(' ');
  const profileData = {
    id: userId,
    email: ownerEmail,
    role: OWNER.role,
    first_name: nameParts[0] || OWNER.name,
    last_name: nameParts.slice(1).join(' ') || '',
    status: OWNER.status,
  };

  if (existingProfile) {
    console.log(`  → Profile ya existe (rol: ${existingProfile.role}, status: ${existingProfile.status}). Actualizando...`);
    const { error: updateErr } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId);

    if (updateErr) {
      console.error(`  → Error actualizando profile: ${updateErr.message}`);
      process.exit(1);
    }
    console.log('  → Profile actualizado.');
  } else {
    console.log('  → Profile no encontrado. Insertando sin role (workaround trigger)...');
    const { data: insertedProfile, error: insertErr } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: ownerEmail,
        first_name: nameParts[0] || OWNER.name,
        last_name: nameParts.slice(1).join(' ') || '',
        status: OWNER.status,
      })
      .select('id, role')
      .single();

    if (insertErr) {
      console.error(`  → Error creando profile: ${insertErr.message}`);
      process.exit(1);
    }
    console.log(`  → Profile creado con role: ${insertedProfile.role}. Actualizando a '${OWNER.role}'...`);

    const { error: finalRoleErr } = await supabase
      .from('profiles')
      .update({ role: OWNER.role })
      .eq('id', userId);

    if (finalRoleErr) {
      console.error(`  → Error actualizando role: ${finalRoleErr.message}`);
      process.exit(1);
    }
    console.log(`  → Role actualizado a '${OWNER.role}'.`);
  }

  // ── 3. Business ─────────────────────────────────────────────────────
  console.log('');
  console.log(`[${BUSINESS.name}] Buscando negocio existente...`);

  // Buscar por varios criterios para evitar duplicados
  const { data: existingBiz } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .or(`slug.eq.${BUSINESS.slug},email.eq.${bizEmail},phone.eq.${BUSINESS.phone}`)
    .is('deleted_at', null)
    .maybeSingle();

  let businessId;

  if (existingBiz) {
    businessId = existingBiz.id;
    console.log(`  → Negocio ya existe. ID: ${mask(businessId)}. Actualizando...`);

    const { error: bizUpdateErr } = await supabase
      .from('businesses')
      .update({
        owner_id: userId,
        name: BUSINESS.name,
        cuisine_type: BUSINESS.cuisineType,
        phone: BUSINESS.phone,
        email: bizEmail,
        is_verified: BUSINESS.isVerified,
        is_active: true,
        latitude: BUSINESS.latitude,
        longitude: BUSINESS.longitude,
      })
      .eq('id', businessId);

    if (bizUpdateErr) {
      console.error(`  → Error actualizando negocio: ${bizUpdateErr.message}`);
      process.exit(1);
    }
    console.log('  → Negocio actualizado.');
  } else {
    console.log('  → Negocio no encontrado. Creando...');

    const slugBase = BUSINESS.slug;
    const { data: slugCheck } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slugBase)
      .maybeSingle();

    const finalSlug = slugCheck
      ? `${slugBase}-${Date.now().toString(36)}`
      : slugBase;

    const { data: newBiz, error: bizCreateErr } = await supabase
      .from('businesses')
      .insert({
        owner_id: userId,
        name: BUSINESS.name,
        slug: finalSlug,
        cuisine_type: BUSINESS.cuisineType,
        business_type: 'restaurant',
        phone: BUSINESS.phone,
        email: bizEmail,
        is_verified: BUSINESS.isVerified,
        is_active: true,
        latitude: BUSINESS.latitude,
        longitude: BUSINESS.longitude,
      })
      .select()
      .single();

    if (bizCreateErr) {
      console.error(`  → Error creando negocio: ${bizCreateErr.message}`);
      process.exit(1);
    }

    businessId = newBiz.id;
    console.log(`  → Negocio creado. ID: ${mask(businessId)}`);
  }

  // ── 4. Business Address ────────────────────────────────────────────
  console.log('');
  console.log(`[${BUSINESS.name}] Buscando dirección...`);

  const { data: existingAddr } = await supabase
    .from('business_addresses')
    .select('id')
    .eq('business_id', businessId)
    .eq('is_primary', true)
    .maybeSingle();

  const addrData = {
    business_id: businessId,
    street_address: BUSINESS.address,
    city: BUSINESS.city,
    country: 'Colombia',
    latitude: BUSINESS.latitude,
    longitude: BUSINESS.longitude,
    is_primary: true,
    delivery_available: true,
  };

  if (existingAddr) {
    console.log('  → Dirección ya existe. Actualizando...');
    const { error: addrUpdateErr } = await supabase
      .from('business_addresses')
      .update(addrData)
      .eq('id', existingAddr.id);

    if (addrUpdateErr) {
      console.error(`  → Error actualizando dirección: ${addrUpdateErr.message}`);
    } else {
      console.log('  → Dirección actualizada.');
    }
  } else {
    console.log('  → Dirección no encontrada. Creando...');
    const { error: addrCreateErr } = await supabase
      .from('business_addresses')
      .insert(addrData);

    if (addrCreateErr) {
      console.error(`  → Error creando dirección: ${addrCreateErr.message}`);
    } else {
      console.log('  → Dirección creada.');
    }
  }

  // ── 5. Verificación final ──────────────────────────────────────────
  console.log('');
  console.log('=== Verificación final ==================================');

  const { data: verifiedProfile } = await supabase
    .from('profiles')
    .select('id, email, role, status')
    .eq('id', userId)
    .single();

  const { data: verifiedBiz } = await supabase
    .from('businesses')
    .select('id, name, owner_id, is_verified, is_active, latitude, longitude')
    .eq('id', businessId)
    .single();

  const { data: verifiedAddr } = await supabase
    .from('business_addresses')
    .select('id, street_address, city, latitude, longitude, is_primary')
    .eq('business_id', businessId)
    .eq('is_primary', true)
    .single();

  console.log('');
  console.log('=== Resumen =============================================');
  console.log(`  Usuario Auth:`);
  console.log(`    Email:     ${ownerEmail}`);
  console.log(`    ID:        ${mask(userId)}`);
  console.log(`    Estado:    ${existingUser ? 'ya existía (contraseña actualizada)' : 'creado'}`);
  console.log(`  Profile:`);
  console.log(`    Rol:       ${verifiedProfile?.role || 'ERROR'}`);
  console.log(`    Status:    ${verifiedProfile?.status || 'ERROR'}`);
  console.log(`    Estado:    ${existingProfile ? 'actualizado' : 'creado'}`);
  console.log(`  Negocio:`);
  console.log(`    Nombre:    ${verifiedBiz?.name || 'ERROR'}`);
  console.log(`    ID:        ${mask(verifiedBiz?.id || '')}`);
  console.log(`    Owner ID:  ${mask(verifiedBiz?.owner_id || '')}`);
  console.log(`    Verificado: ${verifiedBiz?.is_verified}`);
  console.log(`    Activo:    ${verifiedBiz?.is_active}`);
  console.log(`    Latitud:   ${verifiedBiz?.latitude}`);
  console.log(`    Longitud:  ${verifiedBiz?.longitude}`);
  console.log(`    Estado:    ${existingBiz ? 'actualizado' : 'creado'}`);
  console.log(`  Dirección:`);
  console.log(`    Calle:     ${verifiedAddr?.street_address || 'ERROR'}`);
  console.log(`    Ciudad:    ${verifiedAddr?.city || 'ERROR'}`);
  console.log(`    Latitud:   ${verifiedAddr?.latitude}`);
  console.log(`    Longitud:  ${verifiedAddr?.longitude}`);
  console.log(`    Primaria:  ${verifiedAddr?.is_primary}`);
  console.log(`    Estado:    ${existingAddr ? 'actualizada' : 'creada'}`);
  console.log('=========================================================');
}

main().catch((err) => {
  console.error('Error inesperado:', err.message);
  process.exit(1);
});
