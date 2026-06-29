import {
  isInColombia,
  isValidLatLng,
  normalizeSantaMartaRouteAddress,
  type DomiuLatLng,
} from '@/lib/domiu-location';

export interface RouteDistanceResult {
  originAddress: string;
  destinationAddress: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  distanceKm: number;
  durationMinutes: number;
  calculationSource: 'google_maps' | 'fallback' | 'manual';
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

type GeocodeResult = {
  point: DomiuLatLng;
  formattedAddress: string;
  partialMatch: boolean;
};

const GOOGLE_MAPS_SCRIPT_ID = 'domiu-google-maps-js';
const SANTA_MARTA_BOUNDS = {
  north: 11.35,
  south: 11.05,
  east: -74.05,
  west: -74.32,
};

function hasWindowGoogleMaps() {
  return typeof window !== 'undefined' && !!window.google?.maps;
}


function isSantaMartaPoint(point: DomiuLatLng) {
  return (
    isValidLatLng(point) &&
    isInColombia(point) &&
    point.lat >= SANTA_MARTA_BOUNDS.south &&
    point.lat <= SANTA_MARTA_BOUNDS.north &&
    point.lng >= SANTA_MARTA_BOUNDS.west &&
    point.lng <= SANTA_MARTA_BOUNDS.east
  );
}

function loadGoogleMapsScript(): Promise<void> {
  if (hasWindowGoogleMaps()) return Promise.resolve();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(new Error('Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'));
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Maps')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src =
      'https://maps.googleapis.com/maps/api/js?' +
      new URLSearchParams({
        key: apiKey,
        language: 'es',
        region: 'CO',
        libraries: 'places',
      }).toString();

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));

    document.head.appendChild(script);
  });
}

async function ensureGoogleMapsReady() {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps solo está disponible en el navegador');
  }

  await loadGoogleMapsScript();

  if (!window.google?.maps) {
    throw new Error('Google Maps no quedó disponible');
  }
}

function geocodeAddress(address: string): Promise<GeocodeResult> {
  return new Promise((resolve, reject) => {
    const normalized = normalizeSantaMartaRouteAddress(address);

    if (!normalized) {
      reject(new Error('Dirección vacía'));
      return;
    }

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode(
      {
        address: normalized,
        componentRestrictions: {
          country: 'CO',
          administrativeArea: 'Magdalena',
          locality: 'Santa Marta',
        },
        bounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(SANTA_MARTA_BOUNDS.south, SANTA_MARTA_BOUNDS.west),
          new google.maps.LatLng(SANTA_MARTA_BOUNDS.north, SANTA_MARTA_BOUNDS.east),
        ),
      },
      (results, status) => {
        if (status !== 'OK' || !results?.[0]) {
          reject(new Error(`Google no encontró la dirección: ${normalized}`));
          return;
        }

        const best = results[0];
        const point = {
          lat: best.geometry.location.lat(),
          lng: best.geometry.location.lng(),
        };

        if (!isSantaMartaPoint(point)) {
          reject(new Error(`La dirección encontrada está fuera de Santa Marta: ${best.formatted_address}`));
          return;
        }

        resolve({
          point,
          formattedAddress: best.formatted_address,
          partialMatch: !!best.partial_match,
        });
      },
    );
  });
}

function calculateDrivingDistance(origin: DomiuLatLng, destination: DomiuLatLng): Promise<{
  distanceKm: number;
  durationMinutes: number;
}> {
  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        drivingOptions: {
          departureTime: new Date(),
        },
      },
      (response, status) => {
        if (status !== 'OK') {
          reject(new Error(`Google no pudo calcular distancia: ${status}`));
          return;
        }

        const element = response?.rows?.[0]?.elements?.[0];

        if (!element || element.status !== 'OK' || !element.distance?.value || !element.duration?.value) {
          reject(new Error(`Google no devolvió una ruta válida: ${element?.status || 'sin resultado'}`));
          return;
        }

        resolve({
          distanceKm: Math.round((element.distance.value / 1000) * 100) / 100,
          durationMinutes: Math.ceil(element.duration.value / 60),
        });
      },
    );
  });
}

export async function calculateRouteDistance(
  originAddress: string,
  destinationAddress: string,
  originLat?: number,
  originLng?: number,
  destinationLat?: number,
  destinationLng?: number,
): Promise<RouteDistanceResult> {
  const warnings: string[] = [];

  const safeOriginAddress = normalizeSantaMartaRouteAddress(originAddress);
  const safeDestinationAddress = normalizeSantaMartaRouteAddress(destinationAddress);

  try {
    await ensureGoogleMapsReady();

    let originPoint: DomiuLatLng | null = null;
    let destinationPoint: DomiuLatLng | null = null;

    if (isSantaMartaPoint({ lat: Number(originLat), lng: Number(originLng) })) {
      originPoint = { lat: Number(originLat), lng: Number(originLng) };
    } else {
      const originGeocode = await geocodeAddress(safeOriginAddress);
      originPoint = originGeocode.point;

      if (originGeocode.partialMatch) {
        warnings.push('Google encontró el local parcialmente. Verifica la dirección guardada del local.');
      }
    }

    if (isSantaMartaPoint({ lat: Number(destinationLat), lng: Number(destinationLng) })) {
      destinationPoint = { lat: Number(destinationLat), lng: Number(destinationLng) };
    } else {
      const destinationGeocode = await geocodeAddress(safeDestinationAddress);
      destinationPoint = destinationGeocode.point;

      if (destinationGeocode.partialMatch) {
        warnings.push('Google encontró la dirección del cliente parcialmente. Verifica antes de crear el pedido.');
      }
    }

    if (!originPoint || !destinationPoint) {
      throw new Error('No hay origen o destino válido');
    }

    const route = await calculateDrivingDistance(originPoint, destinationPoint);

    if (!Number.isFinite(route.distanceKm) || route.distanceKm <= 0) {
      throw new Error('Distancia inválida devuelta por Google');
    }

    if (route.distanceKm > 35) {
      throw new Error(`La distancia calculada es demasiado alta: ${route.distanceKm} km`);
    }

    return {
      originAddress: safeOriginAddress,
      destinationAddress: safeDestinationAddress,
      originLat: originPoint.lat,
      originLng: originPoint.lng,
      destinationLat: destinationPoint.lat,
      destinationLng: destinationPoint.lng,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      calculationSource: 'google_maps',
      confidence: warnings.length > 0 ? 'medium' : 'high',
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo calcular la ruta automática';

    return {
      originAddress: safeOriginAddress,
      destinationAddress: safeDestinationAddress,
      distanceKm: 0,
      durationMinutes: 0,
      calculationSource: 'manual',
      confidence: 'low',
      warnings: [
        message,
        'No se generó precio automático porque no hay ruta real validada por Google.',
      ],
    };
  }
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return 'Sin distancia';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
