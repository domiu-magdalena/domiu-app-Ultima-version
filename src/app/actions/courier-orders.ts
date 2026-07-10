'use server';

import { getServiceClient } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/server-auth';
import { serverAudit } from '@/lib/audit/server-audit';
import type { OrderStatus } from '@/types/database';

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: ['accepted'],
  assigned: ['accepted'],
  accepted: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
};

type OrderMetadata = Record<string, unknown>;

function canTransition(current: string, next: string): boolean {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next as OrderStatus);
}

function asRecord(value: unknown): OrderMetadata {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as OrderMetadata;
  return {};
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function getDriverId(userId: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('drivers')
    .select('id')
    .eq('id', userId)
    .single();
  return data?.id || null;
}

export async function acceptOrderByCourierAction(orderId: string) {
  const result = await requireAuth();
  if (result.error) return { success: false, error: result.error.message };

  const userId = result.session.user.id;
  const driverId = await getDriverId(userId);
  if (!driverId) return { success: false, error: 'Perfil de repartidor no encontrado' };

  if (result.session.profile.role !== 'courier') {
    return { success: false, error: 'Solo repartidores pueden aceptar pedidos' };
  }

  const supabase = getServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, courier_id, order_type, metadata, business_id, order_number')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado' };
  if (order.courier_id && order.courier_id !== userId) {
    return { success: false, error: 'El pedido ya tiene otro repartidor asignado' };
  }

  const isManual = order.order_type === 'manual_delivery';
  const currentMetadata = asRecord(order.metadata);
  const assignmentMode = getString(currentMetadata.assignment_mode) || 'public';
  const closestCourierId = getString(currentMetadata.closest_courier_id);
  const isAssignedToMe = order.courier_id === userId && order.status === 'assigned';
  const isPublicManual =
    isManual &&
    order.status === 'pending' &&
    !order.courier_id &&
    ['public', 'public_all', 'closest_first'].includes(assignmentMode);

  if (isManual && assignmentMode === 'closest_first' && closestCourierId && closestCourierId !== userId) {
    return { success: false, error: 'Este pedido fue enviado primero a otro repartidor.' };
  }

  if (isManual && !isAssignedToMe && !isPublicManual) {
    return { success: false, error: 'El pedido no está disponible para aceptación' };
  }

  const isNormalAssignedToMe = !isManual && isAssignedToMe;
  const isNormalAvailable = !isManual && !order.courier_id && ['confirmed', 'ready'].includes(order.status);

  if (!isManual && !isNormalAssignedToMe && !isNormalAvailable) {
    return { success: false, error: 'El pedido no está disponible para aceptación' };
  }

  const now = new Date().toISOString();
  const profile = result.session.profile;
  const courierName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Repartidor';

  const metadata = {
    ...currentMetadata,
    accepted_at: now,
    accepted_by: userId,
    accepted_by_name: courierName,
  };

  let updateQuery = supabase
    .from('orders')
    .update({
      courier_id: userId,
      status: 'accepted',
      updated_at: now,
      metadata,
    })
    .eq('id', orderId);

  if (isManual) {
    if (isAssignedToMe) {
      updateQuery = updateQuery.eq('status', 'assigned').eq('courier_id', userId);
    } else {
      updateQuery = updateQuery.eq('status', 'pending').is('courier_id', null);
    }
  } else if (isNormalAssignedToMe) {
    updateQuery = updateQuery.eq('status', 'assigned').eq('courier_id', userId);
  } else {
    updateQuery = updateQuery.in('status', ['confirmed', 'ready']).is('courier_id', null);
  }

  const { data: updatedOrder, error: assignError } = await updateQuery.select('id').maybeSingle();

  if (assignError || !updatedOrder) {
    return { success: false, error: 'El pedido ya no está disponible o ya fue tomado.' };
  }

  await supabase.from('order_tracking').insert({
    order_id: orderId,
    status: 'accepted',
    notes: `Aceptado por ${courierName}`,
  });

  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', order.business_id)
    .maybeSingle();

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('status', 'active');

  const recipientIds = new Set<string>();
  if (business?.owner_id) recipientIds.add(business.owner_id);
  for (const admin of admins || []) {
    if (admin.id) recipientIds.add(admin.id);
  }

  if (recipientIds.size > 0) {
    await supabase.from('notifications').insert(
      Array.from(recipientIds).map((recipientId) => ({
        recipient_id: recipientId,
        sender_id: userId,
        notification_type: 'order_update',
        title: 'Pedido tomado por repartidor',
        message: `${courierName} tomó el pedido #${order.order_number || order.id?.slice(0, 8)}`,
        order_id: orderId,
        channels: ['in_app'],
        metadata: { courier_id: userId, courier_name: courierName },
      })),
    );
  }

  await serverAudit.logAction(userId, result.session.user.email, 'courier', 'accept_order', 'orders', orderId);

  return { success: true };
}

