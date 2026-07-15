'use client';

import React, { useEffect, useRef, useState, memo, type ReactNode } from 'react';
import { useMaps } from '@/contexts/MapsContext';
import { SkeletonMap } from '@/components/ui/skeleton';
import { OpenStreetLiveMap } from '@/components/tracking/maps/OpenStreetLiveMap';

export interface MapConfig {
  center: google.maps.LatLngLiteral;
  zoom?: number;
  styles?: google.maps.MapTypeStyle[];
  options?: google.maps.MapOptions;
}

export interface FallbackMapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color?: string;
}

interface MapWrapperProps {
  config: MapConfig;
  children?: (map: google.maps.Map) => ReactNode;
  className?: string;
  onLoad?: (map: google.maps.Map) => void;
  fallbackPoints?: FallbackMapPoint[];
  fallbackRoute?: { lat: number; lng: number }[];
  onFallbackPointClick?: (id: string) => void;
}

function DynamicMapInner({
  config,
  children,
  className = 'w-full h-full min-h-[300px]',
  onLoad,
  fallbackPoints = [],
  fallbackRoute = [],
  onFallbackPointClick,
}: MapWrapperProps) {
  const { isReady, maps, error: mapsError, hasKey } = useMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!isReady || !maps || !containerRef.current || map) return;
    if (typeof maps.Map !== 'function') return;

    try {
      const instance = new maps.Map(containerRef.current, {
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
      setMap(instance);
      onLoad?.(instance);
    } catch {
      // El mapa alterno se renderiza automáticamente.
    }
  }, [isReady, maps, config, map, onLoad]);

  const noMapApi = isReady && maps && typeof maps.Map !== 'function';
  const showFallback = !hasKey || Boolean(mapsError) || noMapApi;

  if (showFallback) {
    const points = fallbackPoints.length > 0
      ? fallbackPoints
      : [{ id: 'center', lat: config.center.lat, lng: config.center.lng, label: 'Ubicación', color: '#2563EB' }];
    return (
      <OpenStreetLiveMap
        points={points}
        route={fallbackRoute}
        center={config.center}
        zoom={config.zoom ?? 14}
        className={className}
        onPointClick={onFallbackPointClick}
      />
    );
  }

  if (!isReady) {
    return (
      <div className={className}>
        <SkeletonMap />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl" />
      {map && children?.(map)}
    </div>
  );
}

export const DynamicMapWrapper = memo(DynamicMapInner);

const defaultMapStyle = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
] as google.maps.MapTypeStyle[];
