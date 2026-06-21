"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { LoadScript, GoogleMap, Marker, Polyline, InfoWindow } from "@react-google-maps/api";
import { Bike, ShoppingBag, MapPin, Clock, Phone, MessageCircle, ChevronRight, Navigation, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { darkMapStyle } from "@/lib/map-styles";

const containerStyle = { width: "100%", height: "100%" };

const mapLibraries: ("places" | "geometry" | "drawing")[] = ["geometry"];

const defaultZoom = 15;
const defaultCenter = { lat: 11.2408, lng: -74.199 };

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface Rider {
  id: string;
  nombre?: string;
  latitud?: number;
  longitud?: number;
}

interface Delivery {
  id: string | number;
  codigo?: string;
  tipo: "pedido" | "domicilio" | "marketplace";
  cliente?: string;
  cliente_telefono?: string;
  direccion: string;
  direccion_origen?: string;
  negocio_nombre?: string;
  local_id?: string;
  estado?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
}

interface MapViewProps {
  rider: Rider;
  deliveries: Delivery[];
  onComplete?: (delivery: Delivery) => void;
}

interface RouteData {
  legs: google.maps.DirectionsLeg[];
  path: google.maps.LatLng[];
  distance: string;
  duration: string;
}

function getInitialLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error("Geolocation no soportada"));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    });
  });
}

