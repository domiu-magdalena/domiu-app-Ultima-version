import { z } from 'zod';

const optionalMoney = z.number().int().min(0).max(100_000_000).default(0);
const nullableUuid = z.string().uuid().nullable().optional();
const cleanText = (max: number) => z.string().trim().max(max).optional().default('');

export const manualOrderItemSchema = z.discriminatedUnion('isCustom', [
  z.object({
    isCustom: z.literal(false),
    productId: z.string().uuid(),
    variantId: nullableUuid,
    quantity: z.number().int().min(1).max(99),
    instructions: cleanText(500),
    modifiers: z.array(z.object({
      id: z.string().trim().max(100).optional(),
      name: z.string().trim().min(1).max(120),
      price: z.number().int().min(0).max(10_000_000).default(0),
    }).strict()).max(30).default([]),
  }).strict(),
  z.object({
    isCustom: z.literal(true),
    name: z.string().trim().min(2).max(160),
    description: cleanText(500),
    quantity: z.number().int().min(1).max(99),
    unitPrice: z.number().int().min(0).max(100_000_000),
    instructions: cleanText(500),
    modifiers: z.array(z.object({
      name: z.string().trim().min(1).max(120),
      price: z.number().int().min(0).max(10_000_000).default(0),
    }).strict()).max(30).default([]),
  }).strict(),
]);

const manualOrderPayloadObject = z.object({
  draftId: nullableUuid,
  businessId: z.string().uuid(),
  branchId: nullableUuid,
  customerId: nullableUuid,
  customer: z.object({
    name: z.string().trim().min(3).max(160),
    phone: z.string().transform((value) => value.replace(/\D/g, '')).pipe(z.string().min(7).max(15)),
    email: z.string().trim().email().max(180).or(z.literal('')).default(''),
    notes: cleanText(500),
  }).strict(),
  addressId: nullableUuid,
  address: z.object({
    street: cleanText(240),
    complement: cleanText(160),
    neighborhood: cleanText(120),
    city: z.string().trim().min(2).max(120).default('Santa Marta'),
    state: cleanText(120),
    instructions: cleanText(500),
    formattedAddress: cleanText(400),
    placeId: cleanText(240),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }).strict(),
  items: z.array(manualOrderItemSchema).min(1).max(50),
  deliveryType: z.enum(['delivery', 'pickup']).default('delivery'),
  distanceKm: z.number().min(0).max(500).default(0),
  durationMinutes: z.number().int().min(0).max(1440).default(0),
  deliveryFee: optionalMoney,
  deliveryFeeOverridden: z.boolean().default(false),
  deliveryFeeOverrideReason: cleanText(500),
  paymentMethod: z.enum(['cash', 'transfer', 'credit_card', 'debit_card', 'wallet']).default('cash'),
  paymentStatus: z.enum(['pending', 'pending_verification', 'completed', 'failed']).default('pending'),
  paymentReference: cleanText(180),
  paymentNotes: cleanText(500),
  amountPaid: optionalMoney,
  salesChannel: z.enum(['whatsapp', 'phone', 'in_person', 'instagram', 'facebook', 'direct_message', 'other']),
  salesChannelOther: cleanText(120),
  initialStatus: z.enum(['pending', 'confirmed']).default('confirmed'),
  courierId: nullableUuid,
  discountAmount: optionalMoney,
  surchargeAmount: optionalMoney,
  tipAmount: optionalMoney,
  kitchenNotes: cleanText(1000),
  courierNotes: cleanText(1000),
  internalNotes: cleanText(1500),
  generalNotes: cleanText(1000),
  administrativeReason: cleanText(1000),
  adminOverride: z.boolean().default(false),
  addressWarningConfirmed: z.boolean().default(false),
  rawExternalText: cleanText(4000),
}).strict();

function manualOrderRefinements(
  value: z.infer<typeof manualOrderPayloadObject>,
  context: z.RefinementCtx,
) {
  if (!value.customerId && (!value.customer.name || !value.customer.phone)) {
    context.addIssue({ code: 'custom', path: ['customer'], message: 'Completa nombre y teléfono del cliente invitado.' });
  }
  if (value.deliveryType === 'delivery' && !value.addressId && value.address.street.length < 5) {
    context.addIssue({ code: 'custom', path: ['address', 'street'], message: 'La dirección de entrega es obligatoria.' });
  }
  const hasCoordinates = value.address.latitude != null && value.address.longitude != null;
  if (value.deliveryType === 'delivery' && !value.addressId && !hasCoordinates && !value.addressWarningConfirmed) {
    context.addIssue({
      code: 'custom',
      path: ['addressWarningConfirmed'],
      message: 'Confirma que revisaste la dirección aunque no tenga coordenadas.',
    });
  }
  if (value.deliveryType === 'pickup' && value.deliveryFee !== 0) {
    context.addIssue({ code: 'custom', path: ['deliveryFee'], message: 'Los pedidos para recoger no tienen tarifa de domicilio.' });
  }
  if (value.deliveryFeeOverridden && value.deliveryFeeOverrideReason.length < 5) {
    context.addIssue({ code: 'custom', path: ['deliveryFeeOverrideReason'], message: 'Indica el motivo de la tarifa manual.' });
  }
  if (value.salesChannel === 'other' && value.salesChannelOther.length < 2) {
    context.addIssue({ code: 'custom', path: ['salesChannelOther'], message: 'Describe el canal de origen.' });
  }
  if (value.paymentStatus === 'completed' && value.paymentMethod !== 'cash' && value.paymentReference.length < 3) {
    context.addIssue({ code: 'custom', path: ['paymentReference'], message: 'La referencia es obligatoria para registrar este pago.' });
  }
}

export const manualOrderPayloadSchema = manualOrderPayloadObject.superRefine(manualOrderRefinements);

export const manualOrderQuoteSchema = manualOrderPayloadObject.omit({
  draftId: true,
  initialStatus: true,
  courierId: true,
}).superRefine((value, context) => manualOrderRefinements({
  ...value,
  draftId: null,
  initialStatus: 'confirmed',
  courierId: null,
}, context));

export const manualOrderDraftSchema = z.object({
  id: nullableUuid,
  businessId: z.string().uuid(),
  branchId: nullableUuid,
  title: z.string().trim().min(1).max(120).default('Pedido manual sin título'),
  payload: z.record(z.string(), z.unknown()),
  version: z.number().int().min(1).optional(),
}).strict();

export type ManualOrderPayload = z.infer<typeof manualOrderPayloadSchema>;
export type ManualOrderItem = z.infer<typeof manualOrderItemSchema>;
export type ManualOrderDraftInput = z.infer<typeof manualOrderDraftSchema>;

export interface ManualOrderQuoteItem {
  productId: string | null;
  variantId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  isCustom: boolean;
  available: number | null;
}

export interface ManualOrderQuote {
  items: ManualOrderQuoteItem[];
  subtotal: number;
  discountAmount: number;
  surchargeAmount: number;
  tipAmount: number;
  deliveryFee: number;
  serviceFee: number;
  totalAmount: number;
  currency: 'COP';
  estimatedMinutes: number;
  warnings: string[];
  canConfirm: boolean;
}
