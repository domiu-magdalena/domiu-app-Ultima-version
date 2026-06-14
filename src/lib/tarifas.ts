const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBaQOa_K2AFz1v5R3f778DNK-MnVhEMCXY";

export function calcularTarifas(km: number) {
  if (km <= 2) return { precio: 5000, pagoRepartidor: 3800, empresaRecibe: 1200 };
  if (km <= 4) return { precio: 6000, pagoRepartidor: 4500, empresaRecibe: 1500 };
  if (km <= 5) return { precio: 7000, pagoRepartidor: 5200, empresaRecibe: 1800 };
  let precio = km <= 6 ? 8000 : 8000 + Math.ceil((km - 6) / 2) * 2000;
  let er = precio === 8000 ? 2000 : Math.round(precio * 0.4);
  return { precio, pagoRepartidor: precio - er, empresaRecibe: er };
}

export async function geocodificar(dir: string) {
  if (!GMAPS_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(dir)}&key=${GMAPS_KEY}`
    );
    const data = await res.json();
    if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
      return data.results[0].geometry.location as { lat: number; lng: number };
    }
    return null;
  } catch {
    return null;
  }
}

export function haversineKm(origen: { lat: number; lng: number }, destino: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(destino.lat - origen.lat);
  const dLng = toRad(destino.lng - origen.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origen.lat)) *
      Math.cos(toRad(destino.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
