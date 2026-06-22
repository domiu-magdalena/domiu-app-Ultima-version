'use client';

import { Bike, MapPin, AlertTriangle, Navigation } from 'lucide-react';

const legendItems = [
  { color: 'bg-blue-500', icon: Bike, label: 'Repartidor activo' },
  { color: 'bg-emerald-500', icon: Navigation, label: 'Pedido en camino' },
  { color: 'bg-amber-500', icon: MapPin, label: 'Pedido asignado' },
  { color: 'bg-red-500', icon: AlertTriangle, label: 'Incidencia' },
];

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-4 rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 shadow-sm backdrop-blur-sm">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`flex h-5 w-5 items-center justify-center rounded-full ${item.color}`}>
            <item.icon className="h-3 w-3 text-white" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
