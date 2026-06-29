'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapsProvider } from '@/contexts/MapsContext';
import dynamic from 'next/dynamic';
import { trackingService } from '@/services/tracking';
import { orderService } from '@/services/orders';
import { SkeletonMap } from '@/components/ui/skeleton';
import type { OrderData } from '@/services/orders';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Store,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';

const DynamicMapWrapper = dynamic(
  () => import('@/components/tracking/maps/DynamicMapWrapper').then(m => ({ default: m.DynamicMapWrapper })),
  {
    ssr: false,
    loading: () => <SkeletonMap className="h-[400px]" />,
  },
);

type LatLng = { lat: number; lng: number };

interface ActiveDelivery {
  orderId: string;
  orderNumber: string;
  businessName: string;
  customerName: string;
  status: string;
  businessLoc: LatLng;
  customerLoc: LatLng;
}

const DEFAULT_DRIVER_LOCATION: LatLng = { lat: 11.240, lng: -74.211 };

function isValidLocation(loc: LatLng | null | undefined): loc is LatLng {
  return !!loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
}

function buildGoogleMapsRouteUrl(origin: LatLng, destination: LatLng) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}

const SANTA_MARTA_CENTER = { lat: 11.2408, lng: -74.1990 };

function isValidMapPoint(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== 'object') return false;

  const point = value as { lat?: unknown; lng?: unknown };

  return (
    typeof point.lat === 'number' &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

function toMapPoint(
  value: unknown,
  fallback: { lat: number; lng: number } = SANTA_MARTA_CENTER,
): { lat: number; lng: number } {
  return isValidMapPoint(value) ? value : fallback;
}

function CourierMapContent() {
  const { profile } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [driverLoc, setDriverLoc] = useState<LatLng | null>(null);
  const [eta, setEta] = useState<{ text: string; distance: string } | null>(null);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [step, setStep] = useState<'to_business' | 'to_customer'>('to_business');

  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!profile?.id) return;

    let mounted = true;

    orderService.getCourierOrders(profile.id).then(data => {
      if (!mounted) return;
      setOrders(data);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      position => {
        setDriverLoc({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setDriverLoc(DEFAULT_DRIVER_LOCATION);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  }, []);

  const activeOrder = orders.find((o: OrderData) =>
    ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(o.status),
  );

  useEffect(() => {
    if (!activeOrder || !profile?.id) return;

    let mounted = true;

    const loadLocations = async () => {
      const bizLoc = await trackingService.getBusinessLocation(activeOrder.business_id);
      const custLoc = await trackingService.getCustomerLocation(activeOrder.customer_id);

      const safeBizLoc = toMapPoint(bizLoc, SANTA_MARTA_CENTER);
      const safeCustLoc = toMapPoint(custLoc, safeBizLoc);

      if (!mounted) return;

      setActiveDelivery({
        orderId: activeOrder.id,
        orderNumber: activeOrder.order_number,
        businessName: activeOrder.business_name,
        customerName: activeOrder.customer_name,
        status: activeOrder.status,
        businessLoc: safeBizLoc,
        customerLoc: safeCustLoc,
      });

      if (activeOrder.status === 'picked_up' || activeOrder.status === 'in_transit') {
        setStep('to_customer');
      } else {
        setStep('to_business');
      }
    };

    loadLocations();

    return () => {
      mounted = false;
    };
  }, [activeOrder, profile?.id]);

  useEffect(() => {
    if (!map || !activeDelivery || !window.google?.maps) return;

    let disposed = false;

    if (directionsRef.current) {
      directionsRef.current.setMap(null);
      directionsRef.current = null;
    }

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const origin = step === 'to_business'
      ? (driverLoc || DEFAULT_DRIVER_LOCATION)
      : activeDelivery.businessLoc;

    const destination = step === 'to_business'
      ? activeDelivery.businessLoc
      : activeDelivery.customerLoc;

    if (!isValidLocation(origin) || !isValidLocation(destination)) {
      window.setTimeout(() => {
        setEta(null);
        setDirectionsError('No hay coordenadas suficientes para calcular la ruta.');
      }, 0);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    map.fitBounds(bounds);

    const originMarker = new google.maps.Marker({
      position: origin,
      map,
      title: step === 'to_business' ? 'Tu ubicación' : 'Negocio',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#6366F1',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      },
    });

    const destinationMarker = new google.maps.Marker({
      position: destination,
      map,
      title: step === 'to_business' ? 'Negocio' : 'Cliente',
    });

    markersRef.current = [originMarker, destinationMarker];

    if (!google.maps.DirectionsService || !google.maps.DirectionsRenderer) {
      window.setTimeout(() => {
        setEta(null);
        setDirectionsError('Google Maps no permitió cargar el servicio de rutas. Puedes abrir la ruta externa.');
      }, 0);
      return () => {
        originMarker.setMap(null);
        destinationMarker.setMap(null);
      };
    }

    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: step === 'to_business' ? '#F97316' : '#6366F1',
        strokeWeight: 6,
        strokeOpacity: 0.9,
      },
    });

    const service = new google.maps.DirectionsService();

    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date() },
      },
      (result, status) => {
        if (disposed) return;

        if (status === 'OK' && result) {
          renderer.setDirections(result);
          directionsRef.current = renderer;

          const leg = result.routes?.[0]?.legs?.[0];
          setEta({
            text: leg?.duration?.text || '',
            distance: leg?.distance?.text || '',
          });
          setDirectionsError(null);
          return;
        }

        renderer.setMap(null);
        setEta(null);
        setDirectionsError(
          'No se pudo calcular la ruta dentro de la app. Abre la navegación externa en Google Maps.',
        );

        console.warn('[CourierMap] Directions request failed:', status);
      },
    );

    return () => {
      disposed = true;
      renderer.setMap(null);
      originMarker.setMap(null);
      destinationMarker.setMap(null);
    };
  }, [map, activeDelivery, step, driverLoc]);

  if (loading) return <SkeletonMap />;

  if (!activeOrder || !activeDelivery) {
    return (
      <div className="min-h-screen bg-background pb-16 lg:pb-0">
        <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="ml-3 text-base font-bold text-foreground">Mapa de Navegación</h1>
          </div>
        </div>

        <div className="flex h-[60vh] items-center justify-center">
          <div className="p-8 text-center">
            <Navigation className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sin pedido activo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Acepta un pedido para ver la ruta de navegación.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentOrigin = step === 'to_business'
    ? (driverLoc || DEFAULT_DRIVER_LOCATION)
    : activeDelivery.businessLoc;

  const currentDestination = step === 'to_business'
    ? activeDelivery.businessLoc
    : activeDelivery.customerLoc;

  const externalRouteUrl = isValidLocation(currentOrigin) && isValidLocation(currentDestination)
    ? buildGoogleMapsRouteUrl(currentOrigin, currentDestination)
    : '';

  const openExternalRoute = () => {
    if (!externalRouteUrl) {
      toast.error('Ubicación no disponible');
      return;
    }

    window.open(externalRouteUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-foreground">{activeOrder.order_number}</h1>
            <p className="text-[10px] text-muted-foreground">
              {activeDelivery.businessName} → {activeDelivery.customerName}
            </p>
          </div>

          {eta && (
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{eta.text}</p>
              <p className="text-[10px] text-muted-foreground">{eta.distance}</p>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-[calc(100vh-120px)]">
        <DynamicMapWrapper
          config={{
            center: toMapPoint(activeDelivery.businessLoc, SANTA_MARTA_CENTER),
            zoom: 14,
            options: {
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            },
          }}
          className="h-full w-full"
          onLoad={setMap}
        >
          {() => null}
        </DynamicMapWrapper>

        <div className="absolute bottom-6 left-4 right-4 space-y-3">
          {directionsError && (
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/95 p-4 text-white shadow-xl">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Ruta interna no disponible</p>
                  <p className="mt-1 text-xs text-white/90">{directionsError}</p>
                  <button
                    onClick={openExternalRoute}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-orange-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir ruta en Google Maps
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep('to_business')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold transition-all ${
                step === 'to_business'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-card/90 text-muted-foreground backdrop-blur-sm'
              }`}
            >
              <Store className="h-4 w-4" /> Al negocio
            </button>

            <button
              onClick={() => setStep('to_customer')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold transition-all ${
                step === 'to_customer'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-card/90 text-muted-foreground backdrop-blur-sm'
              }`}
            >
              <MapPin className="h-4 w-4" /> Al cliente
            </button>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/95 p-4 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <Truck className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {step === 'to_business' ? activeDelivery.businessName : activeDelivery.customerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step === 'to_business' ? 'Recoger pedido' : 'Entregar pedido'}
                </p>
              </div>

              {eta && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{eta.text}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-1">
              <button
                onClick={openExternalRoute}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground"
              >
                <Navigation className="h-3.5 w-3.5" />
                Abrir navegación externa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CourierMapPage() {
  return (
    <MapsProvider>
      <CourierMapContent />
    </MapsProvider>
  );
}

