'use client';

import { loadGoogleMaps } from '@/lib/maps/loader';

export interface ExactLocation {
  lat: number;
  lng: number;
  accuracy: number;
  formattedAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

function extractAddress(result: google.maps.GeocoderResult) {
  let city = '';
  let state = '';
  let country = 'Colombia';
  let postalCode = '';

  for (const component of result.address_components || []) {
    if (component.types.includes('locality')) city = component.long_name;
    if (!city && component.types.includes('administrative_area_level_2')) city = component.long_name;
    if (component.types.includes('administrative_area_level_1')) state = component.long_name;
    if (component.types.includes('country')) country = component.long_name;
    if (component.types.includes('postal_code')) postalCode = component.long_name;
  }

  return { city, state, country, postalCode };
}

export function requestCurrentCoordinates(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo no permite compartir la ubicación.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    });
  });
}

function coordinateFallback(lat: number, lng: number, accuracy: number): ExactLocation {
  return {
    lat,
    lng,
    accuracy,
    formattedAddress: `Ubicación GPS ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    city: 'Santa Marta',
    state: 'Magdalena',
    country: 'Colombia',
    postalCode: '',
  };
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
  accuracy = 0,
): Promise<ExactLocation> {
  try {
    await loadGoogleMaps();
    if (!window.google?.maps) return coordinateFallback(lat, lng, accuracy);

    const geocoder = new google.maps.Geocoder();
    const results = await geocoder.geocode({ location: { lat, lng } });
    const best = results.results?.[0];
    if (!best) return coordinateFallback(lat, lng, accuracy);

    const parts = extractAddress(best);
    return {
      lat,
      lng,
      accuracy,
      formattedAddress: best.formatted_address,
      city: parts.city || 'Santa Marta',
      state: parts.state || 'Magdalena',
      country: parts.country,
      postalCode: parts.postalCode,
    };
  } catch {
    // La coordenada GPS sigue siendo válida para tarifa y seguimiento aunque
    // Google no pueda devolver el nombre de la calle en ese momento.
    return coordinateFallback(lat, lng, accuracy);
  }
}

export async function getCurrentExactLocation(): Promise<ExactLocation> {
  const position = await requestCurrentCoordinates();
  return reverseGeocodeCoordinates(
    position.coords.latitude,
    position.coords.longitude,
    position.coords.accuracy,
  );
}
