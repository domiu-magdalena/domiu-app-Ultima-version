'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getServiceClient } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/server-auth';
import { ADMIN_ROLES } from '@/types/auth';
import { serverAudit } from '@/lib/audit/server-audit';

async function requireAdmin() {
  const result = await requireAuth();

  if (result.error || !result.session) {
    return { error: result.error?.message || 'No autenticado', session: null };
  }

  if (!ADMIN_ROLES.includes(result.session.profile.role)) {
    return { error: 'No autorizado', session: null };
  }

  return { error: null, session: result.session };
}

async function safeAudit(session: any, action: string, entity: string, entityId: string, metadata?: any) {
  try {
    await serverAudit.logAction(
      session.user.id,
      session.user.email,
      session.profile.role,
      action,
      entity,
      entityId,
      metadata,
    );
  } catch (error) {
    console.error('[admin-couriers] audit error:', error);
  }
}

async function notifyUser(userId: string, adminId: string, title: string, message: string, actionUrl = '/repartidor') {
  const supabase = getServiceClient();

  const { error } = await supabase.from('notifications').insert({
    recipient_id: userId,
    sender_id: adminId,
    notification_type: 'system_alert',
    title,
    message,
    action_url: actionUrl,
    is_read: false,
    channels: ['in_app'],
  });

  if (error) {
    console.error('[admin-couriers] notification error:', error);
  }
}

export async function getAdminCouriersAction(search = '', includeDeleted = false) {
  const auth = await requireAdmin();
  if (auth.error || !auth.session) return { error: auth.error, data: [] };

  const supabase = getServiceClient();

  let query = supabase
    .from('drivers')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data: drivers, error: driversError } = await query;

  if (driversError) {
    console.error('[getAdminCouriersAction] drivers error:', driversError);
    return { error: driversError.message, data: [] };
  }

  const driverList = drivers || [];
  const ids = driverList.map((d: any) => d.id);

  let profiles: any[] = [];
  if (ids.length > 0) {
    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('id,email,first_name,last_name,phone,avatar_url,role,created_at,updated_at')
      .in('id', ids);

    if (profilesError) {
      console.error('[getAdminCouriersAction] profiles error:', profilesError);
    }

    profiles = profileRows || [];
  }

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  let data = driverList.map((driver: any) => {
    const profile = profileMap.get(driver.id) || null;

    return {
      id: driver.id,
      user_id: driver.id,
      profile,
      driver,
      name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Repartidor',
      email: profile?.email || '',
      phone: profile?.phone || '',
      status: driver.status || 'offline',
      is_verified: !!driver.is_verified,
      is_active: driver.is_active !== false,
      is_available: !!driver.is_available,
      deleted_at: driver.deleted_at || null,
      vehicle_type: driver.vehicle_type || '',
      vehicle_plate: driver.vehicle_plate || '',
      vehicle_model: driver.vehicle_model || '',
      license_number: driver.license_number || '',
      total_deliveries: driver.total_deliveries || 0,
      completed_deliveries: driver.completed_deliveries || 0,
      rating: driver.avg_rating || driver.rating || 0,
      created_at: driver.created_at,
      updated_at: driver.updated_at,
    };
  });

  const q = search.trim().toLowerCase();
  if (q) {
    data = data.filter((row: any) => {
      const text = [
        row.name,
        row.email,
        row.phone,
        row.vehicle_type,
        row.vehicle_plate,
        row.vehicle_model,
        row.license_number,
        row.status,
      ].join(' ').toLowerCase();

      return text.includes(q);
    });
  }

  return { success: true, data };
}

export async function verifyCourierAdminAction(userId: string) {
  const auth = await requireAdmin();
  if (auth.error || !auth.session) return { error: auth.error };

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from('drivers')
    .select('metadata')
    .eq('id', userId)
    .maybeSingle();

  const { error } = await supabase
    .from('drivers')
    .update({
      is_verified: true,
      is_active: true,
      is_available: true,
      status: 'available',
      metadata: {
        ...((current as any)?.metadata || {}),
        verified_at: now,
        verified_by: auth.session.user.id,
      },
      updated_at: now,
    })
    .eq('id', userId);

  if (error) return { error: 'Error al verificar repartidor: ' + error.message };

  await notifyUser(
    userId,
    auth.session.user.id,
    'Cuenta verificada',
    'Tu perfil de repartidor fue verificado por DomiU. Ya puedes operar como repartidor.',
    '/repartidor',
  );

  await safeAudit(auth.session, 'verify_courier', 'drivers', userId);
  return { success: true };
}

