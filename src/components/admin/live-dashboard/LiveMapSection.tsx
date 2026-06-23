'use client';

import React, { useState } from 'react';
import { MapLegend } from './MapLegend';
import { Layers, Maximize2, Minimize2, TrafficCone } from 'lucide-react';
import { MapsProvider } from '@/contexts/MapsContext';
import { DynamicMapWrapper } from '@/components/tracking/maps/DynamicMapWrapper';

interface LiveMapSectionProps {
  totalOrders: number;
}

export function LiveMapSection({ totalOrders }: LiveMapSectionProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

  return (
    <div className={`rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden transition-all duration-300 ${
      fullscreen ? 'fixed inset-4 z-50' : ''
    }`}>
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Mapa en vivo</h3>
            <p className="text-[10px] text-muted-foreground">{totalOrders} pedidos activos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 animate-pulse">
            EN TIEMPO REAL
          </span>
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            className={`rounded-lg p-1.5 transition-colors ${
              showTraffic ? 'bg-blue-100 text-blue-600' : 'text-muted-foreground hover:bg-muted'
            }`}
            aria-label={showTraffic ? 'Ocultar tráfico' : 'Mostrar tráfico'}
          >
            <TrafficCone className="h-4 w-4" />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="relative">
        <MapsProvider>
          <div className="h-[400px] w-full lg:h-[520px]">
            <DynamicMapWrapper
              config={{ center: { lat: 11.2408, lng: -74.1990 }, zoom: 13 }}
            />
          </div>
        </MapsProvider>
        <div className="absolute bottom-3 left-3 right-3">
          <MapLegend />
        </div>
      </div>
    </div>
  );
}
