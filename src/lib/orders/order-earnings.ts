import { roundCop, toCopInteger } from '@/lib/money/cop';

export type DomiUOrderType = 'product_order' | 'manual_delivery';

export interface FinancialSettings {
  courierDeliveryRateBps: number;
  platformDeliveryRateBps: number;
  customerServiceRateBps: number;
  customerServiceMinimumCop: number;
  customerServiceMaximumCop: number;
  manualDeliveryServiceFeeCop: number;
  serviceFeeEnabled: boolean;
  roundingIncrementCop: number;
}

export interface OrderFinancialInput {
  subtotal: number;
  deliveryFee: number;
  taxAmount?: number;
  discountAmount?: number;
  orderType?: DomiUOrderType;
  serviceFeeOverride?: number;
}

export interface OrderFinancialBreakdown {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  taxAmount: number;
  discountAmount: number;
  customerTotal: number;
  businessEarnings: number;
  courierEarnings: number;
  platformDeliveryCommission: number;
  platformServiceFee: number;
  platformEarnings: number;
  courierPercentage: number;
  platformPercentage: number;
}

export interface OrderEarnings {
  courierEarnings: number;
  platformEarnings: number;
  businessAmount: number;
  courierPercentage: number;
  platformPercentage: number;
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = Object.freeze({
  courierDeliveryRateBps: 8000,
  platformDeliveryRateBps: 2000,
  customerServiceRateBps: 300,
  customerServiceMinimumCop: 500,
  customerServiceMaximumCop: 2500,
  manualDeliveryServiceFeeCop: 500,
  serviceFeeEnabled: true,
  roundingIncrementCop: 100,
});

function validateBasisPoints(value: number, label: string): number {
  const parsed = toCopInteger(value, label);
  if (parsed > 10_000) throw new Error(`${label} no puede superar 100 %`);
  return parsed;
}

export function validateFinancialSettings(settings: FinancialSettings): FinancialSettings {
  const courierRate = validateBasisPoints(settings.courierDeliveryRateBps, 'Porcentaje del repartidor');
  const platformRate = validateBasisPoints(settings.platformDeliveryRateBps, 'Porcentaje de DomiU');
  if (courierRate + platformRate !== 10_000) {
    throw new Error('La distribución del domicilio debe sumar exactamente 100 %');
  }

  const minimum = toCopInteger(settings.customerServiceMinimumCop, 'Tarifa mínima de servicio');
  const maximum = toCopInteger(settings.customerServiceMaximumCop, 'Tarifa máxima de servicio');
  if (maximum < minimum) throw new Error('La tarifa máxima de servicio no puede ser menor que la mínima');

  return {
    ...settings,
    courierDeliveryRateBps: courierRate,
    platformDeliveryRateBps: platformRate,
    customerServiceRateBps: validateBasisPoints(settings.customerServiceRateBps, 'Porcentaje de servicio'),
    customerServiceMinimumCop: minimum,
    customerServiceMaximumCop: maximum,
    manualDeliveryServiceFeeCop: toCopInteger(settings.manualDeliveryServiceFeeCop, 'Tarifa de servicio del domicilio manual'),
    roundingIncrementCop: Math.max(1, toCopInteger(settings.roundingIncrementCop, 'Incremento de redondeo')),
  };
}

export function calculateCustomerServiceFee(
  subtotal: number,
  orderType: DomiUOrderType,
  settings: FinancialSettings = DEFAULT_FINANCIAL_SETTINGS,
): number {
  const config = validateFinancialSettings(settings);
  const safeSubtotal = toCopInteger(subtotal, 'Subtotal');
  if (!config.serviceFeeEnabled) return 0;

  if (orderType === 'manual_delivery') {
    return config.manualDeliveryServiceFeeCop;
  }

  if (safeSubtotal === 0) return 0;
  const proportional = roundCop(
    (safeSubtotal * config.customerServiceRateBps) / 10_000,
    config.roundingIncrementCop,
  );
  return Math.min(
    config.customerServiceMaximumCop,
    Math.max(config.customerServiceMinimumCop, proportional),
  );
}

export function calculateOrderFinancials(
  input: OrderFinancialInput,
  settings: FinancialSettings = DEFAULT_FINANCIAL_SETTINGS,
): OrderFinancialBreakdown {
  const config = validateFinancialSettings(settings);
  const subtotal = toCopInteger(input.subtotal, 'Subtotal');
  const deliveryFee = toCopInteger(input.deliveryFee, 'Domicilio');
  const taxAmount = toCopInteger(input.taxAmount ?? 0, 'Impuestos');
  const discountAmount = toCopInteger(input.discountAmount ?? 0, 'Descuento');
  const orderType = input.orderType ?? 'product_order';
  const serviceFee = input.serviceFeeOverride == null
    ? calculateCustomerServiceFee(subtotal, orderType, config)
    : toCopInteger(input.serviceFeeOverride, 'Tarifa de servicio');

  const courierEarnings = roundCop(
    (deliveryFee * config.courierDeliveryRateBps) / 10_000,
    1,
  );
  const platformDeliveryCommission = deliveryFee - courierEarnings;
  const businessEarnings = subtotal;
  const platformServiceFee = serviceFee;
  const platformEarnings = platformDeliveryCommission + platformServiceFee;
  const grossTotal = subtotal + deliveryFee + serviceFee + taxAmount;
  const customerTotal = Math.max(0, grossTotal - discountAmount);

  const conservationCheck = businessEarnings + courierEarnings + platformEarnings + taxAmount - discountAmount;
  if (conservationCheck !== customerTotal) {
    throw new Error('El desglose financiero no conserva el total del pedido');
  }

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    taxAmount,
    discountAmount,
    customerTotal,
    businessEarnings,
    courierEarnings,
    platformDeliveryCommission,
    platformServiceFee,
    platformEarnings,
    courierPercentage: config.courierDeliveryRateBps / 10_000,
    platformPercentage: config.platformDeliveryRateBps / 10_000,
  };
}

/**
 * Compatibilidad con los flujos anteriores. No aplica tarifa de servicio porque
 * el total recibido por esta firma histórica ya fue calculado previamente.
 */
export function calculateOrderEarnings(totalAmount: number, deliveryFee: number): OrderEarnings {
  const total = toCopInteger(totalAmount, 'Total');
  const delivery = toCopInteger(deliveryFee, 'Domicilio');
  const breakdown = calculateOrderFinancials(
    {
      subtotal: Math.max(0, total - delivery),
      deliveryFee: delivery,
      serviceFeeOverride: 0,
    },
    { ...DEFAULT_FINANCIAL_SETTINGS, serviceFeeEnabled: false },
  );

  return {
    courierEarnings: breakdown.courierEarnings,
    platformEarnings: breakdown.platformEarnings,
    businessAmount: breakdown.businessEarnings,
    courierPercentage: breakdown.courierPercentage,
    platformPercentage: breakdown.platformPercentage,
  };
}
