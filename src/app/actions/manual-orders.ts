'use server';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server-auth';
import { PermissionManager } from '@/lib/auth/permissions';
import { isAdminRole, isBusinessRole } from '@/types/auth';
import { getServiceClient } from '@/lib/db/supabase';
import { serverAudit } from '@/lib/audit/server-audit';
import { calculateDeliveryPrice } from '@/lib/orders/delivery-pricing';
import { calculateOrderEarnings } from '@/lib/orders/order-earnings';
import {
  calculateManualOrderTotals,
  getManualOrderErrorMessage,
  manualOrderPanelSchema,
  manualOrderRequestSchema,
  normalizeManualOrderPhone,
  type ManualOrderPanel,
  type ManualOrderRequest,
  type ResolvedManualOrderItem,
} from '@/lib/orders/manual-order-domain';

interface ManualOrderBusinessOption {
  id: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  allowCustomItems: boolean;
}

interface ManualOrderProductOption {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  price: number;
  availableQuantity: number;
  status: string;
  categoryName: string;
}

interface ManualOrderActionResult {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  idempotentReplay?: boolean;
}

type UnknownRow = Record<string, unknown>;

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function actorCanUsePanel(role: string, panel: ManualOrderPanel): boolean {
  if (panel === 'admin') return isAdminRole(role) && PermissionManager.hasPermission(role as never, 'manage_orders');
  return isBusinessRole(role) && PermissionManager.hasPermission(role as never, 'manage_orders');
}

async function requireManualOrderActor(panel: ManualOrderPanel) {
  const auth = await requireAuth();
  if (auth.error) throw new Error(auth.error.message);
  if (!actorCanUsePanel(auth.session.profile.role, panel)) throw new Error('No tienes permiso para crear pedidos manuales');
  return auth.session;
}

async function getAuthorizedBusiness(
  panel: ManualOrderPanel,
  actorId: string,
  businessId: string,
): Promise<UnknownRow> {
  const supabase = getServiceClient();
  let query = supabase
    .from('businesses')
    .select('id,name,owner_id,is_active,is_verified,metadata')
    .eq('id', businessId)
    .is('deleted_at', null);

  if (panel === 'business') query = query.eq('owner_id', actorId);

  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new Error('Negocio no encontrado o no autorizado');
  if (!data.is_active) throw new Error('El negocio está inactivo');
  return data as UnknownRow;
}

function buildFingerprint(input: ManualOrderRequest): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export async function getManualOrderContextAction(rawPanel: ManualOrderPanel): Promise<{
  success: boolean;
  businesses: ManualOrderBusinessOption[];
  error?: string;
}> {
  try {
    const panel = manualOrderPanelSchema.parse(rawPanel);
    const session = await requireManualOrderActor(panel);
    const supabase = getServiceClient();

    let query = supabase
      .from('businesses')
      .select('id,name,is_active,is_verified,metadata')
      .is('deleted_at', null)
      .order('name');

    if (panel === 'business') query = query.eq('owner_id', session.user.id);

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      businesses: (data || []).map((row) => {
        const metadata = asObject(row.metadata);
        return {
          id: String(row.id),
          name: String(row.name),
          isActive: Boolean(row.is_active),
          isVerified: Boolean(row.is_verified),
          allowCustomItems: metadata.allow_manual_custom_items === true,
        };
      }),
    };
  } catch (error) {
    return { success: false, businesses: [], error: getManualOrderErrorMessage(error) };
  }
}

export async function getManualOrderProductsAction(
  rawPanel: ManualOrderPanel,
  businessId: string,
): Promise<{ success: boolean; products: ManualOrderProductOption[]; error?: string }> {
  try {
    const panel = manualOrderPanelSchema.parse(rawPanel);
    const session = await requireManualOrderActor(panel);
    await getAuthorizedBusiness(panel, session.user.id, z.string().uuid().parse(businessId));

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('products')
      .select('id,business_id,sku,name,price,discount_price,quantity_available,status,categories(name)')
      .eq('business_id', businessId)
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;

    return {
      success: true,
      products: ((data || []) as unknown as UnknownRow[]).map((row) => {
        const category = asObject(row.categories);
        return {
          id: String(row.id),
          businessId: String(row.business_id),
          sku: String(row.sku || ''),
          name: String(row.name),
          price: asNumber(row.discount_price ?? row.price),
          availableQuantity: asNumber(row.quantity_available),
          status: String(row.status),
          categoryName: String(category.name || 'Sin categoría'),
        };
      }),
    };
  } catch (error) {
    return { success: false, products: [], error: getManualOrderErrorMessage(error) };
  }
}

