import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/db/supabase';

async function getUserFromToken(req: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id };
}

export async function GET(req: NextRequest) {
  const auth = await getUserFromToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const serviceClient = getServiceClient();
  const { data: profile, error } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', auth.userId)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, _token, ...profileData } = body;

    console.log('[API Profile POST] body keys:', Object.keys(body));
    console.log('[API Profile POST] userId presente:', !!userId);
    console.log('[API Profile POST] token presente:', !!_token);

    // Estrategia: primero intentar con token Bearer (sesión activa),
    // si falla, usar userId directo verificado con service_role
    let authUserId: string | null = null;

    const auth = await getUserFromToken(req);
    if (auth) {
      authUserId = auth.userId;
      console.log('[API Profile POST] autenticado por token:', authUserId);
    } else if (userId) {
      // Verificar que userId corresponde a un usuario real en auth.users
      try {
        const serviceClient = getServiceClient();
        const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(userId);
        if (userError || !userData?.user) {
          console.error('[API Profile POST] userId no válido:', userError?.message || 'usuario no encontrado');
          return NextResponse.json({
            error: 'Usuario no válido',
            details: userError?.message || 'El usuario no existe en auth.users',
          }, { status: 400 });
        }
        authUserId = userId;
        console.log('[API Profile POST] autenticado por userId directo:', authUserId);
      } catch (verifyErr) {
        console.error('[API Profile POST] error verificando userId:', verifyErr);
        return NextResponse.json({
          error: 'Error verificando usuario',
          details: verifyErr instanceof Error ? verifyErr.message : String(verifyErr),
        }, { status: 500 });
      }
    }

    if (!authUserId) {
      console.error('[API Profile POST] no se pudo autenticar (sin token ni userId)');
      return NextResponse.json({ error: 'No autenticado', details: 'Se requiere token de sesión o userId' }, { status: 401 });
    }

    const serviceClient = getServiceClient();

    // Verificar si el perfil ya existe (por si el trigger de Supabase ya lo creó)
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle();

    if (existingProfile) {
      console.log('[API Profile POST] perfil ya existe, actualizando...');
      const { data, error } = await serviceClient
        .from('profiles')
        .update(profileData)
        .eq('id', authUserId)
        .select()
        .single();
      if (error) {
        console.error('[API Profile POST] error actualizando perfil:', error.message);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
      }
      return NextResponse.json({ profile: data });
    }

    // Insertar nuevo perfil
    console.log('[API Profile POST] insertando perfil:', { id: authUserId, ...profileData });
    const { data: profile, error } = await serviceClient
      .from('profiles')
      .insert({ id: authUserId, ...profileData })
      .select()
      .single();

    if (error) {
      console.error('[API Profile POST] error insertando perfil:', error.message);
      return NextResponse.json({
        error: error.message,
        details: error,
        hint: 'Verifica que la tabla profiles existe y tiene las columnas correctas',
      }, { status: 500 });
    }

    console.log('[API Profile POST] perfil creado exitosamente:', profile?.id);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[API Profile POST] excepción no capturada:', err);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getUserFromToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const updates = await req.json();
  const serviceClient = getServiceClient();
  const { data: profile, error } = await serviceClient
    .from('profiles')
    .update(updates)
    .eq('id', auth.userId)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile });
}
