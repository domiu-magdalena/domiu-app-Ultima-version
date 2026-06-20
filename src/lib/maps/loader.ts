import { isMapsConfigured } from '@/lib/env';

let mapsPromise: Promise<void> | null = null;
let mapsLoaded = false;
let mapsLoadError: string | null = null;

function getApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

function loadGoogleMapsScript(): Promise<void> {
  if (mapsLoaded) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  const apiKey = getApiKey();
  if (!apiKey) {
    mapsLoadError = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no configurada';
    mapsLoaded = true;
    return Promise.resolve();
  }

  mapsPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      mapsLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => { mapsLoaded = true; resolve(); };
    script.onerror = () => { mapsLoadError = 'Error al cargar Google Maps'; mapsLoaded = true; resolve(); };
    document.head.appendChild(script);
  });

  return mapsPromise;
}

export function loadGoogleMaps(): Promise<void> {
  return loadGoogleMapsScript();
}

export function isMapsLoaded(): boolean {
  return mapsLoaded;
}

export function getMapsLoadError(): string | null {
  return mapsLoadError;
}

export function hasApiKey(): boolean {
  return isMapsConfigured();
}

export function onMapsLoaded(callback: () => void): void {
  if (mapsLoaded) {
    callback();
    return;
  }
  loadGoogleMapsScript().then(() => callback());
}
