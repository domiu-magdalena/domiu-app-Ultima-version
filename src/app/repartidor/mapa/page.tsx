'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, ExternalLink, LocateFixed, MapPin, Navigation, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCourier } from '@/contexts/CourierContext';
import { getBrowserClient } from '@/lib/db/supabase';
import { SkeletonMap } from '@/components/ui/skeleton';
import {
  OpenStreetLiveMap,
  type OpenStreetMapPoint,
  type ResolvedRoute,
} from '@/components/tracking/maps/OpenStreetLiveMap';

type LatLng = { lat: number; lng: number };
type RouteStep = 'to_business' | 'to_customer';

const SANTA_MARTA_CENTER: LatLng = { lat: 11.2408, lng: -74.199 };

function point(lat: number | null | undefined, lng: number | null | undefined): LatLng | null {
  if (lat == null || lng == null) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { lat: latitude, lng: longitude } : null;
}

function haversineKm(a: LatLng, b: LatLng) {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function routeUrl(origin: LatLng, destination: LatLng) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}

export default function CourierMapPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { activeDeliveries, loading, refresh } = useCourier();
  const activeOrder = activeDeliveries[0] ?? null;
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [step, setStep] = useState<RouteStep>('to_business');
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [resolvedRoute, setResolvedRoute] = useState<ResolvedRoute | null>(null);
  const lastWriteRef = useRef(0);

  const pickup = useMemo(
    () => point(activeOrder?.pickup_lat, activeOrder?.pickup_lng),
    [activeOrder?.pickup_lat, activeOrder?.pickup_lng],
  );
  const delivery = useMemo(
    () => point(activeOrder?.delivery_lat, activeOrder?.delivery_lng),
    [activeOrder?.delivery_lat, activeOrder?.delivery_lng],
  );

  useEffect(() => {
    if (!activeOrder) return;
    setStep(activeOrder.status === 'picked_up' || activeOrder.status === 'in_transit' ? 'to_customer' : 'to_business');
  }, [activeOrder?.id, activeOrder?.status]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setLocationError('Este dispositivo no permite compartir la ubicación.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const current = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDriverLocation(current);
        setLocating(false);
        setLocationError('');

        if (!profile?.id || !activeOrder?.id) return;
        const now = Date.now();
        if (now - lastWriteRef.current < 5_000) return;
        lastWriteRef.current = now;

        const supabase = getBrowserClient();
        void supabase
          .from('driver_locations')
          .upsert(
            {
              driver_id: profile.id,
              order_id: activeOrder.id,
              latitude: current.lat,
              longitude: current.lng,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading || 0,
              speed: position.coords.speed || 0,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'driver_id,order_id' },
          )
          .then(({ error }) => {
            if (error) setLocationError(`No se pudo publicar el GPS: ${error.message}`);
          });
      },
      (error) => {
        setLocating(false);
        setLocationError(error.message || 'No se pudo obtener la ubicación del repartidor.');
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeOrder?.id, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`courier-map-order-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, refresh]);

  const handleRouteResolved = useCallback((nextRoute: ResolvedRoute) => {
    setResolvedRoute(nextRoute);
  }, []);

  if (loading) return <SkeletonMap />;

  if (!activeOrder) {
    return (
      <section className="flex min-h-[65vh] items-center justify-center rounded-3xl border border-dashed bg-card p-8 text-center">
        <div>
          <Navigation className="mx-auto h-14 w-14 text-muted-foreground/50" />
          <h1 className="mt-4 text-xl font-bold">Sin pedido activo</h1>
          <p className="mt-2 text-sm text-muted-foreground">Acepta un domicilio para ver la ruta de recogida y entrega.</p>
          <button type="button" onClick={() => router.push('/repartidor/pedidos')} className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Ver pedidos disponibles</button>
        </div>
      </section>
    );
  }

  const origin = driverLocation || pickup || SANTA_MARTA_CENTER;
  const destination = step === 'to_business' ? pickup : delivery;
  const fallbackDistanceKm = destination ? haversineKm(origin, destination) : null;
  const distanceKm = resolvedRoute?.distanceKm ?? fallbackDistanceKm;
  const minutes = resolvedRoute?.durationMinutes ?? (distanceKm == null ? null : Math.max(2, Math.ceil((distanceKm / 25) * 60)));
  const mapPoints: OpenStreetMapPoint[] = [
    ...(pickup ? [{ id: 'pickup', ...pickup, label: `Recoger en ${activeOrder.business_name}`, color: '#F97316', kind: 'pickup' as const }] : []),
    ...(delivery ? [{ id: 'delivery', ...delivery, label: `Entregar a ${activeOrder.customer_name}`, color: '#4F46E5', kind: 'delivery' as const }] : []),
    ...(driverLocation ? [{ id: 'driver', ...driverLocation, label: 'Tu ubicación en tiempo real', color: '#7C3AED', kind: 'courier' as const }] : []),
  ];
  const route = destination ? [origin, destination] : [];

  return (
    <div className="min-h-[calc(100vh-7rem)] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-xl border" aria-label="Volver"><ArrowLeft className="h-5 w-5" /></button>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedido activo</p><h1 className="text-xl font-black">#{activeOrder.order_number}</h1></div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
          <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse text-warning' : driverLocation ? 'text-success' : 'text-destructive'}`} />
          <span className="text-xs font-semibold">{locating ? 'Buscando tu ubicación' : driverLocation ? 'Ubicación activa' : 'Ubicación no disponible'}</span>
        </div>
      </header>

      {locationError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{locationError}</p>}

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <section className="relative min-h-[430px] overflow-hidden rounded-2xl border bg-muted sm:min-h-[520px] sm:rounded-3xl">
          <OpenStreetLiveMap
            points={mapPoints}
            route={route}
            center={origin}
            zoom={15}
            className="absolute inset-0 h-full w-full rounded-none"
            followPointId={driverLocation ? 'driver' : undefined}
            onRouteResolved={handleRouteResolved}
          />
          {distanceKm != null && (
            <div className="absolute right-4 top-14 z-[500] rounded-2xl bg-slate-950/85 px-4 py-3 text-white shadow-xl">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><div><p className="text-sm font-black">{minutes} min</p><p className="text-[11px] text-white/70">{distanceKm.toFixed(2)} km</p></div></div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-2">
            <button type="button" onClick={() => setStep('to_business')} className={`rounded-xl px-3 py-3 text-xs font-bold ${step === 'to_business' ? 'bg-orange-500 text-white' : 'text-muted-foreground hover:bg-muted'}`}><Store className="mx-auto mb-1 h-4 w-4" />1. Recoger</button>
            <button type="button" onClick={() => setStep('to_customer')} disabled={!delivery} className={`rounded-xl px-3 py-3 text-xs font-bold disabled:opacity-40 ${step === 'to_customer' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}><MapPin className="mx-auto mb-1 h-4 w-4" />2. Entregar</button>
          </div>

          <article className="rounded-2xl border bg-card p-5 shadow-sm"><p className="text-[10px] font-bold uppercase text-muted-foreground">Recoger primero</p><h2 className="mt-1 font-black">{activeOrder.business_name}</h2><p className="mt-2 text-sm text-muted-foreground">{activeOrder.pickup_address}</p></article>
          <article className="rounded-2xl border bg-card p-5 shadow-sm"><p className="text-[10px] font-bold uppercase text-muted-foreground">Entregar después</p><h2 className="mt-1 font-black">{activeOrder.customer_name}</h2><p className="mt-2 text-sm text-muted-foreground">{activeOrder.delivery_address}</p></article>

          {destination && (
            <a href={routeUrl(origin, destination)} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-black text-primary-foreground"><ExternalLink className="h-4 w-4" />Abrir navegación paso a paso</a>
          )}
          <button type="button" onClick={() => { toast.info('Abriendo pedidos activos'); router.push('/repartidor/pedidos'); }} className="w-full rounded-xl border bg-card px-4 py-3 text-sm font-bold">Ver información completa del pedido</button>
        </aside>
      </div>
    </div>
  );
}
