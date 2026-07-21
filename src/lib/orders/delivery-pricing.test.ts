import { describe, expect, it } from 'vitest';
import { calculateDeliveryPrice } from '@/lib/orders/delivery-pricing';

describe('delivery pricing preview', () => {
  it('includes two kilometres in the base fee', () => {
    expect(calculateDeliveryPrice(2).finalPrice).toBe(5000);
  });

  it('matches the active database formula at 3.2 km', () => {
    const quote = calculateDeliveryPrice(3.2);
    expect(quote.rawPrice).toBe(6440);
    expect(quote.finalPrice).toBe(6500);
  });

  it('rejects invalid automatic distances with a safe fallback', () => {
    const quote = calculateDeliveryPrice(0);
    expect(quote.finalPrice).toBe(0);
    expect(quote.confidence).toBe('low');
  });
});
