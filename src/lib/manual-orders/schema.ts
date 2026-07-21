import { z } from 'zod';

export const manualOrderSalesChannels = ['whatsapp', 'phone', 'in_person', 'instagram', 'facebook', 'other'] as const;
export const manualOrderPaymentMethods = ['cash', 'transfer', 'credit_card', 'debit_card', 'wallet'] as const;
export const manualOrderPaymentStatuses = ['pending', 'pending_verification', 'completed', 'failed'] as const;
export const manualOrderInitialStatuses = ['pending', 'confirmed'] as const;

const nullableText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const nullableUuid = z.string().uuid().optional().or(z.literal(''));

export const manualOrderModifierSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const manualOrderItemSchema = z
  .object({
    productId: nullableUuid,
    variantId: nullableUuid,
    quantity: z.number().int().min(1).max(100),
    specialInstructions: nullableText(500),
    modifiers: z.array(manualOrderModifierSchema).max(20).default([]),
    isCustomItem: z.boolean().default(false),
    name: nullableText(160),
    description: nullableText(500),
    unitPrice: z.number().int().min(0).max(20_000_000).optional(),
  })
  .superRefine((item, context) => {
    if (item.isCustomItem) {
      if (!item.name || item.name.trim().length < 2) {
        context.addIssue({ code: 'custom', path: ['name'], message: 'Escribe el nombre del producto personalizado' });
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        context.addIssue({ code: 'custom', path: ['unitPrice'], message: 'El precio del producto personalizado debe ser mayor a cero' });
      }
      if (item.productId) {
        context.addIssue({ code: 'custom', path: ['productId'], message: 'Un producto personalizado no puede usar un producto del catálogo' });
      }
      return;
    }

    if (!item.productId) {
      context.addIssue({ code: 'custom', path: ['productId'], message: 'Selecciona un producto del catálogo' });
    }
    if (item.unitPrice !== undefined) {
      context.addIssue({ code: 'custom', path: ['unitPrice'], message: 'El precio del catálogo se calcula en el servidor' });
    }
  });

export const manualOrderAddressSchema = z.object({
  streetAddress: z.string().trim().min(5).max(300),
  formattedAddress: nullableText(500),
  neighborhood: nullableText(120),
  city: z.string().trim().min(2).max(120).default('Santa Marta'),
  instructions: nullableText(500),
  placeId: nullableText(300),
  latitude: z.number().min(11.0).max(11.4).optional(),
  longitude: z.number().min(-74.4).max(-74.0).optional(),
  incompleteConfirmed: z.boolean().default(false),
});

export const manualOrderNotesSchema = z.object({
  customer: nullableText(1000),
  kitchen: nullableText(1000),
  courier: nullableText(1000),
  internal: nullableText(2000),
});

