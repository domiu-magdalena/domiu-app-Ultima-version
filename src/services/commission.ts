import { getBrowserClient } from '@/lib/db/supabase';
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CommissionConfig {
  id: string;
  type: 'global' | 'category' | 'business';
  category: string | null;
  business_id: string | null;
  rate: number;
  is_active: boolean;
}

export interface CommissionTransaction {
  id: string;
  order_id: string;
  business_id: string;
  order_total: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'collected' | 'cancelled';
  collected_at: string | null;
  created_at: string;
}

export interface BusinessPayout {
  id: string;
  business_id: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  notes: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
}

async function getClient() {
  return getBrowserClient();
}

export const commissionService = {
  async getConfigs(): Promise<CommissionConfig[]> {
    const supabase = await getClient();
    const { data } = await supabase.from('commission_config').select('*').order('type', { ascending: true });
    return (data || []) as CommissionConfig[];
  },

  async upsertConfig(config: Partial<CommissionConfig> & { rate: number; type: string }): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase.from('commission_config').upsert(config as any);
    if (error) throw new Error(error.message);
  },

  async toggleConfig(id: string, isActive: boolean): Promise<void> {
    const supabase = await getClient();
    await supabase.from('commission_config').update({ is_active: isActive }).eq('id', id);
  },

  async getTransactions(status?: string, limit = 100): Promise<CommissionTransaction[]> {
    const supabase = await getClient();
    let q = supabase.from('commission_transactions').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status) q = q.eq('status', status);
    const { data } = await q;
    return (data || []) as CommissionTransaction[];
  },

  async collectCommissions(ids: string[]): Promise<void> {
    const supabase = await getClient();
    await supabase.from('commission_transactions')
      .update({ status: 'collected', collected_at: new Date().toISOString() })
      .in('id', ids);
  },

  async getPayouts(status?: string): Promise<BusinessPayout[]> {
    const supabase = await getClient();
    let q = supabase.from('business_payouts').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data } = await q;
    return (data || []) as BusinessPayout[];
  },

  async approvePayout(id: string, adminId: string): Promise<void> {
    const supabase = await getClient();
    await supabase.from('business_payouts')
      .update({ status: 'approved', processed_by: adminId })
      .eq('id', id);
  },

  async completePayout(id: string, adminId: string): Promise<void> {
    const supabase = await getClient();
    await supabase.from('business_payouts')
      .update({ status: 'completed', processed_by: adminId, processed_at: new Date().toISOString() })
      .eq('id', id);
  },

  async rejectPayout(id: string, adminId: string, notes?: string): Promise<void> {
    const supabase = await getClient();
    await supabase.from('business_payouts')
      .update({ status: 'rejected', processed_by: adminId, notes })
      .eq('id', id);
  },
};