export async function markOrderPickedUpAction(orderId: string) {
  const result = await requireAuth();
  if (result.error) return { success: false, error: result.error.message };
  if (result.session.profile.role !== 'courier') return { success: false, error: 'No autorizado' };

  const userId = result.session.user.id;
  const supabase = getServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, courier_id, metadata')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado' };
  if (order.courier_id !== userId) return { success: false, error: 'Este pedido no te pertenece' };
  if (!canTransition(order.status, 'picked_up')) {
    return { success: false, error: `No se puede marcar como recogido desde el estado ${order.status}` };
  }

  const now = new Date().toISOString();
  const metadata = {
    ...asRecord(order.metadata),
    picked_up_at: now,
  };

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'picked_up',
      updated_at: now,
      metadata,
    })
    .eq('id', orderId);

  if (error) return { success: false, error: 'Error al actualizar: ' + error.message };

  await supabase.from('order_tracking').insert({
    order_id: orderId,
    status: 'picked_up',
    notes: 'Pedido recogido por el repartidor',
  });

  await serverAudit.logAction(userId, result.session.user.email, 'courier', 'order_picked_up', 'orders', orderId);

  return { success: true };
}

export async function markOrderInTransitAction(orderId: string) {
  const result = await requireAuth();
  if (result.error) return { success: false, error: result.error.message };
  if (result.session.profile.role !== 'courier') return { success: false, error: 'No autorizado' };

  const userId = result.session.user.id;
  const supabase = getServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, courier_id, metadata')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado' };
  if (order.courier_id !== userId) return { success: false, error: 'Este pedido no te pertenece' };
  if (!canTransition(order.status, 'in_transit')) {
    return { success: false, error: `No se puede marcar en camino desde el estado ${order.status}` };
  }

  const now = new Date().toISOString();
  const metadata = {
    ...asRecord(order.metadata),
    in_transit_at: now,
  };

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'in_transit',
      updated_at: now,
      metadata,
    })
    .eq('id', orderId);

  if (error) return { success: false, error: 'Error al actualizar: ' + error.message };

  await supabase.from('order_tracking').insert({
    order_id: orderId,
    status: 'in_transit',
    notes: 'Repartidor en camino al cliente',
  });

  await serverAudit.logAction(userId, result.session.user.email, 'courier', 'order_in_transit', 'orders', orderId);

  return { success: true };
}

