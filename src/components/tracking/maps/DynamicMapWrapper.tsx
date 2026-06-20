'use client';

import React, { useEffect, useRef, useState, useCallback, memo, type ReactNode } from 'react';
import { useMaps } from '@/contexts/MapsContext';
import { LoadingState } from '@/components/ui/loading-state';
import { MapPin } from 'lucide-react';

export interface MapConfig {
  center: google.maps.LatLngLiteral;
  zoom?: number;
  styles?: google.maps.MapTypeStyle[];
  options?: google.maps.MapOptions;
}

interface MapWrapperProps {
  config: MapConfig;
  children?: (map: google.maps.Map) => ReactNode;
  className?: string;
  onLoad?: (map: google.maps.Map) => void;
}

function DynamicMapInner({ config, children, className = 'w-full h-full min-h-[300px]', onLoad }: MapWrapperProps) {
  const { isReady, maps, error, hasKey } = useMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isReady || !maps || !containerRef.current || mapRef.current) return;

    const map = new maps.Map(containerRef.current, {
      center: config.center,
      zoom: config.zoom ?? 14,
      styles: config.styles ?? defaultMapStyle,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
      ...config.options,
    });

    mapRef.current = map;
    setLoaded(true);
    onLoad?.(map);
  }, [isReady, maps, config.center.lat, config.center.lng, config.zoom]);

  if (!hasKey || error) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-muted/30 ${className}`}>
        <div className="text-center p-8">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {!hasKey ? 'Google Maps no configurado' : 'Error al cargar Google Maps'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={className}>
        <LoadingState />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl" />
      {loaded && children?.(mapRef.current!)}
    </div>
  );
}

export const DynamicMapWrapper = memo(DynamicMapInner);

const defaultMapStyle = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
] as google.maps.MapTypeStyle[];
