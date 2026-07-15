'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bike, MapPin, Package, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { businessService, type BusinessOrder } from '@/services/business';
import { getBrowserClient } from '@/lib/db/supabase';
import { SkeletonList } from '@/components/ui/skeleton';
import {
  OpenStreetLiveMap,
  type OpenStreetMapPoint,
  type OpenStreetSecondaryRoute,
} from '@/components/tracking/maps/OpenStreetLiveMap';

type Coordinates = { lat: number; lng: number };

type MapOrder = BusinessOrder & {
  customerPosition: Coordinates | null;
  courierPosition: Coordinates | null;
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'accepted', 'picked_up', 'in_transit'];
const COURIER_STATUSES = ['assigned', 'accepted', 'picked_up', 'in_transit'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo para salir',
  assigned: 'Repartidor asignado',
  accepted: 'Repartidor confirmado',
  picked_up: 'Recogido',
  in_transit: 'En camino',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-cyan-100 text-cyan-700',
  ready: 'bg-purple-100 text-purple-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  accepted: 'bg-violet-100 text-violet-700',
  picked_up: 'bg-teal-100 text-teal-700',
  in_transit: 'bg-emerald-100 text-emerald-700',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

function validPoint(lat: number | null | undefined, lng: number | null | undefined): Coordinates | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { lat: latitude, lng: longitude } : null;
}

function routeForOrder(order: MapOrder, businessPosition: Coordinates | null) {
  if (!order.customerPosition) return [];
  if (order.status === 'picked_up' || order.status === 'in_transit') {
    const origin = order.courierPosition || businessPosition;
    return origin ? [origin, order.customerPosition] : [];
  }
  if (order.status === 'assigned' || order.status === 'accepted') {
    return order.courierPosition && businessPosition ? [order.courierPosition, businessPosition] : [];
  }
  return businessPosition ? [businessPosition, order.customerPosition] : [];
}

