export type DomiuLatLng = {
  lat: number;
  lng: number;
};

export const SANTA_MARTA_CENTER: DomiuLatLng = {
  lat: 11.2408,
  lng: -74.1990,
};

export function isValidLatLng(value: unknown): value is DomiuLatLng {
  const v = value as DomiuLatLng | null | undefined;

  return (
    !!v &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng) &&
    Math.abs(v.lat) <= 90 &&
    Math.abs(v.lng) <= 180
  );
}

export function isInColombia(value: unknown): boolean {
  if (!isValidLatLng(value)) return false;

  return (
    value.lat >= -4.5 &&
    value.lat <= 13.8 &&
    value.lng >= -82.5 &&
    value.lng <= -66.0
  );
}

export function normalizeSantaMartaRouteAddress(address: string): string {
  const clean = String(address || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return '';

  const parts = [clean];

  if (!/santa\s*marta/i.test(clean)) parts.push('Santa Marta');
  if (!/magdalena/i.test(clean)) parts.push('Magdalena');
  if (!/colombia/i.test(clean)) parts.push('Colombia');

  return parts.join(', ');
}

export function safeMapCenter(...candidates: Array<unknown>): DomiuLatLng {
  for (const candidate of candidates) {
    if (isValidLatLng(candidate) && isInColombia(candidate)) {
      return candidate;
    }
  }

  return SANTA_MARTA_CENTER;
}

export function routePointToGoogleValue(point?: unknown, address?: string): string {
  if (isValidLatLng(point) && isInColombia(point)) {
    return `${point.lat},${point.lng}`;
  }

  return normalizeSantaMartaRouteAddress(address || '');
}

export function buildDomiuGoogleMapsRouteUrl(input: {
  origin?: unknown;
  originAddress?: string;
  destination?: unknown;
  destinationAddress?: string;
}) {
  const origin = routePointToGoogleValue(input.origin, input.originAddress);
  const destination = routePointToGoogleValue(input.destination, input.destinationAddress);

  if (!origin || !destination) return '';

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
