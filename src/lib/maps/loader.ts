import { isMapsConfigured } from '@/lib/env';

let mapsPromise: Promise<void> | null = null;
let mapsLoadError: string | null = null;

const SCRIPT_ID = 'domiu-google-maps-script';
const CALLBACK_NAME = '__domiuGoogleMapsReady';
const LOAD_TIMEOUT_MS = 20_000;

type MapsWindow = Window & {
  [CALLBACK_NAME]?: () => void;
};

function getApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

function isGoogleMapsReady(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.maps);
}

function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps solo puede cargarse en el navegador'));
  }

  if (isGoogleMapsReady()) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  const apiKey = getApiKey();
  if (!apiKey) {
    mapsLoadError = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no configurada';
    return Promise.reject(new Error(mapsLoadError));
  }

  mapsPromise = new Promise<void>((resolve, reject) => {
    const mapsWindow = window as MapsWindow;
    let settled = false;
    let pollingId: number | undefined;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      if (pollingId) window.clearInterval(pollingId);
      delete mapsWindow[CALLBACK_NAME];
    };

    const succeed = () => {
      if (settled || !isGoogleMapsReady()) return;
      settled = true;
      mapsLoadError = null;
      cleanup();
      resolve();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      mapsLoadError = message;
      mapsPromise = null;
      cleanup();
      reject(new Error(message));
    };

    const timeoutId = window.setTimeout(
      () => fail('Google Maps tardó demasiado en responder. Revisa la API key, facturación y restricciones del dominio.'),
      LOAD_TIMEOUT_MS,
    );

    mapsWindow[CALLBACK_NAME] = succeed;
    pollingId = window.setInterval(succeed, 150);

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', succeed, { once: true });
      existing.addEventListener('error', () => fail('No se pudo descargar Google Maps'), { once: true });
      succeed();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&v=weekly&loading=async&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('error', () => fail('No se pudo descargar Google Maps'), { once: true });
    document.head.appendChild(script);
  });

  return mapsPromise;
}

export function loadGoogleMaps(): Promise<void> {
  return loadGoogleMapsScript();
}

export function isMapsLoaded(): boolean {
  return isGoogleMapsReady();
}

export function getMapsLoadError(): string | null {
  return mapsLoadError;
}

export function hasApiKey(): boolean {
  return isMapsConfigured();
}

export function onMapsLoaded(callback: () => void): void {
  if (isGoogleMapsReady()) {
    callback();
    return;
  }
  void loadGoogleMapsScript().then(callback).catch(() => undefined);
}
