import { getBrowserClient } from '@/lib/db/supabase';
/* eslint-disable @typescript-eslint/no-explicit-any */

async function getClient() {
  return getBrowserClient();
}

function toCSV(headers: string[], rows: string[][]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export const reportService = {
  async exportSalesCSV(days = 30): Promise<string> {
    const supabase = await getClient();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const { data } = await supabase
      .from('orders')
      .select('order_number, total_amount, status, payment_status, created_at, business_id, customer_id')
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false });
    const orders = (data || []) as any[];
    const bizIds = [...new Set(orders.map((o: any) => o.business_id))];
    const custIds = [...new Set(orders.map((o: any) => o.customer_id))];
    const [bizRes, custRes] = await Promise.all([
      supabase.from('businesses').select('id, name').in('id', bizIds),
      supabase.from('profiles').select('id, first_name, last_name').in('id', custIds),
    ]);
    const bizMap = new Map((bizRes.data || []).map((b: any) => [b.id, b.name]));
    const custMap = new Map((custRes.data || []).map((c: any) => [c.id, [c.first_name, c.last_name].filter(Boolean).join(' ')]));
    const headers = ['Orden', 'Negocio', 'Cliente', 'Total', 'Estado', 'Pago', 'Fecha'];
    const rows = orders.map((o: any) => [
      o.order_number,
      bizMap.get(o.business_id) || 'Unknown',
      custMap.get(o.customer_id) || 'Unknown',
      `$${Number(o.total_amount).toFixed(2)}`,
      o.status,
      o.payment_status,
      new Date(o.created_at).toLocaleString('es-CO'),
    ]);
    return toCSV(headers, rows);
  },

  async exportCommissionsCSV(): Promise<string> {
    const supabase = await getClient();
    const { data } = await supabase
      .from('commission_transactions')
      .select('*, orders(order_number), businesses(name)')
      .order('created_at', { ascending: false });
    const list = (data || []) as any[];
    const headers = ['Orden', 'Negocio', 'Total Orden', 'Comisión %', 'Comisión $', 'Estado', 'Fecha'];
    const rows = list.map((c: any) => [
      c.orders?.order_number || '',
      c.businesses?.name || '',
      `$${Number(c.order_total).toFixed(2)}`,
      `${Number(c.commission_rate).toFixed(1)}%`,
      `$${Number(c.commission_amount).toFixed(2)}`,
      c.status,
      new Date(c.created_at).toLocaleString('es-CO'),
    ]);
    return toCSV(headers, rows);
  },

  async exportCourierEarningsCSV(): Promise<string> {
    const supabase = await getClient();
    const { data } = await supabase
      .from('driver_earnings')
      .select('*, orders(order_number, total_amount), profiles!driver_id(first_name, last_name)')
      .order('created_at', { ascending: false });
    const list = (data || []) as any[];
    const headers = ['Repartidor', 'Orden', 'Base', 'Bonus', 'Total', 'Estado', 'Fecha'];
    const rows = list.map((e: any) => [
      [e.profiles?.first_name, e.profiles?.last_name].filter(Boolean).join(' ') || 'Unknown',
      e.orders?.order_number || '',
      `$${Number(e.base_amount || 0).toFixed(2)}`,
      `$${Number(e.bonus_amount || 0).toFixed(2)}`,
      `$${Number(e.total_earned).toFixed(2)}`,
      e.status,
      new Date(e.created_at).toLocaleString('es-CO'),
    ]);
    return toCSV(headers, rows);
  },

  downloadCSV(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
