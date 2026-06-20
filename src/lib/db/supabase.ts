import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

let browserClient: ReturnType<typeof createClient> | null = null;
let serviceClient: ReturnType<typeof createClient> | null = null;

function buildMockClient() {
  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      return () => buildMockClient();
    },
  });
}

export function getBrowserClient() {
  if (browserClient) return browserClient;
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return buildMockClient();
  }
  browserClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  }) as any;
  return browserClient as any;
}

export function getServiceClient() {
  if (serviceClient) return serviceClient;
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return buildMockClient();
  }
  serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
  return serviceClient as any;
}

export { isSupabaseConfigured } from '@/lib/env';