export async function setCourierAdminStatusAction(userId: string, status: string) {
  const auth = await requireAdmin();
  if (auth.error || !auth.session) return { error: auth.error };

  const valid = ['available', 'busy', 'offline', 'on_break', 'suspended'];
  if (!valid.includes(status)) return { error: 'Estado inválido' };

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('drivers')
    .update({
      status,
      is_active: status !== 'offline' && status !== 'suspended',
      is_available: status === 'available',
      updated_at: now,
    })
    .eq('id', userId);

  if (error) return { error: 'Error al cambiar estado: ' + error.message };

  await notifyUser(
    userId,
    auth.session.user.id,
    'Estado actualizado',
    'Tu estado de repartidor fue actualizado a: ' + status,
    '/repartidor',
  );

  await safeAudit(auth.session, 'set_courier_admin_status', 'drivers', userId, { status });
  return { success: true };
}

export async function updateCourierAdminAction(userId: string, input: any) {
  const auth = await requireAdmin();
  if (auth.error || !auth.session) return { error: auth.error };

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const profileUpdates: any = {};
  const driverUpdates: any = {};

  if (input.first_name !== undefined) profileUpdates.first_name = String(input.first_name || '').trim();
  if (input.last_name !== undefined) profileUpdates.last_name = String(input.last_name || '').trim();
  if (input.phone !== undefined) profileUpdates.phone = String(input.phone || '').trim() || null;

  if (input.license_number !== undefined) driverUpdates.license_number = String(input.license_number || '').trim() || null;
  if (input.vehicle_type !== undefined) driverUpdates.vehicle_type = String(input.vehicle_type || '').trim() || null;
  if (input.vehicle_plate !== undefined) driverUpdates.vehicle_plate = String(input.vehicle_plate || '').trim() || null;
  if (input.vehicle_model !== undefined) driverUpdates.vehicle_model = String(input.vehicle_model || '').trim() || null;
  if (input.status !== undefined) driverUpdates.status = input.status;
  if (input.is_verified !== undefined) driverUpdates.is_verified = !!input.is_verified;
  if (input.is_active !== undefined) driverUpdates.is_active = !!input.is_active;
  if (input.is_available !== undefined) driverUpdates.is_available = !!input.is_available;

  if (Object.keys(profileUpdates).length > 0) {
    profileUpdates.updated_at = now;

    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (error) return { error: 'Error al editar perfil: ' + error.message };
  }

  if (Object.keys(driverUpdates).length > 0) {
    driverUpdates.updated_at = now;

    const { error } = await supabase
      .from('drivers')
      .update(driverUpdates)
      .eq('id', userId);

    if (error) return { error: 'Error al editar repartidor: ' + error.message };
  }

  await safeAudit(auth.session, 'update_courier_admin', 'drivers', userId, { profileUpdates, driverUpdates });
  return { success: true };
}

export async function softDeleteCourierAdminAction(userId: string, reason: string) {
  const auth = await requireAdmin();
  if (auth.error || !auth.session) return { error: auth.error };

  if (!reason.trim()) return { error: 'Debes indicar un motivo para eliminar/desactivar el repartidor' };

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from('drivers')
    .select('metadata')
    .eq('id', userId)
    .maybeSingle();

  const { error: driverError } = await supabase
    .from('drivers')
    .update({
      deleted_at: now,
      is_active: false,
      is_available: false,
      status: 'offline',
      metadata: {
        ...((current as any)?.metadata || {}),
        deleted_by: auth.session.user.id,
        deleted_at: now,
        delete_reason: reason.trim(),
      },
      updated_at: now,
    })
    .eq('id', userId);

  if (driverError) return { error: 'Error al eliminar repartidor: ' + driverError.message };

  await supabase
    .from('profiles')
    .update({
      role: 'customer',
      updated_at: now,
      metadata: {
        removed_as_courier_at: now,
        removed_as_courier_reason: reason.trim(),
      },
    })
    .eq('id', userId);

  await notifyUser(
    userId,
    auth.session.user.id,
    'Perfil de repartidor desactivado',
    'Tu perfil de repartidor fue desactivado por DomiU. Motivo: ' + reason.trim(),
    '/cliente',
  );

  await safeAudit(auth.session, 'soft_delete_courier', 'drivers', userId, { reason });
  return { success: true };
}

export async function sendCourierAdminNotificationAction(userId: string, title: string, message: string) {
  const auth = await requireAdmin();
  if (auth.error || !auth.session) return { error: auth.error };

  if (!title.trim() || !message.trim()) return { error: 'Título y mensaje son obligatorios' };

  await notifyUser(userId, auth.session.user.id, title.trim(), message.trim(), '/repartidor');
  await safeAudit(auth.session, 'send_courier_notification', 'drivers', userId, { title, message });

  return { success: true };
}

export async function getCourierAdminHistoryAction(userId: string) {
  const auth = await requireAdmin();
  if (auth.error || !auth.session) return { error: auth.error, orders: [], earnings: [], incidents: [] };

  const supabase = getServiceClient();

  const [ordersRes, earningsRes, incidentsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id,order_number,status,total_amount,created_at,updated_at')
      .eq('courier_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('driver_earnings')
      .select('*')
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('courier_incidents')
      .select('*')
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    success: true,
    orders: ordersRes.data || [],
    earnings: earningsRes.data || [],
    incidents: incidentsRes.data || [],
  };
}