export async function searchManualOrderCustomersAction(
  rawPanel: ManualOrderPanel,
  businessId: string,
  rawQuery: string,
): Promise<{ success: boolean; customers: Array<{ id: string; name: string; phone: string; email: string }>; error?: string }> {
  try {
    const panel = manualOrderPanelSchema.parse(rawPanel);
    const session = await requireManualOrderActor(panel);
    await getAuthorizedBusiness(panel, session.user.id, z.string().uuid().parse(businessId));

    const query = rawQuery.trim().slice(0, 80);
    if (query.length < 3) return { success: true, customers: [] };
    const phone = normalizeManualOrderPhone(query).replace(/\D/g, '');
    const safeText = query.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim();

    const filters = [
      safeText ? `first_name.ilike.%${safeText}%` : '',
      safeText ? `last_name.ilike.%${safeText}%` : '',
      safeText.includes('@') ? `email.ilike.%${safeText}%` : '',
      phone.length >= 7 ? `phone.ilike.%${phone}%` : '',
    ].filter(Boolean);
    if (filters.length === 0) return { success: true, customers: [] };

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,phone,email,status')
      .or(filters.join(','))
      .limit(12);
    if (error) throw error;

    return {
      success: true,
      customers: (data || [])
        .filter((row) => row.status === 'active')
        .map((row) => ({
          id: String(row.id),
          name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || String(row.email),
          phone: String(row.phone || ''),
          email: String(row.email || ''),
        })),
    };
  } catch (error) {
    return { success: false, customers: [], error: getManualOrderErrorMessage(error) };
  }
}

const draftSchema = z.object({
  panel: manualOrderPanelSchema,
  businessId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()),
});

export async function saveManualOrderDraftAction(raw: z.infer<typeof draftSchema>) {
  try {
    const input = draftSchema.parse(raw);
    const session = await requireManualOrderActor(input.panel);
    await getAuthorizedBusiness(input.panel, session.user.id, input.businessId);
    const supabase = getServiceClient();
    const { error } = await supabase.from('manual_order_drafts').upsert(
      {
        actor_id: session.user.id,
        actor_role: session.profile.role,
        business_id: input.businessId,
        panel: input.panel,
        payload: input.payload,
        version: 1,
        expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'actor_id,business_id,panel' },
    );
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: getManualOrderErrorMessage(error) };
  }
}

export async function loadManualOrderDraftAction(rawPanel: ManualOrderPanel, businessId: string) {
  try {
    const panel = manualOrderPanelSchema.parse(rawPanel);
    const session = await requireManualOrderActor(panel);
    await getAuthorizedBusiness(panel, session.user.id, z.string().uuid().parse(businessId));
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('manual_order_drafts')
      .select('payload,updated_at,expires_at')
      .eq('actor_id', session.user.id)
      .eq('business_id', businessId)
      .eq('panel', panel)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return { success: true, draft: data || null };
  } catch (error) {
    return { success: false, draft: null, error: getManualOrderErrorMessage(error) };
  }
}

export async function deleteManualOrderDraftAction(rawPanel: ManualOrderPanel, businessId: string) {
  try {
    const panel = manualOrderPanelSchema.parse(rawPanel);
    const session = await requireManualOrderActor(panel);
    await getAuthorizedBusiness(panel, session.user.id, z.string().uuid().parse(businessId));
    const supabase = getServiceClient();
    const { error } = await supabase
      .from('manual_order_drafts')
      .delete()
      .eq('actor_id', session.user.id)
      .eq('business_id', businessId)
      .eq('panel', panel);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: getManualOrderErrorMessage(error) };
  }
}

