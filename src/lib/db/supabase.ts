import { createClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */

let browserClient: any = null;
let serviceClient: any = null;

function buildMockClient() {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') return undefined;
      return () => buildMockClient();
    },
  });
}

export function getBrowserClient() {
  if (browserClient) return browserClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (typeof window !== 'undefined') {
      console.warn('Supabase no configurado. Las funciones de base de datos no estarán disponibles.');
    }
    return buildMockClient();
  }
  browserClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return browserClient;
}

export function getServiceClient() {
  if (serviceClient) return serviceClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    if (typeof window !== 'undefined') {
      console.warn('Supabase service key no configurada.');
    }
    return buildMockClient();
  }
  serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder') && !key.includes('placeholder');
}
