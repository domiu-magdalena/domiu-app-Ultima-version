"use client";

import { useEffect, useState, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";

interface RiderLocation {
  latitud: number;
  longitud: number;
  nombre_repartidor: string;
  estado: string;
  ultima_actualizacion: string;
}

interface Props {
  repartidorId?: string;
  negocioLat?: number;
  negocioLng?: number;
  clienteDireccion?: string;
  negocioNombre?: string;
}

export default function MapaRepartidorCliente({ repartidorId, negocioLat, negocioLng, clienteDireccion, negocioNombre }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<RiderLocation | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [tiempoEstimado, setTiempoEstimado] = useState("");
  const mapInstance = useRef<any>(null);
  const riderMarker = useRef<any>(null);
  const negocioMarker = useRef<any>(null);

  useEffect(() => {
    if (!repartidorId) {
      setLoadError("");
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const loadMap = async () => {
      if (!apiKey) { setLoadError("No hay API key de Google Maps"); return; }

      try {
        if (!(window as any).google?.maps) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Error cargando Maps"));
            document.head.appendChild(s);
          });
        }

        if (mapRef.current && !mapInstance.current) {
          mapInstance.current = new (window as any).google.maps.Map(mapRef.current, {
            center: { lat: negocioLat || 10.4, lng: negocioLng || -75.5 },
            zoom: 15,
            mapTypeId: "roadmap",
            styles: [
              { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
              { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
              { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d4a" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
            ],
          });

          if (negocioLat && negocioLng) {
            negocioMarker.current = new (window as any).google.maps.Marker({
              position: { lat: negocioLat, lng: negocioLng },
              map: mapInstance.current,
              title: negocioNombre || "Negocio",
              icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
                scaledSize: new (window as any).google.maps.Size(36, 36),
              },
            });

            new (window as any).google.maps.InfoWindow({
              content: `<div style="color:#000;font-weight:bold;padding:4px;">${negocioNombre || "Negocio"}</div>`,
            }).open(mapInstance.current, negocioMarker.current);
          }
        }
        setMapReady(true);
      } catch (err: any) {
        setLoadError(err.message);
      }
    };

    loadMap();
  }, [repartidorId]);

  useEffect(() => {
    if (!repartidorId || !mapInstance.current) return;

    const fetchRiderLocation = async () => {
      const { data } = await getSupabaseClient()
        .from("ubicaciones_repartidores")
        .select("*")
        .eq("repartidor_id", repartidorId)
        .single();

      if (data) {
        setLocation(data);
        updateRiderMarker(data);
      }
    };

    const updateRiderMarker = (loc: RiderLocation) => {
      if (!mapInstance.current) return;
      const pos = { lat: loc.latitud, lng: loc.longitud };

      if (riderMarker.current) {
        riderMarker.current.setPosition(pos);
      } else {
        riderMarker.current = new (window as any).google.maps.Marker({
          position: pos,
          map: mapInstance.current,
          title: loc.nombre_repartidor || "Repartidor",
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            fillColor: "#facc15",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
            scale: 14,
          },
          label: {
            text: "🛵 " + (loc.nombre_repartidor || "R"),
            color: "#fff",
            fontSize: "11px",
            fontWeight: "bold",
          },
        });

        const infoW = new (window as any).google.maps.InfoWindow({
          content: `<div style="padding:8px;font-family:sans-serif;">
            <strong style="color:#1e293b;">🛵 ${loc.nombre_repartidor || "Repartidor"}</strong>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Estado: ${loc.estado}</p>
          </div>`,
        });
        riderMarker.current.addListener("click", () => infoW.open(mapInstance.current, riderMarker.current));
      }

      mapInstance.current.panTo(pos);

      // Calcular tiempo estimado
      if (negocioLat && negocioLng) {
        const d = getDistance(negocioLat, negocioLng, loc.latitud, loc.longitud);
        setTiempoEstimado(getEstimatedTime(d));
      }
    };

    fetchRiderLocation();
    const interval = setInterval(fetchRiderLocation, 8000);
    return () => clearInterval(interval);
  }, [repartidorId, negocioLat, negocioLng]);

  if (loadError) {
    return (
      <div className="bg-domi-dark rounded-2xl p-4 text-center">
        <p className="text-red-400 text-sm">{loadError}</p>
      </div>
    );
  }

  if (!repartidorId) {
    return (
      <div className="bg-domi-dark rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🕐</span>
        </div>
        <p className="text-white/50 text-sm">Esperando asignación de repartidor...</p>
      </div>
    );
  }

  return (
    <div className="bg-domi-dark rounded-2xl overflow-hidden">
      <div className="p-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/60">
            {location ? `Repartidor: ${location.nombre_repartidor}` : "Localizando..."}
          </span>
        </div>
        {tiempoEstimado && (
          <span className="text-xs text-domi-yellow font-semibold">
            ⏱ ~{tiempoEstimado}
          </span>
        )}
      </div>
      <div ref={mapRef} className="w-full h-52" />
      {location && (
        <div className="p-3 text-xs text-white/40 flex items-center gap-1 border-t border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Actualizado: {new Date(location.ultima_actualizacion).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      )}
    </div>
  );
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEstimatedTime(distanceKm: number): string {
  const min = Math.round((distanceKm / 30) * 60);
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}
