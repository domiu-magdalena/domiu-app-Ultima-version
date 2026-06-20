/**
 * Script para crear usuarios de prueba en Supabase Auth.
 * 
 * USO:
 *   1. Copia .env.local.example como .env.local (si no existe)
 *   2. node scripts/create-auth-users.cjs
 * 
 * PRECAUCION:
 *   NUNCA hardcodees credenciales en este archivo.
 *   Las claves se leen de variables de entorno.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Leer variables desde .env.local si existe
const envPath = path.resolve(__dirname, '..', '.env.local');
let envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Variables de entorno no encontradas.');
  console.error('Asegúrate de que .env.local existe con:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    email: 'leivakevin620@gmail.com',
    password: '1193042104',
    role: 'customer',
    first_name: 'Kevin',
    last_name: 'Leiva',
  },
  {
    email: 'admin@domiu.com',
    password: 'AdminPass2025!',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'Principal',
  },
  {
    email: 'carlos@cevicheria.com',
    password: 'demo1234',
    role: 'merchant',
    first_name: 'Carlos',
    last_name: 'Mendoza',
  },
  {
    email: 'carlos.mendoza@courier.com',
    password: 'demo1234',
    role: 'courier',
    first_name: 'Carlos',
    last_name: 'Mendoza',
  },
];

async function createUsers() {
  console.log('----------------------------------------');
  console.log('Creando usuarios de prueba en Supabase...');
  console.log('----------------------------------------\n');

  for (const userData of USERS) {
    try {
      console.log(`[${userData.email}] Creando usuario...`);

      const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
      if (searchError) {
        console.error(`Error buscando usuarios: ${searchError.message}`);
        continue;
      }

      const exists = existingUsers.users.find(u => u.email === userData.email);
      if (exists) {
        console.log(`  → Ya existe (ID: ${exists.id}). Actualizando perfil...`);

        const { error: updateProfileError } = await supabase
          .from('profiles')
          .upsert({
            id: exists.id,
            email: userData.email,
            role: userData.role,
            first_name: userData.first_name,
            last_name: userData.last_name,
            status: 'active',
          }, { onConflict: 'id' });

        if (updateProfileError) {
          console.error(`  → Error actualizando perfil: ${updateProfileError.message}`);
        } else {
          console.log('  → Perfil actualizado correctamente.');
        }
        continue;
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          firstName: userData.first_name,
          lastName: userData.last_name,
        },
      });

      if (error) {
        console.error(`  → Error creando usuario: ${error.message}`);
        continue;
      }

      console.log(`  → Usuario creado (ID: ${data.user.id}). Creando perfil...`);

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: userData.email,
          role: userData.role,
          first_name: userData.first_name,
          last_name: userData.last_name,
          status: 'active',
        }, { onConflict: 'id' });

      if (profileError) {
        console.error(`  → Error creando perfil: ${profileError.message}`);
      } else {
        console.log('  → Perfil creado correctamente.');
      }
    } catch (err) {
      console.error(`[${userData.email}] Error inesperado:`, err);
    }
    console.log('');
  }

  console.log('----------------------------------------');
  console.log('Proceso completado.');
  console.log('----------------------------------------');
}

createUsers();
