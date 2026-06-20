import { getBrowserClient } from '@/lib/db/supabase';
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Referral {
  id: string;
  referrer_id: string;
  code: string;
  referred_id: string | null;
  status: 'pending' | 'converted' | 'expired';
  reward_given: boolean;
  created_at: string;
  converted_at: string | null;
}

export interface LoyaltyPoint {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  type: 'free_shipping' | 'discount' | 'product';
  value: number | null;
  stock: number | null;
  image_url: string | null;
  is_active: boolean;
}

export interface RewardRedemption {
  id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
}

async function getClient() {
  return getBrowserClient();
}

export const referralService = {
  async getMyCode(userId: string): Promise<string | null> {
    const supabase = await getClient();
    const { data } = await supabase.from('referrals').select('code').eq('referrer_id', userId).maybeSingle();
    return (data as any)?.code || null;
  },

  async getByCode(code: string): Promise<Referral | null> {
    const supabase = await getClient();
    const { data } = await supabase.from('referrals').select('*').eq('code', code.toUpperCase()).maybeSingle();
    return (data as Referral) || null;
  },

  async registerReferral(referrerId: string, referredId: string): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase.from('referrals')
      .update({ referred_id: referredId, status: 'converted', converted_at: new Date().toISOString() })
      .eq('referrer_id', referrerId)
      .is('referred_id', null);
    if (error) throw new Error(error.message);
  },

  async getStats(): Promise<{ total: number; converted: number; pending: number }> {
    const supabase = await getClient();
    const { data } = await supabase.from('referrals').select('status');
    const rows = (data || []) as any[];
    return {
      total: rows.length,
      converted: rows.filter((r: any) => r.status === 'converted').length,
      pending: rows.filter((r: any) => r.status === 'pending').length,
    };
  },

  async getUserReferrals(userId: string): Promise<Referral[]> {
    const supabase = await getClient();
    const { data } = await supabase.from('referrals').select('*').eq('referrer_id', userId).order('created_at', { ascending: false });
    return (data || []) as Referral[];
  },
};

export const loyaltyService = {
  async getBalance(userId: string): Promise<number> {
    const supabase = await getClient();
    const { data } = await supabase.from('loyalty_points').select('points').eq('user_id', userId);
    const rows = (data || []) as any[];
    return rows.reduce((s: number, r: any) => s + Number(r.points), 0);
  },

  async addPoints(userId: string, points: number, reason: string, refId?: string, refType?: string): Promise<void> {
    const supabase = await getClient();
    await supabase.from('loyalty_points').insert({
      user_id: userId, points, reason, reference_id: refId, reference_type: refType,
    });
  },

  async getHistory(userId: string): Promise<LoyaltyPoint[]> {
    const supabase = await getClient();
    const { data } = await supabase.from('loyalty_points').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
    return (data || []) as LoyaltyPoint[];
  },

  async getRewards(): Promise<Reward[]> {
    const supabase = await getClient();
    const { data } = await supabase.from('rewards').select('*').order('points_required', { ascending: true });
    return (data || []) as Reward[];
  },

  async redeem(rewardId: string, userId: string, pointsSpent: number): Promise<void> {
    const supabase = await getClient();
    const balance = await this.getBalance(userId);
    if (balance < pointsSpent) throw new Error('Puntos insuficientes');
    const { error } = await supabase.from('reward_redemptions').insert({
      reward_id: rewardId, user_id: userId, points_spent: pointsSpent,
    });
    if (error) throw new Error(error.message);
    await this.addPoints(userId, -pointsSpent, `Canje: ${rewardId}`, rewardId, 'reward');
  },

  async getRedemptions(userId?: string): Promise<RewardRedemption[]> {
    const supabase = await getClient();
    let q = supabase.from('reward_redemptions').select('*').order('created_at', { ascending: false }).limit(100);
    if (userId) q = q.eq('user_id', userId);
    const { data } = await q;
    return (data || []) as RewardRedemption[];
  },

  async getPointsStats(): Promise<{ totalIssued: number; totalRedeemed: number; activeUsers: number }> {
    const supabase = await getClient();
    const { data: all } = await supabase.from('loyalty_points').select('points, user_id');
    const rows = (all || []) as any[];
    const users = new Set(rows.map((r: any) => r.user_id));
    const totalIssued = rows.filter((r: any) => r.points > 0).reduce((s: number, r: any) => s + Number(r.points), 0);
    const totalRedeemed = Math.abs(rows.filter((r: any) => r.points < 0).reduce((s: number, r: any) => s + Number(r.points), 0));
    return { totalIssued, totalRedeemed, activeUsers: users.size };
  },
};
