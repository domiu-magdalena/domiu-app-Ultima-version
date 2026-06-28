'use server';

import { getServiceClient } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/server-auth';
import { ADMIN_ROLES } from '@/types/auth';

interface TicketRow {
  id: string;
  user_id: string;
  role: string;
  order_id: string | null;
  business_id: string | null;
  courier_id: string | null;
  ticket_type: string;
  priority: string;
  subject: string | null;
  description: string;
  status: string;
  attachments: unknown;
  admin_response: string | null;
  internal_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketWithUser extends TicketRow {
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string;
  user_phone: string | null;
  user_avatar_url: string | null;
}

export interface SupportTicketSummary {
  id: string;
  subject: string | null;
  status: string;
  priority: string;
  role: string;
  ticket_type: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string;
  created_at: string;
}

export interface SupportTicketDetail {
  id: string;
  user_id: string;
  role: string;
  ticket_type: string;
  priority: string;
  subject: string | null;
  description: string;
  status: string;
  admin_response: string | null;
  internal_notes: string | null;
  order_id: string | null;
  business_id: string | null;
  courier_id: string | null;
  attachments: unknown;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string;
  user_phone: string | null;
  user_avatar_url: string | null;
}

function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number]);
}

export async function getSupportTickets(
  search?: string,
  statusFilter?: string,
  roleFilter?: string,
): Promise<SupportTicketSummary[]> {
  try {
    const auth = await requireAuth();
    if (auth.error) return [];
    if (!isAdmin(auth.session.profile.role)) return [];

    const supabase = getServiceClient();

    let query = supabase
      .from('support_tickets')
      .select(`
        id,
        subject,
        status,
        priority,
        role,
        ticket_type,
        user_id,
        created_at,
        profiles:user_id (first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (search) {
      const term = `%${search}%`;
      query = query.or(`subject.ilike.${term},profiles.first_name.ilike.${term},profiles.last_name.ilike.${term}`);
    }

    if (statusFilter && statusFilter !== 'todos') {
      query = query.eq('status', statusFilter);
    }

    if (roleFilter && roleFilter !== 'todos') {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('[admin-support] getSupportTickets error:', error);
      return [];
    }

    return (data as unknown as {
      id: string;
      subject: string | null;
      status: string;
      priority: string;
      role: string;
      ticket_type: string;
      user_id: string;
      created_at: string;
      profiles: { first_name: string | null; last_name: string | null; email: string } | { first_name: string | null; last_name: string | null; email: string }[];
    }[]).map((t) => {
      const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
      return {
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        role: t.role,
        ticket_type: t.ticket_type,
        user_first_name: profile?.first_name ?? null,
        user_last_name: profile?.last_name ?? null,
        user_email: profile?.email ?? '',
        created_at: t.created_at,
      };
    });
  } catch (err) {
    console.error('[admin-support] getSupportTickets error:', err);
    return [];
  }
}

export async function getSupportTicketDetail(ticketId: string): Promise<SupportTicketDetail | null> {
  try {
    const auth = await requireAuth();
    if (auth.error) return null;
    if (!isAdmin(auth.session.profile.role)) return null;

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        profiles:user_id (first_name, last_name, email, phone, avatar_url)
      `)
      .eq('id', ticketId)
      .single();

    if (error || !data) {
      console.error('[admin-support] getSupportTicketDetail error:', error);
      return null;
    }

    const row = data as unknown as TicketRow & {
      profiles: { first_name: string | null; last_name: string | null; email: string; phone: string | null; avatar_url: string | null } | { first_name: string | null; last_name: string | null; email: string; phone: string | null; avatar_url: string | null }[];
    };
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    return {
      id: row.id,
      user_id: row.user_id,
      role: row.role,
      ticket_type: row.ticket_type,
      priority: row.priority,
      subject: row.subject,
      description: row.description,
      status: row.status,
      admin_response: row.admin_response,
      internal_notes: row.internal_notes,
      order_id: row.order_id,
      business_id: row.business_id,
      courier_id: row.courier_id,
      attachments: row.attachments,
      resolved_at: row.resolved_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_first_name: profile?.first_name ?? null,
      user_last_name: profile?.last_name ?? null,
      user_email: profile?.email ?? '',
      user_phone: profile?.phone ?? null,
      user_avatar_url: profile?.avatar_url ?? null,
    };
  } catch (err) {
    console.error('[admin-support] getSupportTicketDetail error:', err);
    return null;
  }
}

export async function respondToTicketAction(
  ticketId: string,
  response: string,
  status?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (auth.error) return { success: false, error: auth.error.message };
    if (!isAdmin(auth.session.profile.role)) {
      return { success: false, error: 'No autorizado' };
    }

    const supabase = getServiceClient();

    const updateData: Record<string, unknown> = {
      admin_response: response,
      updated_at: new Date().toISOString(),
    };

    if (status === 'resolved' || status === 'closed') {
      updateData.status = status;
      updateData.resolved_at = new Date().toISOString();
    } else if (status) {
      updateData.status = status;
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) {
      console.error('[admin-support] respondToTicketAction error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[admin-support] respondToTicketAction error:', err);
    return { success: false, error: msg };
  }
}

export async function updateTicketPriorityAction(
  ticketId: string,
  priority: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (auth.error) return { success: false, error: auth.error.message };
    if (!isAdmin(auth.session.profile.role)) {
      return { success: false, error: 'No autorizado' };
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from('support_tickets')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      console.error('[admin-support] updateTicketPriorityAction error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[admin-support] updateTicketPriorityAction error:', err);
    return { success: false, error: msg };
  }
}

export async function updateTicketStatusAction(
  ticketId: string,
  status: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (auth.error) return { success: false, error: auth.error.message };
    if (!isAdmin(auth.session.profile.role)) {
      return { success: false, error: 'No autorizado' };
    }

    const supabase = getServiceClient();

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updateData.internal_notes = notes;
    }

    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) {
      console.error('[admin-support] updateTicketStatusAction error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[admin-support] updateTicketStatusAction error:', err);
    return { success: false, error: msg };
  }
}