export default function BusinessLiveMapPage() {
  const { profile } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Mi negocio');
  const [businessPosition, setBusinessPosition] = useState<Coordinates | null>(null);
  const [orders, setOrders] = useState<MapOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (showSpinner = false) => {
    if (!profile?.id) return;
    if (showSpinner) setRefreshing(true);
    try {
      const id = businessId || (await businessService.getBusinessId(profile.id));
      if (!id) throw new Error('No se encontró el negocio asociado a esta cuenta');
      if (!businessId) setBusinessId(id);

      const supabase = getBrowserClient();
      const [{ data: businessAddress }, { data: businessRow }, businessOrders] = await Promise.all([
        supabase
          .from('business_addresses')
          .select('latitude,longitude')
          .eq('business_id', id)
          .eq('is_primary', true)
          .is('deleted_at', null)
          .maybeSingle(),
        supabase.from('businesses').select('name').eq('id', id).maybeSingle(),
        businessService.getBusinessOrders(id),
      ]);

      const localBusinessPosition = validPoint(businessAddress?.latitude, businessAddress?.longitude);
      setBusinessPosition(localBusinessPosition);
      setBusinessName(businessRow?.name || 'Mi negocio');

      const active = businessOrders.filter((order) => ACTIVE_STATUSES.includes(order.status));
      const activeOrderIds = active.map((order) => order.id);
      const courierByOrder = new Map<string, Coordinates>();

      if (activeOrderIds.length > 0) {
        const { data: locations } = await supabase
          .from('driver_locations')
          .select('order_id,latitude,longitude,updated_at,created_at')
          .in('order_id', activeOrderIds)
          .order('updated_at', { ascending: false });
        for (const row of locations || []) {
          const orderId = String(row.order_id || '');
          const coordinate = validPoint(row.latitude, row.longitude);
          if (orderId && coordinate && !courierByOrder.has(orderId)) courierByOrder.set(orderId, coordinate);
        }
      }

      const enriched = active.map<MapOrder>((order) => ({
        ...order,
        customerPosition: validPoint(order.delivery_latitude, order.delivery_longitude),
        courierPosition: courierByOrder.get(order.id) || null,
      }));

      setOrders(enriched);
      setSelectedOrderId((current) => {
        if (current && enriched.some((order) => order.id === current)) return current;
        return enriched.find((order) => COURIER_STATUSES.includes(order.status))?.id || enriched[0]?.id || null;
      });
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el mapa operativo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!businessId) return;
    const supabase = getBrowserClient();
    const ordersChannel = supabase
      .channel(`business-live-orders-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, () => void load())
      .subscribe();
    const locationsChannel = supabase
      .channel(`business-live-locations-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, () => void load())
      .subscribe();
    const timer = window.setInterval(() => void load(), 7_000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(ordersChannel);
      void supabase.removeChannel(locationsChannel);
    };
  }, [businessId, load]);

  const selected = orders.find((order) => order.id === selectedOrderId) || null;

  const mapPoints = useMemo<OpenStreetMapPoint[]>(() => {
    const points: OpenStreetMapPoint[] = [];
    if (businessPosition) {
      points.push({ id: 'business', ...businessPosition, label: businessName, color: '#F59E0B', kind: 'business' });
    }
    for (const order of orders) {
      if (order.customerPosition) {
        points.push({
          id: order.id,
          ...order.customerPosition,
          label: `${order.order_number} · ${order.customer_name}`,
          color: selectedOrderId === order.id ? '#2563EB' : '#10B981',
          kind: 'customer',
        });
      }
      if (order.courierPosition) {
        points.push({
          id: `courier-${order.id}`,
          ...order.courierPosition,
          label: `${order.courier_name || 'Repartidor'} · ${order.order_number}`,
          color: '#7C3AED',
          kind: 'courier',
        });
      }
    }
    return points;
  }, [businessName, businessPosition, orders, selectedOrderId]);

  const route = useMemo(
    () => (selected ? routeForOrder(selected, businessPosition) : []),
    [businessPosition, selected],
  );

  const secondaryRoutes = useMemo<OpenStreetSecondaryRoute[]>(
    () =>
      orders
        .filter((order) => order.id !== selectedOrderId)
        .map((order) => ({
          id: order.id,
          points: routeForOrder(order, businessPosition),
          color: order.status === 'in_transit' || order.status === 'picked_up' ? '#10B981' : '#7C3AED',
        }))
        .filter((item) => item.points.length >= 2),
    [businessPosition, orders, selectedOrderId],
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      `${order.order_number} ${order.customer_name} ${order.delivery_address} ${order.courier_name || ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [orders, search]);

  const followPointId = selected?.courierPosition ? `courier-${selected.id}` : selected?.customerPosition ? selected.id : 'business';

  return (
    <div className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border bg-card lg:h-[calc(100vh-7rem)] lg:flex-row">
      <div className="relative min-h-[480px] flex-1">
        <OpenStreetLiveMap
          points={mapPoints}
          route={route}
          secondaryRoutes={secondaryRoutes}
          center={selected?.courierPosition || selected?.customerPosition || businessPosition || { lat: 11.2408, lng: -74.199 }}
          zoom={14}
          className="h-full min-h-[480px] w-full rounded-none"
          followPointId={followPointId}
          onPointClick={(id) => {
            const orderId = id.startsWith('courier-') ? id.replace('courier-', '') : id;
            if (orders.some((order) => order.id === orderId)) setSelectedOrderId(orderId);
          }}
        />

        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="absolute right-3 top-3 z-[500] flex items-center gap-2 rounded-xl bg-background/95 px-3 py-2 text-xs font-medium shadow-lg">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
        </button>
        <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-2">
          <span className="rounded-lg bg-background/95 px-2 py-1 text-[10px] shadow">🏪 Negocio</span>
          <span className="rounded-lg bg-background/95 px-2 py-1 text-[10px] shadow">📍 Clientes</span>
          <span className="rounded-lg bg-background/95 px-2 py-1 text-[10px] shadow">🛵 Repartidores</span>
        </div>
      </div>

      <aside className="w-full border-t lg:w-[390px] lg:border-l lg:border-t-0">
        <div className="border-b p-4">
          <h2 className="font-bold">Operación en vivo</h2>
          <p className="text-xs text-muted-foreground">{orders.length} pedidos pendientes, asignados o en ruta</p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido, cliente o repartidor..." className="h-10 w-full rounded-xl border bg-background pl-10 pr-3 text-sm" />
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>

        <div className="max-h-[520px] overflow-y-auto lg:h-[calc(100%-116px)] lg:max-h-none">
          {loading ? <SkeletonList /> : filteredOrders.length === 0 ? (
            <div className="p-10 text-center"><Package className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Sin pedidos operativos</p></div>
          ) : filteredOrders.map((order) => (
            <button key={order.id} type="button" onClick={() => setSelectedOrderId(order.id)} className={`w-full border-b p-4 text-left transition hover:bg-muted/40 ${selectedOrderId === order.id ? 'bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-sm font-black">#{order.order_number}</p><p className="mt-1 text-sm font-semibold">{order.customer_name}</p></div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_COLORS[order.status] || 'bg-muted'}`}>{STATUS_LABELS[order.status] || order.status}</span>
              </div>
              <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{order.delivery_address}</p>
              {order.courier_name && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary"><Bike className="h-3.5 w-3.5" />{order.courier_name}{order.courierPosition ? ' · GPS activo' : ' · esperando GPS'}</p>}
              <p className="mt-2 text-sm font-black">{formatCurrency(order.total_amount)}</p>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
