'use client';

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

export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
  accuracy = 0,
): Promise<ExactLocation> {
  if (!window.google?.maps) {
    throw new Error('Google Maps todavía no está disponible. Intenta nuevamente.');
  }

  const geocoder = new google.maps.Geocoder();
  const results = await geocoder.geocode({ location: { lat, lng } });
  const best = results.results?.[0];
  if (!best) throw new Error('No se pudo identificar la dirección de esta ubicación.');

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
}

export async function getCurrentExactLocation(): Promise<ExactLocation> {
  const position = await requestCurrentCoordinates();
  return reverseGeocodeCoordinates(
    position.coords.latitude,
    position.coords.longitude,
    position.coords.accuracy,
  );
}
