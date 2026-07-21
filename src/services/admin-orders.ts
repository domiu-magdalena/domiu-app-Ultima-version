import { getBrowserClient } from '@/lib/db/supabase';
import type { OrderStatus } from '@/types/database';

export interface AdminOrderView {
  id: string;
  order_number: string;
  customer_name: string | null;
  business_name: string;
  status: OrderStatus;
  payment_status: string;
  total_amount: number;
  courier_name: string | null;
  created_at: string;
  order_type: string | null;
  courier_earnings: number | null;
  platform_earnings: number | null;
  created_manually: boolean;
  sales_channel: string | null;
  delivery_type: string;
}

type Row = Record<string, unknown>;

function object(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function name(profile: Row, snapshot: Row) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
    || String(snapshot.name || profile.email || 'Cliente invitado');
}

export const adminOrdersService = {
  async list(search?: string, statusFilter?: string): Promise<AdminOrderView[]> {
    const supabase = getBrowserClient();
    let query = supabase
      .from('orders')
      .select('id,order_number,customer_id,business_id,status,payment_status,total_amount,courier_id,created_at,order_type,courier_earnings,platform_earnings,created_manually,sales_channel,delivery_type,customer_snapshot,guest_customer')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'No se pudieron cargar los pedidos');
    const orders = (data || []) as Row[];

    const customerIds = [...new Set(orders.map((order) => order.customer_id ? String(order.customer_id) : '').filter(Boolean))];
    const businessIds = [...new Set(orders.map((order) => String(order.business_id)).filter(Boolean))];
    const courierIds = [...new Set(orders.map((order) => order.courier_id ? String(order.courier_id) : '').filter(Boolean))];
    const [customersResult, businessesResult, couriersResult] = await Promise.all([
      customerIds.length ? supabase.from('profiles').select('id,first_name,last_name,email').in('id', customerIds) : Promise.resolve({ data: [], error: null }),
      businessIds.length ? supabase.from('businesses').select('id,name').in('id', businessIds) : Promise.resolve({ data: [], error: null }),
      courierIds.length ? supabase.from('profiles').select('id,first_name,last_name,email').in('id', courierIds) : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [customersResult, businessesResult, couriersResult]) {
      if (result.error) throw new Error(result.error.message || 'No se pudo completar la consulta');
    }
    const customerMap = new Map((customersResult.data || []).map((row) => [String(row.id), row as Row]));
    const businessMap = new Map((businessesResult.data || []).map((row) => [String(row.id), String(row.name)]));
    const courierMap = new Map((couriersResult.data || []).map((row) => [String(row.id), row as Row]));

    let result = orders.map((order): AdminOrderView => {
      const snapshot = { ...object(order.guest_customer), ...object(order.customer_snapshot) };
      const customer = order.customer_id ? customerMap.get(String(order.customer_id)) || {} : {};
      const courier = order.courier_id ? courierMap.get(String(order.courier_id)) || {} : {};
      return {
        id: String(order.id),
        order_number: String(order.order_number),
        customer_name: name(customer, snapshot),
        business_name: businessMap.get(String(order.business_id)) || 'Negocio',
        status: order.status as OrderStatus,
        payment_status: String(order.payment_status || 'pending'),
        total_amount: Number(order.total_amount || 0),
        courier_name: Object.keys(courier).length ? name(courier, {}) : null,
        created_at: String(order.created_at),
        order_type: order.order_type ? String(order.order_type) : null,
        courier_earnings: order.courier_earnings == null ? null : Number(order.courier_earnings),
        platform_earnings: order.platform_earnings == null ? null : Number(order.platform_earnings),
        created_manually: Boolean(order.created_manually),
        sales_channel: order.sales_channel ? String(order.sales_channel) : null,
        delivery_type: String(order.delivery_type || 'delivery'),
      };
    });

    if (search) {
      const term = search.toLocaleLowerCase('es');
      result = result.filter((order) =>
        order.order_number.toLocaleLowerCase('es').includes(term)
        || (order.customer_name || '').toLocaleLowerCase('es').includes(term)
        || order.business_name.toLocaleLowerCase('es').includes(term),
      );
    }
    return result;
  },
};
