import { onMapsLoaded } from './loader';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  streetNumber?: string;
  route?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  return new Promise((resolve) => {
    onMapsLoaded(() => {
      if (!window.google?.maps) { resolve(null); return; }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status !== 'OK' || !results?.[0]) { resolve(null); return; }
        const loc = results[0].geometry.location;
        const addr: GeocodingResult = {
          lat: loc.lat(),
          lng: loc.lng(),
          formattedAddress: results[0].formatted_address,
        };
        for (const comp of results[0].address_components || []) {
          if (comp.types.includes('street_number')) addr.streetNumber = comp.long_name;
          if (comp.types.includes('route')) addr.route = comp.long_name;
          if (comp.types.includes('locality')) addr.city = comp.long_name;
          if (comp.types.includes('administrative_area_level_1')) addr.state = comp.long_name;
          if (comp.types.includes('country')) addr.country = comp.long_name;
          if (comp.types.includes('postal_code')) addr.postalCode = comp.long_name;
        }
        resolve(addr);
      });
    });
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  return new Promise((resolve) => {
    onMapsLoaded(() => {
      if (!window.google?.maps) { resolve(null); return; }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status !== 'OK' || !results?.[0]) { resolve(null); return; }
        const loc = results[0].geometry.location;
        const addr: GeocodingResult = {
          lat: loc.lat(),
          lng: loc.lng(),
          formattedAddress: results[0].formatted_address,
        };
        for (const comp of results[0].address_components || []) {
          if (comp.types.includes('locality')) addr.city = comp.long_name;
          if (comp.types.includes('administrative_area_level_1')) addr.state = comp.long_name;
          if (comp.types.includes('country')) addr.country = comp.long_name;
          if (comp.types.includes('postal_code')) addr.postalCode = comp.long_name;
        }
        resolve(addr);
      });
    });
  });
}
