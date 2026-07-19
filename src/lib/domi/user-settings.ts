import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DomiUserSettings {
  memoryEnabled: boolean;
  proactiveEnabled: boolean;
}

const DEFAULT_SETTINGS: DomiUserSettings = {
  memoryEnabled: true,
  proactiveEnabled: true,
};

export async function getDomiUserSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<DomiUserSettings> {
  const { data, error } = await supabase
    .from('domi_user_settings')
    .select('memory_enabled,proactive_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error('domi_settings_read_failed');
  if (!data) return DEFAULT_SETTINGS;

  return {
    memoryEnabled: data.memory_enabled !== false,
    proactiveEnabled: data.proactive_enabled !== false,
  };
}

export async function updateDomiUserSettings(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<DomiUserSettings>,
): Promise<DomiUserSettings> {
  const current = await getDomiUserSettings(supabase, userId);
  const next = {
    memoryEnabled: updates.memoryEnabled ?? current.memoryEnabled,
    proactiveEnabled: updates.proactiveEnabled ?? current.proactiveEnabled,
  };

  const { error } = await supabase.from('domi_user_settings').upsert(
    {
      user_id: userId,
      memory_enabled: next.memoryEnabled,
      proactive_enabled: next.proactiveEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) throw new Error('domi_settings_write_failed');
  return next;
}
