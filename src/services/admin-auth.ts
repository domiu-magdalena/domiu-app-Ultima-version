// src/services/admin-auth.ts
// Admin authentication, sessions, reauthentication, and history

'use client';

import { getBrowserClient } from '@/lib/db/supabase';
import { SupabaseAuthService } from '@/lib/auth/supabase';
import type { AdminSession, AdminHistory, SystemStatus } from '@/types/admin';

function getClientInfo() {
  if (typeof window === 'undefined') {
    return { ip: null, browser: null, device: null, os: null };
  }
  const ua = navigator.userAgent;
  const browser = ua.includes('Chrome') ? 'Chrome'
    : ua.includes('Firefox') ? 'Firefox'
    : ua.includes('Safari') ? 'Safari'
    : ua.includes('Edge') ? 'Edge'
    : 'Unknown';
  const os = ua.includes('Windows') ? 'Windows'
    : ua.includes('Mac') ? 'macOS'
    : ua.includes('Linux') ? 'Linux'
    : ua.includes('Android') ? 'Android'
    : ua.includes('iOS') ? 'iOS'
    : 'Unknown';
  const device = ua.includes('Mobile') ? 'Mobile'
    : ua.includes('Tablet') ? 'Tablet'
    : 'Desktop';
  return { ip: null, browser, device, os };
}

export const adminAuthService = {
  async registerSession(adminId: string): Promise<void> {
    try {
      const supabase = await getBrowserClient();
      const info = getClientInfo();
      await supabase.from('admin_sessions').insert({
        admin_id: adminId,
        ip_address: info.ip,
        browser: info.browser,
        device: info.device,
        os: info.os,
        is_current: true,
      });
    } catch {}
  },

  async markOtherSessionsInactive(adminId: string, currentSessionId: string): Promise<void> {
    try {
      const supabase = await getBrowserClient();
      await supabase
        .from('admin_sessions')
        .update({ is_current: false })
        .eq('admin_id', adminId)
        .neq('id', currentSessionId);
    } catch {}
  },

  async getSessions(adminId: string): Promise<AdminSession[]> {
    try {
      const supabase = await getBrowserClient();
      const { data } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('admin_id', adminId)
        .order('last_active_at', { ascending: false });
      return (data || []) as AdminSession[];
    } catch { return []; }
  },

  async terminateSession(sessionId: string): Promise<void> {
    try {
      const supabase = await getBrowserClient();
      await supabase.from('admin_sessions').delete().eq('id', sessionId);
    } catch {}
  },

  async reauthenticate(password: string): Promise<boolean> {
    const sessionRes = await SupabaseAuthService.getSession();
    const email = sessionRes.session?.user?.email;
    if (!email) return false;
    const { error } = await SupabaseAuthService.login({ email, password });
    return !error;
  },

  async addHistory(
    adminId: string,
    eventType: AdminHistory['event_type'],
    details: string | null,
  ): Promise<void> {
    try {
      const supabase = await getBrowserClient();
      const info = getClientInfo();
      await supabase.from('admin_history').insert({
        admin_id: adminId,
        event_type: eventType,
        ip_address: info.ip,
        browser: info.browser,
        device: info.device,
        os: info.os,
        details,
      });
    } catch {}
  },

  async getHistory(adminId: string, limit = 50): Promise<AdminHistory[]> {
    try {
      const supabase = await getBrowserClient();
      const { data } = await supabase
        .from('admin_history')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []) as AdminHistory[];
    } catch { return []; }
  },

  async getAllHistory(page = 1, pageSize = 50): Promise<{ entries: AdminHistory[]; total: number }> {
    try {
      const supabase = await getBrowserClient();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count } = await supabase
        .from('admin_history')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      return { entries: (data || []) as AdminHistory[], total: count || 0 };
    } catch { return { entries: [], total: 0 }; }
  },

  async getSystemStatus(): Promise<SystemStatus[]> {
    const supabase = await getBrowserClient();
    const statuses: SystemStatus[] = [];

    const checks: { name: string; run: () => Promise<SystemStatus['status']> }[] = [
      { name: 'Supabase Database', run: async () => { const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }); return error ? 'down' : 'healthy'; } },
      { name: 'Supabase Storage', run: async () => { const { error } = await supabase.storage.listBuckets(); return error ? 'down' : 'healthy'; } },
    ];

    for (const svc of checks) {
      try {
        const start = performance.now();
        const status = await svc.run();
        const latency = Math.round(performance.now() - start);
        statuses.push({ service: svc.name, status, latency, last_check: new Date().toISOString(), details: null });
      } catch {
        statuses.push({ service: svc.name, status: 'down', latency: null, last_check: new Date().toISOString(), details: 'Check failed' });
      }
    }

    const simulated: { name: string; details: string }[] = [
      { name: 'Supabase Realtime', details: null! },
      { name: 'Google Maps API', details: 'Simulated — no API key configured' },
      { name: 'Email (Resend)', details: 'Simulated' },
      { name: 'Push Notifications', details: 'Simulated' },
      { name: 'Cron Jobs', details: 'Simulated' },
      { name: 'Database Usage', details: 'Simulated — check Supabase dashboard' },
      { name: 'Storage Space', details: 'Simulated — check Supabase dashboard' },
    ];
    for (const s of simulated) {
      statuses.push({ service: s.name, status: 'healthy', latency: null, last_check: new Date().toISOString(), details: s.details });
    }

    return statuses;
  },
};
