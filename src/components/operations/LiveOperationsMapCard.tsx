'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ExternalLink, MapPinned, RefreshCw } from 'lucide-react';
import { getBrowserClient } from '@/lib/db/supabase';
import {
  OpenStreetLiveMap,
  type OpenStreetMapPoint,
  type OpenStreetSecondaryRoute,
} from '@/components/tracking/maps/OpenStreetLiveMap';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'accepted', 'picked_up', 'in_transit'];

type Scope = 'admin' | 'business';

interface LiveOperationsMapCardProps {
  scope: Scope;
  businessId?: string | null;
  className?: string;
}

interface ActiveOrderRow {
  id: string;
  order_number: string;
  business_id: string;
  courier_id: string | null;
  status: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  businesses?: { name?: string } | null;
}

export function LiveOperationsMapCard({ scope, businessId, className = '' }: LiveOperationsMapCardProps) {
  const [orders, setOrders] = useState<ActiveOrderRow[]>([]);
  const [locations, setLocations] = useState<Record<string, { latitude: number; longitude: number; updated_at: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>();

  const load = useCallback(async (silent = false) => {
    if (scope === 'business' && !businessId) return;
    const supabase = getBrowserClient();
    if (!silent) setRefreshing(true);
    try {
      let orderQuery = supabase
        .from('orders')
        .select('id,order_number,business_id,courier_id,status,pickup_lat,pickup_lng,delivery_lat,delivery_lng,businesses(name)')
        .in('status', ACTIVE_STATUSES)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(scope === 'admin' ? 60 : 30);
      if (businessId) orderQuery = orderQuery.eq('business_id', businessId);
      const { data: orderRows, error: orderError } = await orderQuery;
      if (orderError) throw new Error(orderError.message);
      const normalized = (orderRows ?? []) as unknown as ActiveOrderRow[];
      setOrders(normalized);

      const orderIds = normalized.map((order) => order.id);
      if (orderIds.length === 0) {
        setLocations({});
        setError('');
        return;
      }
      const { data: locationRows, error: locationError } = await supabase
        .from('driver_locations')
        .select('order_id,latitude,longitude,updated_at')
        .in('order_id', orderIds)
        .order('updated_at', { ascending: false });
      if (locationError) throw new Error(locationError.message);
      const next: Record<string, { latitude: number; longitude: number; updated_at: string }> = {};
      for (const row of locationRows ?? []) {
        if (!row.order_id || next[row.order_id]) continue;
        next[row.order_id] = {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          updated_at: String(row.updated_at),
        };
      }
      setLocations(next);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el mapa');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, scope]);

  useEffect(() => {
    void load();
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`dashboard-live-map-${scope}-${businessId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, () => void load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void load(true))
      .subscribe();
    const timer = window.setInterval(() => void load(true), 8000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [businessId, load, scope]);

  const points = useMemo<OpenStreetMapPoint[]>(() => {
    const result: OpenStreetMapPoint[] = [];
    for (const order of orders) {
      const businessName = order.businesses?.name || 'Comercio';
      if (order.pickup_lat != null && order.pickup_lng != null) {
        result.push({
          id: `pickup-${order.id}`,
          lat: Number(order.pickup_lat),
          lng: Number(order.pickup_lng),
          label: `${businessName} · ${order.order_number}`,
          kind: 'business',
          color: '#F59E0B',
        });
      }
      if (order.delivery_lat != null && order.delivery_lng != null) {
        result.push({
          id: `delivery-${order.id}`,
          lat: Number(order.delivery_lat),
          lng: Number(order.delivery_lng),
          label: `Entrega · ${order.order_number}`,
          kind: 'customer',
          color: '#2563EB',
        });
      }
      const location = locations[order.id];
      if (location) {
        result.push({
          id: `courier-${order.id}`,
          lat: location.latitude,
          lng: location.longitude,
          label: `Repartidor · ${order.order_number}`,
          kind: 'courier',
          color: '#16A34A',
        });
      }
    }
    return result;
  }, [locations, orders]);

  const routes = useMemo<OpenStreetSecondaryRoute[]>(() => orders.map((order) => {
    const driver = locations[order.id];
    const picked = ['picked_up', 'in_transit'].includes(order.status);
    const routePoints = [
      driver ? { lat: driver.latitude, lng: driver.longitude } : null,
      !picked && order.pickup_lat != null && order.pickup_lng != null
        ? { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) }
        : null,
      order.delivery_lat != null && order.delivery_lng != null
        ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }
        : null,
    ].filter(Boolean) as Array<{ lat: number; lng: number }>;
    return { id: order.id, points: routePoints, color: selectedOrderId === order.id ? '#111827' : '#94A3B8' };
  }).filter((route) => route.points.length >= 2), [locations, orders, selectedOrderId]);

  const mapHref = scope === 'admin' ? '/admin/mapa' : '/negocio/mapa';
  const movingCount = orders.filter((order) => ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(order.status)).length;

  return (
    <section className={`overflow-hidden rounded-3xl border bg-card shadow-sm ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <div className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" /><h2 className="font-black">Operación en vivo</h2></div>
          <p className="mt-1 text-xs text-muted-foreground">{orders.length} pedidos activos · {movingCount} con repartidor asignado</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={refreshing} className="rounded-xl border p-2 hover:bg-muted disabled:opacity-50" aria-label="Actualizar mapa">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href={mapHref} className="inline-flex items-center gap-1 rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background">Mapa completo <ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>
      </header>

      <div className="relative h-[360px] bg-muted sm:h-[430px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Activity className="mr-2 h-4 w-4 animate-pulse" />Cargando operación…</div>
        ) : points.length > 0 ? (
          <OpenStreetLiveMap
            points={points}
            secondaryRoutes={routes}
            zoom={13}
            className="h-full w-full"
            followPointId={selectedOrderId ? `courier-${selectedOrderId}` : undefined}
            onPointClick={(id) => setSelectedOrderId(id.replace(/^(pickup|delivery|courier)-/, ''))}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center"><MapPinned className="h-9 w-9 text-muted-foreground" /><p className="mt-3 text-sm font-bold">No hay pedidos activos en el mapa</p><p className="mt-1 text-xs text-muted-foreground">La ubicación aparecerá cuando comience una operación.</p></div>
        )}
      </div>
      {error && <p className="border-t border-destructive/20 bg-destructive/10 px-5 py-3 text-xs text-destructive">{error}</p>}
    </section>
  );
}
