import { describe, expect, it } from 'vitest';
import { manualOrderPayloadSchema } from '@/lib/manual-orders/schema';

const productId = '11111111-1111-4111-8111-111111111111';
const businessId = '22222222-2222-4222-8222-222222222222';

function validPayload() {
  return {
    draftId: null,
    businessId,
    branchId: null,
    customerId: null,
    customer: {
      name: 'Cliente invitado',
      phone: '300 123 4567',
      email: '',
      notes: '',
    },
    addressId: null,
    address: {
      street: 'Calle 20 # 10-15',
      complement: '',
      neighborhood: 'Centro',
      city: 'Santa Marta',
      state: 'Magdalena',
      instructions: 'Casa blanca',
      formattedAddress: '',
      placeId: '',
      latitude: null,
      longitude: null,
    },
    items: [{
      isCustom: false,
      productId,
      variantId: null,
      quantity: 2,
      instructions: '',
      modifiers: [],
    }],
    deliveryType: 'delivery',
    distanceKm: 0,
    durationMinutes: 0,
    deliveryFee: 0,
    deliveryFeeOverridden: false,
    deliveryFeeOverrideReason: '',
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    paymentReference: '',
    paymentNotes: '',
    amountPaid: 0,
    salesChannel: 'whatsapp',
    salesChannelOther: '',
    initialStatus: 'confirmed',
    courierId: null,
    discountAmount: 0,
    surchargeAmount: 0,
    tipAmount: 0,
    kitchenNotes: '',
    courierNotes: '',
    internalNotes: '',
    generalNotes: '',
    administrativeReason: '',
    adminOverride: false,
    addressWarningConfirmed: true,
    rawExternalText: '',
  };
}

describe('manual order payload schema', () => {
  it('acepta un cliente invitado sin crear una identidad de autenticación', () => {
    const parsed = manualOrderPayloadSchema.parse(validPayload());
    expect(parsed.customerId).toBeNull();
    expect(parsed.customer.phone).toBe('3001234567');
    expect(parsed.items[0]).toMatchObject({ productId, quantity: 2 });
  });

  it('acepta cliente registrado y mantiene datos de contacto de respaldo', () => {
    const input = validPayload();
    input.customerId = '33333333-3333-4333-8333-333333333333';
    expect(manualOrderPayloadSchema.safeParse(input).success).toBe(true);
  });

  it('rechaza entrega sin dirección escrita ni dirección registrada', () => {
    const input = validPayload();
    input.address.street = '';
    const parsed = manualOrderPayloadSchema.safeParse(input);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.join('.') === 'address.street')).toBe(true);
    }
  });

  it('rechaza tarifa de domicilio en pedido para recoger', () => {
    const input = validPayload();
    input.deliveryType = 'pickup';
    input.deliveryFee = 5000;
    const parsed = manualOrderPayloadSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('exige motivo al sobrescribir la tarifa', () => {
    const input = validPayload();
    input.deliveryFeeOverridden = true;
    input.deliveryFee = 4000;
    const parsed = manualOrderPayloadSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('exige descripción cuando el canal es otro', () => {
    const input = validPayload();
    input.salesChannel = 'other';
    const parsed = manualOrderPayloadSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('no acepta pago no efectivo completado sin referencia', () => {
    const input = validPayload();
    input.paymentMethod = 'transfer';
    input.paymentStatus = 'completed';
    const parsed = manualOrderPayloadSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('permite artículo personalizado con precio entero no negativo', () => {
    const input = validPayload();
    input.items = [{
      isCustom: true,
      name: 'Producto especial',
      description: 'Solicitado por WhatsApp',
      quantity: 1,
      unitPrice: 12500,
      instructions: '',
      modifiers: [],
    }] as typeof input.items;
    expect(manualOrderPayloadSchema.safeParse(input).success).toBe(true);
  });

  it('rechaza cantidades inválidas y campos desconocidos', () => {
    const input = validPayload() as ReturnType<typeof validPayload> & { forgedTotal?: number };
    input.items[0].quantity = 0;
    input.forgedTotal = 1;
    expect(manualOrderPayloadSchema.safeParse(input).success).toBe(false);
  });
});