export async function createManualOrderAction(rawInput: ManualOrderRequest): Promise<ManualOrderActionResult> {
  let actor: Awaited<ReturnType<typeof requireManualOrderActor>> | null = null;
  try {
    const input = manualOrderRequestSchema.parse(rawInput);
    actor = await requireManualOrderActor(input.panel);
    const business = await getAuthorizedBusiness(input.panel, actor.user.id, input.businessId);
    const businessMetadata = asObject(business.metadata);
    const supabase = getServiceClient();

    if (input.panel === 'admin' && !input.adminReason?.trim()) {
      throw new Error('El motivo administrativo de creación es obligatorio');
    }

    let customerId: string | null = null;
    let customerSnapshot: Record<string, unknown>;
    if (input.customer.kind === 'registered') {
      const { data: customer, error } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,phone,email,status')
        .eq('id', input.customer.customerId!)
        .maybeSingle();
      if (error || !customer) throw new Error('Cliente registrado no encontrado');
      if (customer.status !== 'active') throw new Error('El cliente registrado está suspendido o inactivo');
      customerId = String(customer.id);
      customerSnapshot = {
        kind: 'registered',
        name: [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.email,
        phone: customer.phone,
        email: customer.email,
      };
    } else {
      customerSnapshot = {
        kind: 'guest',
        name: input.customer.name,
        phone: normalizeManualOrderPhone(input.customer.phone),
        email: input.customer.email || null,
        notes: input.customer.notes || null,
      };
    }

    const catalogItems = input.items.filter((item) => !item.isCustomItem);
    const productIds = [...new Set(catalogItems.map((item) => item.productId!))];
    const { data: productRows, error: productsError } = productIds.length
      ? await supabase
          .from('products')
          .select('id,business_id,name,sku,price,discount_price,status,quantity_available,metadata')
          .in('id', productIds)
          .is('deleted_at', null)
      : { data: [], error: null };
    if (productsError) throw productsError;

    const productMap = new Map((productRows || []).map((row) => [String(row.id), row as UnknownRow]));
    const customItemsAllowed = input.panel === 'admin' || businessMetadata.allow_manual_custom_items === true;
    const resolvedItems: ResolvedManualOrderItem[] = input.items.map((item) => {
      if (item.isCustomItem) {
        if (!customItemsAllowed) throw new Error('Los artículos personalizados no están habilitados para este negocio');
        return {
          name: item.customName!,
          quantity: item.quantity,
          unitPrice: item.customUnitPrice!,
          isCustomItem: true,
          instructions: item.instructions,
          variant: item.variant,
          modifiers: item.modifiers,
        };
      }

      const product = productMap.get(item.productId!);
      if (!product) throw new Error('manual_order_product_not_found');
      if (String(product.business_id) !== input.businessId) throw new Error('manual_order_cross_business_product');
      if (String(product.status) !== 'available') throw new Error('manual_order_product_unavailable');
      if (asNumber(product.quantity_available) < item.quantity) throw new Error('manual_order_insufficient_stock');
      return {
        productId: String(product.id),
        name: String(product.name),
        sku: String(product.sku || ''),
        quantity: item.quantity,
        unitPrice: asNumber(product.discount_price ?? product.price),
        isCustomItem: false,
        instructions: item.instructions,
        variant: item.variant,
        modifiers: item.modifiers,
      };
    });

    let deliveryFee = 0;
    if (input.delivery.type === 'delivery') {
      deliveryFee = input.deliveryFee.source === 'automatic'
        ? calculateDeliveryPrice(input.delivery.distanceKm || 0).finalPrice
        : input.deliveryFee.amount;
    }

    const totals = calculateManualOrderTotals(resolvedItems, {
      deliveryFee,
      tipAmount: input.tipAmount,
      surchargeAmount: input.surchargeAmount,
      paidAmount: input.paidAmount,
    });

    if (input.paymentStatus === 'completed' && totals.paidAmount !== totals.total) {
      throw new Error('Para marcar el pago como completado, el valor pagado debe ser igual al total');
    }

    let courierId: string | null = null;
    let initialStatus = input.initialStatus;
    if (input.courierId) {
      if (input.panel !== 'admin') throw new Error('Solo administración puede asignar un repartidor en la creación');
      const { data: driver, error } = await supabase
        .from('drivers')
        .select('id,is_active,status')
        .eq('id', input.courierId)
        .maybeSingle();
      if (error || !driver || !driver.is_active || !['available', 'busy'].includes(String(driver.status))) {
        throw new Error('El repartidor seleccionado no está disponible');
      }
      courierId = String(driver.id);
      initialStatus = 'pending';
    }

    const earnings = calculateOrderEarnings(totals.total, deliveryFee);
    const fingerprint = buildFingerprint(input);
    const orderPayload = {
      business_id: input.businessId,
      branch_id: input.branchId || '',
      customer_id: customerId || '',
      courier_id: courierId || '',
      status: courierId ? 'assigned' : initialStatus,
      payment_status: input.paymentStatus,
      payment_method: input.paymentMethod,
      paid_amount: totals.paidAmount,
      delivery_fee: totals.deliveryFee,
      discount_amount: 0,
      tax_amount: 0,
      tip_amount: totals.tipAmount,
      surcharge_amount: totals.surchargeAmount,
      courier_earnings: earnings.courierEarnings,
      platform_earnings: earnings.platformEarnings,
      preparation_notes: input.preparationNotes || '',
      internal_notes: input.internalNotes || '',
      courier_notes: input.courierNotes || '',
      admin_reason: input.adminReason || '',
      creation_source: input.panel === 'admin' ? 'admin_manual' : 'business_manual',
      created_by_user_id: actor.user.id,
      created_by_role: actor.profile.role,
      created_from_panel: input.panel,
      sales_channel: input.salesChannel,
      sales_channel_detail: input.salesChannelDetail || '',
      delivery_type: input.delivery.type,
      delivery_fee_source: input.delivery.type === 'pickup' ? 'not_applicable' : input.deliveryFee.source,
      delivery_fee_overridden: input.deliveryFee.source === 'manual',
      delivery_fee_override_reason: input.deliveryFee.overrideReason || '',
      guest_customer_snapshot: customerId ? customerSnapshot : customerSnapshot,
      delivery_snapshot: input.delivery.type === 'delivery' ? input.delivery : null,
      business_snapshot: { id: business.id, name: business.name },
      idempotency_key: input.idempotencyKey,
      metadata: {
        customer_snapshot: customerSnapshot,
        request_fingerprint: fingerprint,
        distance_km: input.delivery.distanceKm || null,
        partial_payment: totals.paidAmount > 0 && totals.paidAmount < totals.total,
        business_amount: earnings.businessAmount,
      },
    };

    const rpcItems = resolvedItems.map((item) => ({
      product_id: item.productId || '',
      is_custom_item: item.isCustomItem,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      instructions: item.instructions || '',
      variant: item.variant || {},
      modifiers: item.modifiers || [],
      metadata: { sku: item.sku || null },
    }));

    const { data, error } = await supabase.rpc('create_manual_order_atomic', {
      p_order: orderPayload,
      p_items: rpcItems,
    });
    if (error) throw error;

    const result = asObject(data);
    const orderId = String(result.order_id || '');
    const orderNumber = String(result.order_number || '');
    await serverAudit.logAction(
      actor.user.id,
      actor.user.email,
      actor.profile.role,
      'manual_order_created',
      'orders',
      orderId,
      {
        businessId: input.businessId,
        panel: input.panel,
        salesChannel: input.salesChannel,
        deliveryType: input.delivery.type,
        deliveryFeeSource: input.deliveryFee.source,
        deliveryFee,
        itemCount: resolvedItems.length,
        total: totals.total,
        customerKind: input.customer.kind,
        idempotencyKey: input.idempotencyKey,
        idempotentReplay: Boolean(result.idempotent_replay),
      },
    );

    return {
      success: true,
      orderId,
      orderNumber,
      idempotentReplay: Boolean(result.idempotent_replay),
    };
  } catch (error) {
    if (actor) {
      await serverAudit.logError(
        actor.user.id,
        actor.user.email,
        actor.profile.role,
        'manual_order_created',
        'orders',
        error instanceof Error ? error.message : String(error),
      );
    }
    return { success: false, error: getManualOrderErrorMessage(error) };
  }
}
