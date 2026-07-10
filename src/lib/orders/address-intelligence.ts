import { parseWhatsAppOrderStrict, validateManualDeliveryAddress } from '@/lib/manual-order-safety';
import { findZoneByText } from './delivery-zones';
import { isValidLatLng } from '@/lib/domiu-location';

export type AddressResolutionSource =
  | 'google_maps_link'
  | 'exact_address'
  | 'google_places'
  | 'known_place'
  | 'neighborhood_zone'
  | 'manual_review';

export type AddressConfidence = 'exact' | 'high' | 'medium' | 'zone' | 'needs_review';

export interface DeliveryAddressResolution {
  rawText: string;
  customerName?: string;
  phones: string[];
  mainPhone?: string;
  addressText?: string;
  neighborhood?: string | null;
  reference?: string | null;
  productDetails?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  source: AddressResolutionSource;
  confidence: AddressConfidence;
  warnings: string[];
  requiresConfirmation: boolean;
  zoneName?: string | null;
}

function extractGoogleMapsCoordinates(text: string): { lat?: number; lng?: number; url?: string } | null {
  if (!text) return null;
  // Common patterns: @lat,lng or /@lat,lng or ?ll=lat,lng or q=lat,lng
  const urlMatch = text.match(/https?:\/\/[^\s]+maps[^\s]+/i);
  const url = urlMatch?.[0];
  if (!url) return null;

  // Try to find @lat,lng pattern
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]), url };

  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]), url };

  const llMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) return { lat: Number(llMatch[1]), lng: Number(llMatch[2]), url };

  return { url };
}

function extractPhoneNumbers(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/\s+/g, ' ');
  const matches = Array.from(cleaned.matchAll(/(?:\+?57\s*)?(3\d{9})/g));
  return matches.map(m => m[1]);
}

function extractCustomerName(raw: string): string | undefined {
  try {
    const parsed = parseWhatsAppOrderStrict(raw);
    return parsed.customerName || undefined;
  } catch {
    return undefined;
  }
}

function extractAddressCandidates(raw: string): { address?: string; neighborhood?: string | null; rawDetected?: string | null } {
  try {
    const parsed = parseWhatsAppOrderStrict(raw);
    return { address: parsed.address || undefined, neighborhood: parsed.neighborhood || null, rawDetected: parsed.address || null };
  } catch {
    return {};
  }
}

function extractProductDetails(raw: string): string | null {
  try {
    const parsed = parseWhatsAppOrderStrict(raw);
    return parsed.orderNotes || null;
  } catch {
    return null;
  }
}

function classifyAddressConfidence(res: Partial<DeliveryAddressResolution>): AddressConfidence {
  if (res.latitude && res.longitude) return 'exact';
  if (res.source === 'exact_address') return res.formattedAddress ? 'high' : 'medium';
  if (res.source === 'known_place') return 'medium';
  if (res.source === 'neighborhood_zone') return 'zone';
  return 'needs_review';
}

export function parseWhatsappOrderText(text: string): DeliveryAddressResolution[] {
  if (!text) return [];
  // Split into blocks separated by blank lines — heuristic for multiple orders in one message
  const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const results: DeliveryAddressResolution[] = [];

  for (const block of blocks) {
    const phones = extractPhoneNumbers(block);
    const google = extractGoogleMapsCoordinates(block);
    const name = extractCustomerName(block);
    const addrCand = extractAddressCandidates(block);
    const productDetails = extractProductDetails(block);

    let source: AddressResolutionSource = 'manual_review';
    let lat: number | null = null;
    let lng: number | null = null;
    let formattedAddress: string | null = addrCand.address || null;
    let requiresConfirmation = false;
    const warnings: string[] = [];
    let zoneName: string | null = null;

    if (google && google.lat && google.lng) {
      source = 'google_maps_link';
      lat = google.lat;
      lng = google.lng;
      formattedAddress = formattedAddress || null;
    } else if (addrCand.address && /\b(calle|cl|cra|carrera|cr|av|avenida|manzana|mz|casa|cs|apto|apartamento|edificio|clinica|clínica|urbanizaci|urb|barrio)\b/i.test(addrCand.address)) {
      source = 'exact_address';
      // Will require geocoding to get lat/lng — we leave lat/lng null but formattedAddress normalized
      formattedAddress = addrCand.address ? addrCand.address : formattedAddress;
    } else {
      // try detect known zone or place
      const z = findZoneByText(block + ' ' + (addrCand.address || ''));
      if (z) {
        source = 'neighborhood_zone';
        zoneName = z.name;
        requiresConfirmation = true;
        warnings.push('Dirección solamente definida por zona/barrio. Tarifa por zona aplicable.');
      } else {
        // check for known place names
        const knownPlaces = ['Porto Bellagio', 'Clínica Gestión Salud', 'El Portal', 'Mallorca', 'Villa Marbella'];
        const lower = block.toLowerCase();
        for (const kp of knownPlaces) {
          if (lower.includes(kp.toLowerCase())) {
            source = 'known_place';
            formattedAddress = kp;
            break;
          }
        }
      }
    }

    const confidence = classifyAddressConfidence({ latitude: lat ?? undefined, longitude: lng ?? undefined, source: source as AddressResolutionSource, formattedAddress });

    results.push({
      rawText: block,
      customerName: name,
      phones,
      mainPhone: phones?.[0],
      addressText: addrCand.address || undefined,
      neighborhood: addrCand.neighborhood ?? null,
      reference: null,
      productDetails: productDetails || null,
      googleMapsUrl: google?.url || null,
      latitude: lat ?? null,
      longitude: lng ?? null,
      formattedAddress: formattedAddress ?? null,
      source,
      confidence,
      warnings,
      requiresConfirmation,
      zoneName,
    });
  }

  return results;
}

export async function resolveDeliveryAddress(input: DeliveryAddressResolution): Promise<DeliveryAddressResolution> {
  // This function enriches the resolution: if source is exact_address or known_place
  // it signals that geocoding via Google Maps is recommended. It does not call
  // external APIs directly to avoid exposing keys here; caller (UI) should perform
  // `calculateRouteDistance` or geocoding in the browser where NEXT_PUBLIC key is used.

  const out = { ...input };

  // If googleMapsUrl contains coords make sure we parse them
  if (input.googleMapsUrl && (!input.latitude || !input.longitude)) {
    const geo = extractGoogleMapsCoordinates(input.googleMapsUrl);
    if (geo?.lat && geo?.lng) {
      out.latitude = geo.lat;
      out.longitude = geo.lng;
      out.source = 'google_maps_link';
      out.confidence = 'exact';
    }
  }

  // If only neighborhood/zone is known
  if (out.source === 'neighborhood_zone') {
    out.requiresConfirmation = true;
    out.confidence = 'zone';
  }

  // Validate lat/lng shapes
  if (out.latitude && out.longitude && !isValidLatLng({ lat: out.latitude, lng: out.longitude })) {
    out.warnings = [...(out.warnings || []), 'Coordenadas detectadas no son válidas.'];
    out.latitude = null;
    out.longitude = null;
    out.confidence = 'needs_review';
  }

  // If source is exact_address we recommend geocoding and set confidence medium until geocoded
  if (out.source === 'exact_address' && (!out.latitude || !out.longitude)) {
    out.confidence = out.formattedAddress ? 'medium' : 'needs_review';
    out.requiresConfirmation = true;
  }

  return out;
}

export { extractGoogleMapsCoordinates, extractPhoneNumbers, extractCustomerName, extractAddressCandidates, extractProductDetails, classifyAddressConfidence };