export const manualOrderInputSchema = z
  .object({
    businessId: z.string().uuid(),
    businessAddressId: z.string().uuid(),
    customerType: z.enum(['guest', 'registered']).default('guest'),
    customerId: nullableUuid,
    customerName: nullableText(160),
    customerPhone: nullableText(30),
    customerEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
    customerNotes: nullableText(1000),
    deliveryType: z.enum(['delivery', 'pickup']).default('delivery'),
    deliveryAddress: manualOrderAddressSchema.optional(),
    items: z.array(manualOrderItemSchema).min(1, 'Agrega al menos un producto').max(100),
    discountAmount: z.number().int().min(0).max(100_000_000).default(0),
    taxAmount: z.number().int().min(0).max(100_000_000).default(0),
    deliveryFee: z.number().int().min(0).max(2_000_000).default(0),
    deliveryFeeOverridden: z.boolean().default(false),
    deliveryFeeOverrideReason: nullableText(500),
    deliveryFeeSource: z.enum(['automatic', 'google_maps', 'postgis', 'manual_override', 'pickup']).default('automatic'),
    distanceKm: z.number().min(0).max(250).default(0),
    durationMinutes: z.number().int().min(0).max(600).default(0),
    routeSource: z.enum(['google_maps', 'google_routes', 'google_directions', 'osrm', 'postgis_direct', 'manual', 'pickup']).default('postgis_direct'),
    paymentMethod: z.enum(manualOrderPaymentMethods).default('cash'),
    paymentStatus: z.enum(manualOrderPaymentStatuses).default('pending'),
    amountPaid: z.number().int().min(0).max(200_000_000).default(0),
    paymentReference: nullableText(300),
    paymentNotes: nullableText(1000),
    salesChannel: z.enum(manualOrderSalesChannels),
    salesChannelDetail: nullableText(160),
    initialStatus: z.enum(manualOrderInitialStatuses).default('confirmed'),
    courierId: nullableUuid,
    administrativeReason: nullableText(1000),
    notes: manualOrderNotesSchema.default({}),
    idempotencyKey: z.string().trim().min(16).max(160),
  })
  .superRefine((order, context) => {
    if (order.customerType === 'registered') {
      if (!order.customerId) {
        context.addIssue({ code: 'custom', path: ['customerId'], message: 'Selecciona un cliente registrado' });
      }
    } else {
      if (!order.customerName || order.customerName.trim().length < 3) {
        context.addIssue({ code: 'custom', path: ['customerName'], message: 'El nombre del cliente debe tener al menos 3 caracteres' });
      }
      const phone = (order.customerPhone || '').replace(/\D/g, '');
      if (!/^3\d{9}$/.test(phone)) {
        context.addIssue({ code: 'custom', path: ['customerPhone'], message: 'El teléfono debe tener 10 dígitos y empezar por 3' });
      }
    }

    if (order.deliveryType === 'delivery') {
      if (!order.deliveryAddress) {
        context.addIssue({ code: 'custom', path: ['deliveryAddress'], message: 'Completa la dirección de entrega' });
      } else {
        const hasCoordinates = order.deliveryAddress.latitude !== undefined && order.deliveryAddress.longitude !== undefined;
        if (!hasCoordinates && !order.deliveryAddress.incompleteConfirmed) {
          context.addIssue({
            code: 'custom',
            path: ['deliveryAddress', 'incompleteConfirmed'],
            message: 'Confirma que revisaste la dirección sin coordenadas',
          });
        }
      }
    } else if (order.deliveryFee !== 0 || order.deliveryFeeOverridden) {
      context.addIssue({ code: 'custom', path: ['deliveryFee'], message: 'Los pedidos para recoger no cobran domicilio' });
    }

    if (order.deliveryFeeOverridden) {
      if (!order.deliveryFeeOverrideReason || order.deliveryFeeOverrideReason.trim().length < 5) {
        context.addIssue({ code: 'custom', path: ['deliveryFeeOverrideReason'], message: 'Indica el motivo de la tarifa manual' });
      }
      if (order.deliveryFee <= 0 && order.deliveryType === 'delivery') {
        context.addIssue({ code: 'custom', path: ['deliveryFee'], message: 'La tarifa manual debe ser mayor a cero' });
      }
    }

    if (order.salesChannel === 'other' && (!order.salesChannelDetail || order.salesChannelDetail.trim().length < 3)) {
      context.addIssue({ code: 'custom', path: ['salesChannelDetail'], message: 'Describe el canal de origen' });
    }

    if (order.paymentStatus === 'completed' && order.amountPaid <= 0) {
      context.addIssue({ code: 'custom', path: ['amountPaid'], message: 'Registra el valor pagado' });
    }
  });

export type ManualOrderInput = z.infer<typeof manualOrderInputSchema>;
export type ManualOrderItemInput = z.infer<typeof manualOrderItemSchema>;

export const manualOrderDraftSchema = z.object({
  id: z.string().uuid().optional(),
  businessId: z.string().uuid(),
  businessAddressId: nullableUuid,
  payload: z.record(z.string(), z.unknown()),
  version: z.number().int().positive().default(1),
});

export type ManualOrderDraftInput = z.infer<typeof manualOrderDraftSchema>;
