import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/components/repartidor/MapView.tsx';
let source = readFileSync(path, 'utf8');

function replaceRequired(search, replacement, label) {
  if (typeof search === 'string') {
    if (!source.includes(search)) {
      throw new Error(`No se encontró el bloque requerido: ${label}`);
    }
    source = source.replace(search, replacement);
    return;
  }

  if (!search.test(source)) {
    throw new Error(`No se encontró el patrón requerido: ${label}`);
  }
  source = source.replace(search, replacement);
}

if (source.includes('LoadScript, GoogleMap')) {
  replaceRequired(
    'import { LoadScript, GoogleMap, Marker, Polyline, InfoWindow } from "@react-google-maps/api";',
    'import { useJsApiLoader, GoogleMap, Marker, Polyline, InfoWindow } from "@react-google-maps/api";',
    'importación del cargador de Google Maps',
  );
}

if (!source.includes('isLoaded: mapsLoaded')) {
  replaceRequired(
    '  const hasActiveDeliveries = deliveries.length > 0;',
    `  const hasActiveDeliveries = deliveries.length > 0;
  const { isLoaded: mapsLoaded, loadError: mapsLoadError } = useJsApiLoader({
    id: "domiu-rider-google-map",
    googleMapsApiKey: API_KEY || "missing-google-maps-key",
    libraries: mapLibraries,
  });`,
    'estado del cargador de Google Maps',
  );
}

source = source.replace(
  `  useEffect(() => {
    if (!window.google?.maps) return;
    geocoderRef.current = new google.maps.Geocoder();
    directionsServiceRef.current = new google.maps.DirectionsService();
  }, [hasActiveDeliveries]);`,
  `  useEffect(() => {
    if (!mapsLoaded || !window.google?.maps) return;
    geocoderRef.current = new window.google.maps.Geocoder();
    directionsServiceRef.current = new window.google.maps.DirectionsService();
  }, [mapsLoaded, hasActiveDeliveries]);`,
);

source = source.replace(
  '    if (!window.google?.maps || !geocoderRef.current || deliveries.length === 0) return;',
  '    if (!mapsLoaded || !window.google?.maps || !geocoderRef.current || deliveries.length === 0) return;',
);
source = source.replace(
  '  }, [deliveries, deliveryCoords]);',
  '  }, [mapsLoaded, deliveries, deliveryCoords]);',
);

source = source.replace(
  '    if (!position || !window.google?.maps || !directionsServiceRef.current || geocoding) return;',
  '    if (!mapsLoaded || !position || !window.google?.maps || !directionsServiceRef.current || geocoding) return;',
);
source = source.replace(
  '  }, [position, deliveries, deliveryCoords, geocoding, routes.length]);',
  '  }, [mapsLoaded, position, deliveries, deliveryCoords, geocoding, routes.length]);',
);

source = source.replace(
  `  useEffect(() => {
    if (!mapRef.current || !position) return;
    const bounds = new google.maps.LatLngBounds();`,
  `  useEffect(() => {
    if (!mapsLoaded || !window.google?.maps || !mapRef.current || !position) return;
    const bounds = new window.google.maps.LatLngBounds();`,
);
source = source.replace(
  '  }, [deliveries, deliveryCoords, position]);',
  '  }, [mapsLoaded, deliveries, deliveryCoords, position]);',
);

source = source.replace(
  /\n  const riderIcon = \{[\s\S]*?\n  \};\n/,
  '\n',
);

if (!source.includes('Google Maps no está configurado')) {
  replaceRequired(
    `  return (
    <div className="relative w-full h-full bg-[#0F172A]">
      {/* Google Map */}`,
    `  if (!API_KEY) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F172A] min-h-[400px]">
        <div className="text-center px-6">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-200 mb-2">Google Maps no está configurado</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en las variables de producción de Vercel.
          </p>
        </div>
      </div>
    );
  }

  if (mapsLoadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F172A] min-h-[400px]">
        <div className="text-center px-6">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-200 mb-2">No se pudo cargar Google Maps</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Revisa la clave, la facturación y las restricciones del dominio en Google Cloud.
          </p>
        </div>
      </div>
    );
  }

  if (!mapsLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F172A] min-h-[400px]">
        <div className="text-center px-6">
          <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0F172A]">
      {/* Google Map */}`,
    'estados controlados del mapa',
  );
}

source = source.replace(
  '      <LoadScript googleMapsApiKey={API_KEY} libraries={mapLibraries}>\n',
  '',
);
source = source.replace('      </LoadScript>\n', '');

writeFileSync(path, source, 'utf8');
console.log('Carga segura de Google Maps aplicada a la aplicación legacy.');
