'use server';

import { z } from 'zod';
import { getServiceClient } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/server-auth';
import { serverAudit } from '@/lib/audit/server-audit';
import { generateUniqueOrderCode } from '@/lib/orders/order-code';
import { calculateOrderEarnings } from '@/lib/orders/order-earnings';
import type { OrderStatus } from '@/types/database';

const VALID_PAYMENT_METHODS = ['cash', 'transfer', 'credit_card', 'debit_card', 'wallet'] as const;

function mapPaymentMethod(raw: string): string {
  const normalized = raw.toLowerCase().replace(/[\s-]/g, '_');
  if ((VALID_PAYMENT_METHODS as readonly string[]).includes(normalized)) return normalized;
  if (['nequi', 'daviplata', 'pse', 'other'].includes(normalized)) return 'transfer';
  return 'cash';
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const businessManualOrderSchema = z.object({
  customerName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  customerPhone: z.string().regex(/^3\d{9}$/, 'Teléfono debe ser 10 dígitos empezando por 3'),
  deliveryAddress: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  neighborhood: z.string().optional(),
  addressNotes: z.string().optional(),
  distanceKm: z.number().positive('La distancia debe ser mayor a 0 km'),
  durationMinutes: z.number().min(0),
  deliveryFee: z.number().positive('El valor del domicilio debe ser mayor a 0'),
  priceCalculationSource: z.enum(['google_maps', 'manual', 'fallback', 'neighborhood_zone']).default('google_maps'),
  paymentMethod: z.string().min(1, 'Selecciona un método de pago'),
  specialInstructions: z.string().optional(),
  rawOrderText: z.string().optional(),
  // Optional resolution fields provided by UI/intelligence module
  addressResolutionSource: z.string().optional(),
  addressConfidence: z.string().optional(),
  requiresAddressConfirmation: z.boolean().optional(),
  rawDetectedAddress: z.string().optional(),
  normalizedAddress: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  zoneName: z.string().optional(),
});

export type BusinessManualOrderInput = z.infer<typeof businessManualOrderSchema>;

export interface BusinessManualOrderResult {
  success?: boolean;
  orderId?: string;
  orderNumber?: string;
  code?: string;
  error?: string;
}

export interface CurrentBusinessForManualOrder {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_verified: boolean;
  hasAddress: boolean;
  hasCoordinates: boolean;
}

export async function getCurrentBusinessForManualOrder(): Promise<CurrentBusinessForManualOrder | null> {
  try {
    const auth = await requireAuth();
    if (auth.error) return null;
    if (auth.session.profile.role !== 'merchant') return null;

    const supabase = getServiceClient();
    const { session } = auth;

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, is_active, is_verified, owner_id')
      .eq('owner_id', session.user.id)
      .maybeSingle();

    if (!business || !business.is_active) return null;

    const { data: addresses } = await supabase
      .from('business_addresses')
      .select('street_address, city, latitude, longitude, is_primary')
      .eq('business_id', business.id)
      .order('is_primary', { ascending: false })
      .limit(1);

    const address = addresses?.[0] || null;
    const lat = toFiniteNumber(address?.latitude);
    const lng = toFiniteNumber(address?.longitude);

    return {
      id: business.id,
      name: business.name,
      address: address?.street_address || '',
      city: address?.city || 'Santa Marta',
      latitude: lat,
      longitude: lng,
      is_active: business.is_active,
      is_verified: business.is_verified ?? false,
      hasAddress: !!address?.street_address,
      hasCoordinates: lat !== null && lng !== null,
    };
  } catch {
    return null;
  }
}

export async function createBusinessManualOrderAction(
  input: BusinessManualOrderInput,
): Promise<BusinessManualOrderResult> {
  try {
    const parsed = businessManualOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues.map(e => e.message).join(', ') };
    }

    const auth = await requireAuth();
    if (auth.error) return { error: auth.error.message };
    if (auth.session.profile.role !== 'merchant') {
      return { error: 'Solo los locales pueden crear domicilios desde este módulo' };
    }

    const supabase = getServiceClient();
    const { session } = auth;
    const data = parsed.data;

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, is_active, is_verified, owner_id')
      .eq('owner_id', session.user.id)
      .maybeSingle();

    if (bizError || !business) return { error: 'No encontramos un local asociado a tu cuenta' };
    if (!business.is_active) return { error: 'Tu local no está activo para crear domicilios' };

    const { data: bizAddresses } = await supabase
      .from('business_addresses')
      .select('street_address, city, latitude, longitude, is_primary')
      .eq('business_id', business.id)
      .order('is_primary', { ascending: false })
      .limit(1);

    const bizAddress = bizAddresses?.[0] || null;

    if (!bizAddress?.street_address) {
      return { error: 'Tu local no tiene dirección registrada. Actualiza la dirección del local antes de crear domicilios.' };
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', data.customerPhone)
      .maybeSingle();

    let customerId: string;

    if (existingProfile) {
      customerId = existingProfile.id;
    } else {
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: `${data.customerPhone}@pedido-manual.domiu`,
        password: Math.random().toString(36).slice(2, 10),
        phone: data.customerPhone,
        email_confirm: true,
        user_metadata: {
          full_name: data.customerName,
          source: 'business_manual_order',
        },
      });

      if (createUserError || !newUser?.user) {
        return { error: 'No se pudo crear el perfil del cliente: ' + (createUserError?.message || 'error') };
      }

      customerId = newUser.user.id;

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: customerId,
        email: `${data.customerPhone}@pedido-manual.domiu`,
        first_name: data.customerName.split(' ')[0] || data.customerName,
        last_name: data.customerName.split(' ').slice(1).join(' ') || '',
        phone: data.customerPhone,
        status: 'active',
      });

      if (profileError) {
        await supabase.auth.admin.deleteUser(customerId).catch(() => {});
        return { error: 'No se pudo crear el perfil del cliente' };
      }
    }

    const { data: address, error: addrError } = await supabase
      .from('addresses')
      .insert({
        user_id: customerId,
        type: 'other',
        label: 'Pedido manual local',
        street_address: data.deliveryAddress,
        city: 'Santa Marta',
        country: 'Colombia',
        latitude: data.deliveryLat || null,
        longitude: data.deliveryLng || null,
        instructions: data.addressNotes || null,
        is_primary: false,
      })
      .select('id')
      .single();

    if (addrError || !address) {
      return { error: 'No se pudo crear la dirección de entrega' };
    }

    const orderNumber = await generateUniqueOrderCode(supabase);
    const earnings = calculateOrderEarnings(data.deliveryFee, data.deliveryFee);
    const status: OrderStatus = 'pending';
    const paymentMethod = mapPaymentMethod(data.paymentMethod);

    const metadata: Record<string, unknown> = {
      source: 'business_manual',
      created_by_role: 'merchant',
      created_by_user_id: session.user.id,
      created_by_email: session.user.email,
      has_products: false,
      delivery_only: true,
      manual_price_used: false,
      price_calculation_source: data.priceCalculationSource,
      distance_km: data.distanceKm,
      duration_minutes: data.durationMinutes,
      business_name: business.name,
      business_address: bizAddress.street_address,
      business_city: bizAddress.city || 'Santa Marta',
      customer_address: data.deliveryAddress,
      customer_phone: data.customerPhone,
      customer_neighborhood: data.neighborhood || null,
      assignment_mode: 'public',
      raw_order_text: data.rawOrderText || null,
      courier_earnings: earnings.courierEarnings,
      platform_earnings: earnings.platformEarnings,
      business_amount: earnings.businessAmount,
    };

    // Merge optional resolution fields from the intelligence module/UI
    if (data.addressResolutionSource) metadata.address_resolution_source = data.addressResolutionSource;
    if (data.addressConfidence) metadata.address_confidence = data.addressConfidence;
    if (typeof data.requiresAddressConfirmation === 'boolean') metadata.requires_address_confirmation = data.requiresAddressConfirmation;
    if (data.rawDetectedAddress) metadata.raw_detected_address = data.rawDetectedAddress;
    if (data.normalizedAddress) metadata.normalized_address = data.normalizedAddress;
    if (data.googleMapsUrl) metadata.google_maps_url = data.googleMapsUrl;
    if (toFiniteNumber(data.destinationLat) !== null) metadata.destination_lat = toFiniteNumber(data.destinationLat);
    if (toFiniteNumber(data.destinationLng) !== null) metadata.destination_lng = toFiniteNumber(data.destinationLng);
    if (data.zoneName) metadata.zone_name = data.zoneName;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_code: orderNumber,
        order_number: orderNumber,
        order_type: 'manual_delivery',
        customer_id: customerId,
        business_id: business.id,
        courier_id: null,
        delivery_address_id: address.id,
        status,
        payment_status: 'pending',
        payment_method: paymentMethod as 'cash' | 'transfer' | 'credit_card' | 'debit_card' | 'wallet',
        subtotal: data.deliveryFee,
        delivery_fee: data.deliveryFee,
        courier_earnings: earnings.courierEarnings,
        platform_earnings: earnings.platformEarnings,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: data.deliveryFee,
        special_instructions: data.specialInstructions || null,
        metadata,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('[business-manual-orders] insert error:', orderError);
      return { error: 'Error al crear el domicilio: ' + (orderError?.message || '') };
    }

    await supabase.from('order_tracking').insert({
      order_id: order.id,
      status,
      notes: `Domicilio manual creado por el local ${business.name} — pendiente para DomiU/repartidor`,
    });

    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      for (const admin of admins || []) {
        await supabase.rpc('create_notification', {
          p_recipient_id: admin.id,
          p_notification_type: 'new_order',
          p_title: 'Nuevo domicilio creado por local',
          p_message: `${business.name} creó el domicilio #${orderNumber}`,
          p_order_id: order.id,
        });
      }
    } catch {}

    await serverAudit.logAction(
      session.user.id,
      session.user.email,
      session.profile.role,
      'business_manual_order_created',
      'orders',
      order.id,
      {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        businessId: business.id,
        businessName: business.name,
        customerAddress: data.deliveryAddress,
        distanceKm: data.distanceKm,
        deliveryFee: data.deliveryFee,
        paymentMethod,
        calculationSource: data.priceCalculationSource,
        source: 'business_manual_form',
        courierEarnings: earnings.courierEarnings,
        platformEarnings: earnings.platformEarnings,
      },
    );

    return { success: true, orderId: order.id, orderNumber, code: orderNumber };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[business-manual-orders] createBusinessManualOrderAction error:', err);

    try {
      const auth = await requireAuth();
      if (!auth.error) {
        await serverAudit.logError(
          auth.session.user.id,
          auth.session.user.email,
          auth.session.profile.role,
          'business_manual_order_created',
          'orders',
          msg,
        );
      }
    } catch {}

    return { error: msg };
  }
}
