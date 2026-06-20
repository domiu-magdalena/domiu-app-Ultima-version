import { getBrowserClient } from '@/lib/db/supabase';
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  max_discount: number | null;
  min_amount: number;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  per_user_limit: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  order_id: string | null;
  discount_amount: number;
  created_at: string;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  discount?: number;
  error?: string;
}

async function getClient() {
  return getBrowserClient();
}

export const couponService = {
  async getAll(): Promise<Coupon[]> {
    const supabase = await getClient();
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    return (data || []) as Coupon[];
  },

  async getById(id: string): Promise<Coupon | null> {
    const supabase = await getClient();
    const { data } = await supabase.from('coupons').select('*').eq('id', id).single();
    return (data as Coupon) || null;
  },

  async create(c: Partial<Coupon>): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase.from('coupons').insert(c);
    if (error) throw new Error(error.message);
  },

  async update(id: string, c: Partial<Coupon>): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase.from('coupons').update(c).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const supabase = await getClient();
    await supabase.from('coupons').update({ is_active: isActive }).eq('id', id);
  },

  async validate(code: string, userId: string, orderTotal: number): Promise<CouponValidation> {
    const supabase = await getClient();
    const { data } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();
    const coupon = data as Coupon | null;
    if (!coupon) return { valid: false, error: 'Cupón no encontrado' };

    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) return { valid: false, error: 'Cupón aún no válido' };
    if (coupon.expires_at && new Date(coupon.expires_at) < now) return { valid: false, error: 'Cupón expirado' };
    if (orderTotal < coupon.min_amount) return { valid: false, error: `Monto mínimo: $${coupon.min_amount.toFixed(2)}` };

    const { count: globalCount } = await supabase
      .from('coupon_usage')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id);
    if (coupon.usage_limit && (globalCount ?? 0) >= coupon.usage_limit) return { valid: false, error: 'Cupón agotado' };

    const { count: userCount } = await supabase
      .from('coupon_usage')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId);
    if ((userCount ?? 0) >= coupon.per_user_limit) return { valid: false, error: 'Ya usaste este cupón' };

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = orderTotal * (coupon.value / 100);
      if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, orderTotal);
    }
    // free_shipping: discount is delivery fee, calculated at checkout

    return { valid: true, coupon, discount: Math.round(discount * 100) / 100 };
  },

  async apply(couponId: string, userId: string, orderId: string | null, discountAmount: number): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase.from('coupon_usage').insert({
      coupon_id: couponId, user_id: userId, order_id: orderId, discount_amount: discountAmount,
    });
    if (error) throw new Error(error.message);
  },

  async getUsage(couponId?: string): Promise<CouponUsage[]> {
    const supabase = await getClient();
    let q = supabase.from('coupon_usage').select('*, profiles!user_id(first_name, last_name)').order('created_at', { ascending: false }).limit(100);
    if (couponId) q = q.eq('coupon_id', couponId);
    const { data } = await q;
    return (data || []) as any[];
  },

  async getUsageStats(): Promise<{ used: number; users: number; totalDiscount: number }> {
    const supabase = await getClient();
    const { data } = await supabase.from('coupon_usage').select('discount_amount, user_id');
    const rows = (data || []) as any[];
    const users = new Set(rows.map((r: any) => r.user_id));
    return {
      used: rows.length,
      users: users.size,
      totalDiscount: rows.reduce((s: number, r: any) => s + Number(r.discount_amount), 0),
    };
  },
};
