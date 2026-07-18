'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, MapPin, Navigation, Radio, Route } from 'lucide-react';
import { getBrowserClient } from '@/lib/db/supabase';
import {
  OpenStreetLiveMap,
  type OpenStreetMapPoint,
  type ResolvedRoute,
} from '@/components/tracking/maps/OpenStreetLiveMap';

type Point = { lat: number; lng: number };

interface CustomerOrderLiveMapProps {
  orderId: string;
  courierId: string | null;
  status: string;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  storedDistanceKm?: number | null;
  storedDurationMinutes?: number | null;
  estimatedDeliveryTime?: string | null;
}

const SANTA_MARTA: Point = { lat: 11.2408, lng: -74.199 };

function point(lat: number | null, lng: number | null): Point | null {
  if (lat == null || lng == null) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { lat: latitude, lng: longitude }
    : null;
}

function haversineKm(a: Point, b: Point) {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function statusTitle(status: string, hasCourier: boolean) {
  if (status === 'delivered') return 'Tu pedido fue entregado';
  if (status === 'cancelled') return 'El pedido fue cancelado';
  if (status === 'in_transit' || status === 'picked_up') return 'Tu pedido va hacia ti';
  if (status === 'assigned' || status === 'accepted') return 'El repartidor va al establecimiento';
  if (status === 'ready') return 'Buscando un repartidor disponible';
  if (status === 'preparing') return 'El negocio está preparando tu pedido';
  if (status === 'confirmed') return 'El negocio confirmó tu pedido';
  return hasCourier ? 'Repartidor asignado' : 'Pedido recibido';
}

export function CustomerOrderLiveMap({
  orderId,
  courierId,
  status,
  pickupAddress,
  pickupLat,
  pickupLng,
  deliveryAddress,
  deliveryLat,
  deliveryLng,
  storedDistanceKm,
  storedDurationMinutes,
  estimatedDeliveryTime,
}: CustomerOrderLiveMapProps) {
  const [courierLocation, setCourierLocation] = useState<Point | null>(null);
  const [resolvedRoute, setResolvedRoute] = useState<ResolvedRoute | null>(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const pickup = useMemo(() => point(pickupLat, pickupLng), [pickupLat, pickupLng]);
  const delivery = useMemo(() => point(deliveryLat, deliveryLng), [deliveryLat, deliveryLng]);
  const goingToCustomer = status === 'picked_up' || status === 'in_transit';
  const destinationPoint = goingToCustomer ? delivery : pickup;
  const originPoint = courierLocation || (goingToCustomer ? pickup : null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setResolvedRoute(null);
  }, [destinationPoint?.lat, destinationPoint?.lng, goingToCustomer]);

  useEffect(() => {
    if (!courierId || ['delivered', 'cancelled'].includes(status)) {
      if (!courierId) {
        setCourierLocation(null);
        setLocationUpdatedAt(null);
      }
      return;
    }
    const supabase = getBrowserClient();

    const loadLatest = async () => {
      const { data } = await supabase
        .from('driver_locations')
        .select('latitude,longitude,updated_at,created_at')
        .eq('driver_id', courierId)
        .eq('order_id', orderId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.latitude != null && data?.longitude != null) {
        setCourierLocation({ lat: Number(data.latitude), lng: Number(data.longitude) });
        setLocationUpdatedAt(String(data.updated_at || data.created_at));
      }
    };

    void loadLatest();
    const channel = supabase
      .channel(`customer-order-location-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.latitude != null && row.longitude != null) {
            setCourierLocation({ lat: Number(row.latitude), lng: Number(row.longitude) });
            setLocationUpdatedAt(
              String(row.updated_at || row.created_at || new Date().toISOString()),
            );
          }
        },
      )
      .subscribe();

    const polling = window.setInterval(() => void loadLatest(), 7_000);
    return () => {
      window.clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [courierId, orderId, status]);

  const gpsAgeSeconds = locationUpdatedAt
    ? Math.max(0, Math.floor((now - new Date(locationUpdatedAt).getTime()) / 1000))
    : null;
  const gpsStale = gpsAgeSeconds != null && gpsAgeSeconds > 45;

  const mapPoints = useMemo<OpenStreetMapPoint[]>(
    () => [
      ...(pickup
        ? [
            {
              id: 'pickup',
              ...pickup,
              label: `Recogida: ${pickupAddress}`,
              color: '#F97316',
              kind: 'pickup' as const,
            },
          ]
        : []),
      ...(delivery
        ? [
            {
              id: 'delivery',
              ...delivery,
              label: `Entrega: ${deliveryAddress}`,
              color: '#4F46E5',
              kind: 'delivery' as const,
            },
          ]
        : []),
      ...(courierLocation
        ? [
            {
              id: 'courier',
              ...courierLocation,
              label: gpsStale ? 'Última ubicación conocida del repartidor' : 'Tu pedido se mueve aquí',
              color: gpsStale ? '#64748B' : '#7C3AED',
              kind: 'courier' as const,
            },
          ]
        : []),
    ],
    [courierLocation, delivery, deliveryAddress, gpsStale, pickup, pickupAddress],
  );

  const liveRoute = useMemo(
    () => (originPoint && destinationPoint ? [originPoint, destinationPoint] : []),
    [destinationPoint, originPoint],
  );

  const handleRouteResolved = useCallback((nextRoute: ResolvedRoute) => {
    setResolvedRoute(nextRoute);
  }, []);

  const fallbackDistance =
    originPoint && destinationPoint
      ? haversineKm(originPoint, destinationPoint)
      : storedDistanceKm ?? null;
  const distanceKm = resolvedRoute?.distanceKm ?? fallbackDistance;
  const routeMinutes = resolvedRoute?.durationMinutes;
  const distanceBasedDuration =
    distanceKm == null ? null : Math.max(2, Math.ceil((distanceKm / 25) * 60));
  const storedEtaMinutes = estimatedDeliveryTime
    ? Math.max(0, Math.ceil((new Date(estimatedDeliveryTime).getTime() - now) / 60_000))
    : null;
  const durationMinutes =
    routeMinutes ?? distanceBasedDuration ?? storedDurationMinutes ?? storedEtaMinutes;

  const progress = useMemo(() => {
    if (status === 'delivered') return 100;
    if (!goingToCustomer || !distanceKm || !storedDistanceKm || storedDistanceKm <= 0) return null;
    return Math.max(3, Math.min(98, Math.round((1 - distanceKm / storedDistanceKm) * 100)));
  }, [distanceKm, goingToCustomer, status, storedDistanceKm]);

  const hasExactRoute = Boolean(pickup && delivery);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm sm:rounded-3xl">
      <div className="border-b p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Seguimiento en vivo</p>
            <h2 className="mt-1 text-lg font-black">{statusTitle(status, Boolean(courierId))}</h2>
          </div>
          {courierLocation && !gpsStale && (
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> GPS en vivo
            </span>
          )}
          {courierLocation && gpsStale && (
            <span className="flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> GPS sin actualizar
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/60 p-2.5 sm:p-3">
            <Route className="h-4 w-4 text-primary" />
            <p className="mt-1 truncate text-sm font-black">{distanceKm != null ? `${distanceKm.toFixed(2)} km` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">Restante</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-2.5 sm:p-3">
            <Clock3 className="h-4 w-4 text-primary" />
            <p className="mt-1 text-sm font-black">{durationMinutes != null ? `${durationMinutes} min` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">Estimado</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-2.5 sm:p-3">
            <Navigation className="h-4 w-4 text-primary" />
            <p className="mt-1 truncate text-sm font-black">
              {status === 'delivered' ? 'Entregado' : goingToCustomer ? 'Entrega' : courierId ? 'Recogida' : 'Asignando'}
            </p>
            <p className="text-[10px] text-muted-foreground">Etapa</p>
          </div>
        </div>

        {progress != null && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
              <span>Progreso aproximado hacia tu dirección</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="relative h-[350px] bg-muted sm:h-[440px]">
        <OpenStreetLiveMap
          points={mapPoints}
          route={liveRoute}
          center={courierLocation || pickup || delivery || SANTA_MARTA}
          zoom={15}
          className="absolute inset-0 h-full w-full rounded-none"
          followPointId={courierLocation ? 'courier' : undefined}
          onRouteResolved={handleRouteResolved}
        />
        {!hasExactRoute && (
          <div className="absolute bottom-3 left-3 right-3 z-[500] rounded-xl bg-background/95 p-3 text-xs font-semibold text-warning shadow-lg">
            La ruta aparecerá cuando el origen y el destino tengan coordenadas exactas.
          </div>
        )}
      </div>

      <div className="grid gap-3 border-t p-4 sm:grid-cols-2">
        <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" /><div><p className="text-[10px] font-bold uppercase text-muted-foreground">Recogida</p><p className="text-xs font-semibold">{pickupAddress}</p></div></div>
        <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /><div><p className="text-[10px] font-bold uppercase text-muted-foreground">Entrega</p><p className="text-xs font-semibold">{deliveryAddress}</p></div></div>
      </div>

      {locationUpdatedAt && (
        <p className={`border-t px-4 py-2 text-[10px] ${gpsStale ? 'text-warning' : 'text-muted-foreground'}`}>
          Última ubicación: {new Date(locationUpdatedAt).toLocaleTimeString('es-CO')}
          {gpsAgeSeconds != null ? ` · hace ${gpsAgeSeconds} s` : ''}
        </p>
      )}
    </section>
  );
}