export async function markOrderDeliveredAction(orderId: string, proofPayload?: { photo_url?: string; signature_url?: string; notes?: string }) {
  const result = await requireAuth();
  if (result.error) return { success: false, error: result.error.message };
  if (result.session.profile.role !== 'courier') return { success: false, error: 'No autorizado' };

  const userId = result.session.user.id;
  const supabase = getServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, courier_id, metadata, order_type, courier_earnings, platform_earnings, business_id, total_amount')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado' };
  if (order.courier_id !== userId) return { success: false, error: 'Este pedido no te pertenece' };
  if (!canTransition(order.status, 'delivered')) {
    return { success: false, error: `No se puede marcar entregado desde el estado ${order.status}` };
  }

  const now = new Date().toISOString();
  const metadata = {
    ...asRecord(order.metadata),
    delivered_at: now,
    delivery_proof: proofPayload || null,
  };

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      actual_delivery_time: now,
      updated_at: now,
      metadata,
    })
    .eq('id', orderId);

  if (error) return { success: false, error: 'Error al actualizar: ' + error.message };

  await supabase.from('order_tracking').insert({
    order_id: orderId,
    status: 'delivered',
    notes: 'Pedido entregado al cliente',
  });

  if (order.order_type === 'manual_delivery' && Number(order.courier_earnings || 0) > 0) {
    const courierAmount = Number(order.courier_earnings || 0);

    const { data: driver } = await supabase
      .from('drivers')
      .select('total_deliveries, completed_deliveries')
      .eq('id', userId)
      .single();

    await supabase.from('drivers').update({
      total_deliveries: Number(driver?.total_deliveries || 0) + 1,
      completed_deliveries: Number(driver?.completed_deliveries || 0) + 1,
      status: 'available',
      is_available: true,
      updated_at: now,
    }).eq('id', userId);

    await supabase.from('driver_earnings').insert({
      driver_id: userId,
      order_id: orderId,
      base_amount: courierAmount,
      bonus_amount: 0,
      penalty_amount: 0,
      total_earned: courierAmount,
      status: 'completed',
      metadata: {
        order_type: order.order_type,
        platform_earnings: order.platform_earnings || 0,
        released_at: now,
        source: 'manual_delivery_completed',
      },
    });
  }

  await supabase.from('notifications').insert({
    recipient_id: order.courier_id || userId,
    sender_id: userId,
    notification_type: 'order_update',
    title: 'Pedido entregado',
    message: `Has entregado el pedido #${order.id?.slice(0, 8)}`,
    channels: ['in_app'],
  });

  await serverAudit.logAction(userId, result.session.user.email, 'courier', 'order_delivered', 'orders', orderId);

  return { success: true };
}

export async function reportOrderProblemAction(
  orderId: string,
  payload: { problem_type: string; description: string; severity?: string }
) {
  const result = await requireAuth();
  if (result.error) return { success: false, error: result.error.message };
  if (result.session.profile.role !== 'courier') return { success: false, error: 'No autorizado' };

  const userId = result.session.user.id;
  const supabase = getServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, courier_id, metadata, order_type, business_id')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado' };
  if (order.courier_id !== userId) return { success: false, error: 'Este pedido no te pertenece' };

  const now = new Date().toISOString();
  const currentMetadata = asRecord(order.metadata);
  const updatedMetadata = {
    ...currentMetadata,
    problem_reported: true,
    problem_type: payload.problem_type,
    problem_description: payload.description,
    problem_reported_at: now,
  };

  const { error: metaError } = await supabase
    .from('orders')
    .update({ metadata: updatedMetadata })
    .eq('id', orderId);

  if (metaError) return { success: false, error: 'Error al reportar problema: ' + metaError.message };

  await supabase.from('courier_incidents').insert({
    driver_id: userId,
    incident_type: 'order_issue',
    description: payload.description,
    severity: (payload.severity as 'minor' | 'moderate' | 'severe' | 'critical') || 'minor',
    order_id: orderId,
  });

  await supabase.from('order_tracking').insert({
    order_id: orderId,
    status: order.status,
    notes: `Problema reportado: ${payload.description}`,
  });

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('status', 'active');

  if (admins && admins.length > 0) {
    await supabase.from('notifications').insert(
      admins.map((admin) => ({
        recipient_id: admin.id,
        sender_id: userId,
        notification_type: 'incident',
        title: 'Problema en domicilio',
        message: payload.description,
        order_id: orderId,
        reference_id: orderId,
        reference_type: 'order_problem',
        channels: ['in_app'],
        metadata: {
          order_id: orderId,
          business_id: order.business_id,
          problem_type: payload.problem_type,
          severity: payload.severity || 'minor',
        },
      }))
    );
  }

  return { success: true };
}
