import 'server-only';

import { getServiceClient } from '@/lib/db/supabase';

type Coordinates = { lat: number; lng: number };

type RouteResult = {
  distanceKm: number;
  durationMinutes: number;
  polyline: string | null;
  source: 'google_routes' | 'osrm' | 'postgis_direct';
};

type PricingSettings = {
  baseDistanceKm: number;
  baseFee: number;
  extraPerKm: number;
  roundingIncrement: number;
  minimumDurationMinutes: number;
};

export type VerifiedDeliveryQuote = RouteResult & {
  deliveryFee: number;
  pickupAddressId: string;
  pickupAddress: string;
  pickupPlaceId: string | null;
  pickup: Coordinates;
  deliveryAddressId: string;
  deliveryAddress: string;
  deliveryPlaceId: string | null;
  delivery: Coordinates;
};

function asFiniteNumber(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} no es válido`);
  return number;
}

function formatAddress(row: Record<string, unknown>): string {
  const formatted = String(row.formatted_address || '').trim();
  if (formatted) return formatted;
  return [row.street_address, row.city, row.state_province, row.country]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

function haversineKm(origin: Coordinates, destination: Coordinates): number {
  const radius = 6371;
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = (destination.lat * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timeout);
  }
}

function parseGoogleDuration(value: unknown): number | null {
  const match = String(value || '').match(/^([0-9.]+)s$/);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds / 60)) : null;
}

async function resolveGoogleRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_ROUTES_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetchWithTimeout(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          languageCode: 'es-CO',
          units: 'METRIC',
        }),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    const routes = payload.routes as Array<Record<string, unknown>> | undefined;
    const route = routes?.[0];
    const distanceMeters = Number(route?.distanceMeters);
    const durationMinutes = parseGoogleDuration(route?.duration);
    const polyline = (route?.polyline as Record<string, unknown> | undefined)?.encodedPolyline;
    if (!Number.isFinite(distanceMeters) || !durationMinutes) return null;
    return {
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
      durationMinutes,
      polyline: typeof polyline === 'string' ? polyline : null,
      source: 'google_routes',
    };
  } catch {
    return null;
  }
}

async function resolveOsrmRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult | null> {
  try {
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const response = await fetchWithTimeout(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=polyline6&steps=false`,
      { method: 'GET' },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    const routes = payload.routes as Array<Record<string, unknown>> | undefined;
    const route = routes?.[0];
    const distanceMeters = Number(route?.distance);
    const durationSeconds = Number(route?.duration);
    if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) return null;
    return {
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
      durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)),
      polyline: typeof route?.geometry === 'string' ? route.geometry : null,
      source: 'osrm',
    };
  } catch {
    return null;
  }
}

async function resolveRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
  const google = await resolveGoogleRoute(origin, destination);
  if (google) return google;
  const osrm = await resolveOsrmRoute(origin, destination);
  if (osrm) return osrm;
  const distanceKm = Math.round(haversineKm(origin, destination) * 100) / 100;
  return {
    distanceKm,
    durationMinutes: Math.max(5, Math.ceil((distanceKm / 25) * 60)),
    polyline: null,
    source: 'postgis_direct',
  };
}

async function loadPricingSettings(): Promise<PricingSettings> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('delivery_pricing_settings')
    .select('base_distance_km,base_fee,extra_per_km,rounding_increment,minimum_duration_minutes')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    baseDistanceKm: Number(data?.base_distance_km ?? 2),
    baseFee: Number(data?.base_fee ?? 5000),
    extraPerKm: Number(data?.extra_per_km ?? 1200),
    roundingIncrement: Number(data?.rounding_increment ?? 500),
    minimumDurationMinutes: Number(data?.minimum_duration_minutes ?? 5),
  };
}

function calculateFee(distanceKm: number, settings: PricingSettings): number {
  if (distanceKm <= settings.baseDistanceKm) return settings.baseFee;
  const raw = settings.baseFee + (distanceKm - settings.baseDistanceKm) * settings.extraPerKm;
  return Math.ceil(raw / settings.roundingIncrement) * settings.roundingIncrement;
}

export async function getVerifiedDeliveryQuote(
  businessId: string,
  businessAddressId: string,
  deliveryAddressId: string,
  customerId: string,
): Promise<VerifiedDeliveryQuote> {
  const supabase = getServiceClient();
  const [{ data: pickup }, { data: delivery }] = await Promise.all([
    supabase
      .from('business_addresses')
      .select('id,business_id,name,street_address,formatted_address,city,state_province,country,latitude,longitude,place_id,is_active,delivery_available,deleted_at')
      .eq('id', businessAddressId)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .eq('delivery_available', true)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('addresses')
      .select('id,user_id,street_address,formatted_address,city,state_province,country,latitude,longitude,place_id,deleted_at')
      .eq('id', deliveryAddressId)
      .eq('user_id', customerId)
      .is('deleted_at', null)
      .maybeSingle(),
  ]);

  if (!pickup) throw new Error('El local seleccionado no está disponible');
  if (!delivery) throw new Error('La dirección seleccionada no pertenece al cliente');

  const origin = {
    lat: asFiniteNumber(pickup.latitude, 'La latitud del local'),
    lng: asFiniteNumber(pickup.longitude, 'La longitud del local'),
  };
  const destination = {
    lat: asFiniteNumber(delivery.latitude, 'La latitud de entrega'),
    lng: asFiniteNumber(delivery.longitude, 'La longitud de entrega'),
  };

  const [route, settings] = await Promise.all([
    resolveRoute(origin, destination),
    loadPricingSettings(),
  ]);

  return {
    ...route,
    durationMinutes: Math.max(settings.minimumDurationMinutes, route.durationMinutes),
    deliveryFee: calculateFee(route.distanceKm, settings),
    pickupAddressId: String(pickup.id),
    pickupAddress: formatAddress(pickup as Record<string, unknown>),
    pickupPlaceId: pickup.place_id ? String(pickup.place_id) : null,
    pickup: origin,
    deliveryAddressId: String(delivery.id),
    deliveryAddress: formatAddress(delivery as Record<string, unknown>),
    deliveryPlaceId: delivery.place_id ? String(delivery.place_id) : null,
    delivery: destination,
  };
}