export default function MapView({ rider, deliveries, onComplete }: MapViewProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [eta, setEta] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<Map<string, { pickup?: google.maps.LatLng; drop?: google.maps.LatLng }>>(new Map());

  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);

  const onLoad = useCallback((m: google.maps.Map) => {
    mapRef.current = m;
    setMap(m);
  }, []);

  const hasActiveDeliveries = deliveries.length > 0;

  // Initialize position and start tracking
  useEffect(() => {
    if (!hasActiveDeliveries) return;

    getInitialLocation()
      .then((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading || 0 };
        setPosition(loc);
        setTracking(true);
      })
      .catch((err) => {
        console.warn("Error getting initial position:", err);
        setPosition(defaultCenter);
      });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading || 0 };
        setPosition(loc);
      },
      (err) => console.warn("GPS error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 3000 }
    );
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [hasActiveDeliveries]);

  // Initialize services
  useEffect(() => {
    if (!window.google?.maps) return;
    geocoderRef.current = new google.maps.Geocoder();
    directionsServiceRef.current = new google.maps.DirectionsService();
  }, [hasActiveDeliveries]);

  // Geocode delivery addresses
  useEffect(() => {
    if (!window.google?.maps || !geocoderRef.current || deliveries.length === 0) return;
    if (deliveryCoords.size > 0) return;

    setGeocoding(true);
    const geocoder = geocoderRef.current;
    const coords = new Map(deliveryCoords);

    Promise.all(
      deliveries.map(async (d) => {
        try {
          if (d.direccion_origen && !coords.has(`pickup_${d.id}`)) {
            const res = await geocoder.geocode({ address: d.direccion_origen });
            if (res.results[0]?.geometry?.location) {
              coords.set(`pickup_${d.id}`, { pickup: res.results[0].geometry.location });
            }
          }
          if (d.direccion && !coords.has(`drop_${d.id}`)) {
            const res = await geocoder.geocode({ address: d.direccion });
            if (res.results[0]?.geometry?.location) {
              const existing = coords.get(`drop_${d.id}`) || {};
              coords.set(`drop_${d.id}`, { ...existing, drop: res.results[0].geometry.location });
            }
          }
        } catch {}
      })
    ).then(() => {
      setDeliveryCoords(new Map(coords));
      setGeocoding(false);
    });
  }, [deliveries, deliveryCoords]);

  // Calculate routes
  useEffect(() => {
    if (!position || !window.google?.maps || !directionsServiceRef.current || geocoding) return;
    if (routes.length > 0) return;

    const ds = directionsServiceRef.current;

    async function calcRoutes() {
      const results: RouteData[] = [];

      for (const d of deliveries) {
        const pickupKey = `pickup_${d.id}`;
        const dropKey = `drop_${d.id}`;
        const pCoords = deliveryCoords.get(pickupKey)?.pickup || deliveryCoords.get(dropKey)?.pickup;
        const dCoords = deliveryCoords.get(dropKey)?.drop;

        if (!dCoords && !pCoords) continue;

        const origin = pCoords || position;
        const dest = dCoords || position;

        try {
          const res = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
            ds.route(
              {
                origin,
                destination: dest,
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                  departureTime: new Date(),
                  trafficModel: google.maps.TrafficModel.BEST_GUESS,
                },
              },
              (result, status) => {
                if (status === "OK" && result) resolve(result);
                else reject(new Error(status));
              }
            );
          });

          const leg = res.routes[0].legs[0];
          results.push({
            legs: res.routes[0].legs,
            path: res.routes[0].overview_path || [],
            distance: leg.distance?.text || "",
            duration: leg.duration_in_traffic?.text || leg.duration?.text || "",
          });
        } catch {}
      }

      setRoutes(results);

      if (results.length > 0) {
        setEta(results[0].duration);
        setDistance(results[0].distance);
      }
    }

    calcRoutes();
  }, [position, deliveries, deliveryCoords, geocoding, routes.length]);

  // Center map on rider position
  useEffect(() => {
    if (!position || !mapRef.current) return;
    mapRef.current.panTo(position);

    const currentZoom = mapRef.current.getZoom() || defaultZoom;
    if (currentZoom < 13) mapRef.current.setZoom(defaultZoom);
  }, [position]);

  // Fit bounds for all markers
  useEffect(() => {
    if (!mapRef.current || !position) return;
    const bounds = new google.maps.LatLngBounds();
    if (position) bounds.extend(position);

    deliveries.forEach((d) => {
      const dropKey = `drop_${d.id}`;
      const dCoords = deliveryCoords.get(dropKey)?.drop;
      if (dCoords) bounds.extend(dCoords);
    });

    mapRef.current.fitBounds(bounds);
  }, [deliveries, deliveryCoords, position]);

  const riderIcon = {
    path: window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW || "M 0,-6 L 8,0 L 0,6 L -8,0 Z",
    fillColor: "#10B981",
    fillOpacity: 1,
    strokeColor: "#047857",
    strokeWeight: 2,
    scale: 6,
    rotation: position?.heading || 0,
    anchor: new google.maps.Point(0, 0),
  };

  if (!hasActiveDeliveries) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F172A] min-h-[400px]">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <Navigation size={40} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-300 mb-2">Sin ruta activa</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Acepta un domicilio desde la pantalla de inicio para ver tu ruta aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0F172A]">
      {/* Google Map */}
      <LoadScript googleMapsApiKey={API_KEY} libraries={mapLibraries}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={position || defaultCenter}
          zoom={defaultZoom}
          onLoad={onLoad}
          options={{
            styles: darkMapStyle,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            keyboardShortcuts: false,
            gestureHandling: "greedy",
            minZoom: 10,
          }}
        >
          {/* Rider Marker */}
          {position && (
            <Marker
              position={position}
              icon={{
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                fillColor: "#10B981",
                fillOpacity: 1,
                strokeColor: "#047857",
                strokeWeight: 2,
                scale: 7,
                rotation: position.heading || 0,
                anchor: new google.maps.Point(0, 0),
              }}
              zIndex={100}
              title="Tu ubicación"
            />
          )}

          {/* Delivery markers */}
          {deliveries.map((d, idx) => {
            const dropKey = `drop_${d.id}`;
            const pickupKey = `pickup_${d.id}`;
            const dropCoord = deliveryCoords.get(dropKey)?.drop;
            const pickupCoord = deliveryCoords.get(pickupKey)?.pickup || deliveryCoords.get(dropKey)?.pickup;

            return (
              <div key={d.id}>
                {/* Pickup marker (bolsa amarilla) */}
                {pickupCoord && (
                  <Marker
                    position={pickupCoord}
                    icon={{
                      path: "M2 6h20l-2 14H4L2 6zm3 2h14l-1 10H6L5 8zm3 2v6h2v-6H8zm4 0v6h2v-6h-2zm4 0v6h2v-6h-2z",
                      fillColor: "#F59E0B",
                      fillOpacity: 1,
                      strokeColor: "#D97706",
                      strokeWeight: 1.5,
                      scale: 1.2,
                      labelOrigin: new google.maps.Point(12, 4),
                      anchor: new google.maps.Point(12, 24),
                    }}
                    label={{ text: `${idx + 1}`, color: "#0F172A", fontSize: "11px", fontWeight: "bold" }}
                    onClick={() => setSelectedDelivery(d)}
                    zIndex={50}
                  />
                )}
                {/* Drop marker (pin rojo) */}
                {dropCoord && (
                  <Marker
                    position={dropCoord}
                    icon={{
                      path: "M12 0C7.58 0 4 3.58 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z",
                      fillColor: "#EF4444",
                      fillOpacity: 1,
                      strokeColor: "#DC2626",
                      strokeWeight: 1.5,
                      scale: 1.1,
                      labelOrigin: new google.maps.Point(12, 8),
                      anchor: new google.maps.Point(12, 28),
                    }}
                    label={{ text: `${idx + 1}`, color: "#FFFFFF", fontSize: "11px", fontWeight: "bold" }}
                    onClick={() => setSelectedDelivery(d)}
                    zIndex={50}
                  />
                )}
              </div>
            );
          })}

          {/* Route polylines */}
          {routes.map((route, idx) => (
            <Polyline
              key={idx}
              path={route.path}
              options={{
                strokeColor: "#10B981",
                strokeOpacity: 0.9,
                strokeWeight: 5,
                geodesic: true,
                zIndex: 30,
              }}
            />
          ))}

          {/* Glow polyline (duplicate underneath with larger weight, lower opacity) */}
          {routes.map((route, idx) => (
            <Polyline
              key={`glow-${idx}`}
              path={route.path}
              options={{
                strokeColor: "#10B981",
                strokeOpacity: 0.2,
                strokeWeight: 12,
                geodesic: true,
                zIndex: 29,
              }}
            />
          ))}

          {/* InfoWindow for selected delivery */}
          {selectedDelivery && (() => {
            const dropKey = `drop_${selectedDelivery.id}`;
            const dropCoord = deliveryCoords.get(dropKey)?.drop;
            if (!dropCoord) return null;
            return (
              <InfoWindow position={dropCoord} onCloseClick={() => setSelectedDelivery(null)}>
                <div style={{ background: "#1E293B", color: "#F8FAFC", padding: "8px 12px", borderRadius: 12, fontSize: 13, maxWidth: 200 }}>
                  <p style={{ fontWeight: 700, margin: "0 0 4px" }}>{selectedDelivery.cliente || "Cliente"}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>#{selectedDelivery.codigo}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: "4px 0 0" }}>{selectedDelivery.direccion}</p>
                </div>
              </InfoWindow>
            );
          })()}
        </GoogleMap>
      </LoadScript>

      {/* Error overlay */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-50 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm font-medium text-red-400 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </p>
        </div>
      )}

      {/* Bottom Dashboard Card */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-4 pb-6">
        <div className="backdrop-blur-xl bg-[#1E293B]/85 rounded-3xl border border-white/10 p-5 shadow-2xl">
          {/* ETA + Distance */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
                <Clock size={22} className="text-[#10B981]" />
              </div>
              <div>
                <p className="text-2xl font-black text-[#F8FAFC]">{eta || "Calculando..."}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Navigation size={10} /> {distance || "..."}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{deliveries.length} entrega{deliveries.length !== 1 ? "s" : ""}</p>
              <p className="text-xs text-[#10B981] font-semibold">En vivo</p>
            </div>
          </div>

          {/* Geocoding status */}
          {geocoding && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/5">
              <div className="w-4 h-4 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Calculando ruta...</span>
            </div>
          )}

          {/* Active delivery info */}
          {deliveries.map((d, idx) => (
            <div key={d.id} className="flex items-center gap-3 mb-3 last:mb-0 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0">
                <span className="text-[#10B981] font-bold text-sm">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F8FAFC] truncate">{d.cliente || `#${d.codigo}`}</p>
                <p className="text-[11px] text-slate-400 truncate">{d.direccion}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {d.cliente_telefono && (
                  <>
                    <a href={`tel:${d.cliente_telefono}`}
                      className="w-9 h-9 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] hover:bg-[#3B82F6]/20 transition-all active:scale-90">
                      <Phone size={15} />
                    </a>
                    <a href={`https://wa.me/57${d.cliente_telefono.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] hover:bg-[#22C55E]/20 transition-all active:scale-90">
                      <MessageCircle size={15} />
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Complete delivery button */}
          {deliveries.length > 0 && onComplete && (
            <button onClick={() => onComplete(deliveries[0])}
              className="w-full mt-3 h-12 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-[#10B981]/20">
              <Check size={18} /> Marcar como entregado
            </button>
          )}
        </div>
      </div>

      {/* Tracking indicator */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E293B]/80 backdrop-blur-md border border-white/10">
        <div className={`w-2 h-2 rounded-full ${tracking ? "bg-[#10B981] animate-pulse" : "bg-red-500"}`} />
        <span className="text-[11px] font-medium text-slate-300">{tracking ? "GPS activo" : "GPS desconectado"}</span>
      </div>
    </div>
  );
}
