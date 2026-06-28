'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { businessService } from '@/services/business';
import { SkeletonList } from '@/components/ui/skeleton';
import { Truck, MapPin, User, DollarSign, Clock } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'text-warning border-l-warning' },
  accepted: { label: 'Aceptado', color: 'text-info border-l-info' },
  picked_up: { label: 'Recogido', color: 'text-primary border-l-primary' },
  in_transit: { label: 'En camino', color: 'text-primary border-l-primary' },
  delivered: { label: 'Entregado', color: 'text-success border-l-success' },
  cancelled: { label: 'Cancelado', color: 'text-destructive border-l-destructive' },
};

const formatCurrency = (n: number | null | undefined) => {
  if (n == null) return '-';
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0 });
};

const formatTime = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

interface ManualDelivery {
  id: string;
  order_number: string;
  order_code: string | null;
  customer_id: string;
  courier_id: string | null;
  status: string;
  total_amount: number;
  delivery_fee: number;
  courier_earnings: number | null;
  platform_earnings: number | null;
  delivery_address: string;
  customer_phone: string | null;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  courier_name: string | null;
  customer_name: string;
  pickup_address: string | null;
  delivery_distance_km: number | null;
}

export default function NegocioDomicilios() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ManualDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ManualDelivery | null>(null);

  const loadOrders = async () => {
    if (!profile?.id) return;
    const bizId = await businessService.getBusinessId(profile.id);
    if (!bizId) return;
    const supabase = (await import('@/lib/db/supabase')).getBrowserClient;
    const client = await supabase();
    const { data } = await client
      .from('orders')
      .select(`
        id, order_number, order_code, customer_id, courier_id, status,
        total_amount, delivery_fee, courier_earnings, platform_earnings,
        delivery_address, customer_phone, special_instructions,
        created_at, updated_at, pickup_address, delivery_distance_km,
        profiles!orders_customer_id_fkey(first_name, last_name),
        courier:drivers!orders_courier_id_fkey(id, first_name, last_name)
      `)
      .eq('business_id', bizId)
      .eq('order_type', 'manual_delivery')
      .order('created_at', { ascending: false })
      .limit(50);

    type Row = Record<string, unknown>;

    const rows = (data || []) as Row[];
    setOrders(rows.map((o: Row) => {
      const profileData = o.profiles;
      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
      const courierData = o.courier;
      const courier = Array.isArray(courierData) ? courierData[0] : courierData;
      return {
      id: o.id as string,
      order_number: o.order_number as string,
      order_code: (o.order_code as string) || null,
      customer_id: o.customer_id as string,
      courier_id: (o.courier_id as string) || null,
      status: o.status as string,
      total_amount: (o.total_amount as number) || 0,
      delivery_fee: (o.delivery_fee as number) || 0,
      courier_earnings: (o.courier_earnings as number) || null,
      platform_earnings: (o.platform_earnings as number) || null,
      delivery_address: (o.delivery_address as string) || '',
      customer_phone: (o.customer_phone as string) || null,
      special_instructions: (o.special_instructions as string) || null,
      created_at: o.created_at as string,
      updated_at: o.updated_at as string,
      pickup_address: (o.pickup_address as string) || null,
      delivery_distance_km: (o.delivery_distance_km as number) || null,
      customer_name: profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        : 'Cliente',
      courier_name: courier
        ? [courier.first_name, courier.last_name].filter(Boolean).join(' ') || 'Asignado'
        : null,
    };
    }));
  };

  useEffect(() => {
    (async () => {
      await loadOrders();
      setLoading(false);
    })();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => { loadOrders(); }, 15000);
    return () => clearInterval(id);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <SkeletonList />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-info/10 to-info/5">
            <Truck className="h-5 w-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Domicilios</h1>
            <p className="mt-1 text-sm text-muted-foreground">Domicilios manuales solicitados a repartidores</p>
          </div>
        </div>
        <button onClick={loadOrders} className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
          Actualizar
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-12 text-center">
          <Truck className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No hay domicilios manuales</p>
          <p className="text-xs text-muted-foreground/70">Los domicilios aparecerán aquí cuando los solicites</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'text-muted-foreground border-l-muted' };
            return (
              <div
                key={order.id}
                onClick={() => setSelected(selected?.id === order.id ? null : order)}
                className={`rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-card hover:shadow-md transition-all cursor-pointer border-l-4 ${cfg.color.split(' ').find(c => c.startsWith('border-l-')) || 'border-l-muted'}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {order.order_code || `#${order.order_number}`}
                        </span>
                        <span className={`text-[10px] font-medium uppercase ${cfg.color.split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground'}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{order.delivery_address || 'Sin dirección'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.customer_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(order.total_amount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(order.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selected?.id === order.id && (
                    <div className="mt-3 pt-3 border-t border-border/30 space-y-2 animate-in slide-in-from-top-1">
                      {order.courier_name && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Truck className="h-3 w-3 text-info" />
                          <span>Repartidor: <strong className="text-foreground">{order.courier_name}</strong></span>
                        </div>
                      )}
                      {order.customer_phone && (
                        <div className="text-xs text-muted-foreground">
                          📞 {order.customer_phone}
                        </div>
                      )}
                      {order.pickup_address && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-warning" />
                          <span>Recoger en: <strong className="text-foreground">{order.pickup_address}</strong></span>
                        </div>
                      )}
                      {order.delivery_distance_km != null && (
                        <div className="text-xs text-muted-foreground">
                          Distancia: {order.delivery_distance_km.toFixed(1)} km
                        </div>
                      )}
                      {order.courier_earnings != null && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-success/5 p-2">
                            <span className="text-muted-foreground">Ganancia repartidor</span>
                            <p className="font-semibold text-success">{formatCurrency(order.courier_earnings)}</p>
                          </div>
                          <div className="rounded-lg bg-primary/5 p-2">
                            <span className="text-muted-foreground">Ganancia DomiU</span>
                            <p className="font-semibold text-primary">{formatCurrency(order.platform_earnings)}</p>
                          </div>
                        </div>
                      )}
                      {order.special_instructions && (
                        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                          📝 {order.special_instructions}
                        </div>
                      )}
                      {order.delivery_fee > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Tarifa de domicilio: {formatCurrency(order.delivery_fee)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
