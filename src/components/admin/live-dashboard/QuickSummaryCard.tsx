'use client';

import React from 'react';
import { BarChart3, MapPin } from 'lucide-react';

interface QuickSummaryCardProps {
  statusDistribution: { status: string; count: number }[];
  cityOrders: { city: string; count: number }[];
  loading: boolean;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendientes',
  confirmed: 'Confirmados',
  assigned: 'Asignados',
  picked_up: 'Recogidos',
  in_transit: 'En camino',
  delivered: 'Entregados',
  cancelled: 'Cancelados',
  incident: 'Incidencias',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-blue-400',
  assigned: 'bg-violet-400',
  picked_up: 'bg-indigo-400',
  in_transit: 'bg-emerald-400',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-400',
  incident: 'bg-red-500',
};

const zoneNames: Record<string, string> = {
  'Santa Marta': 'Centro Histórico',
  'El Rodadero': 'El Rodadero',
  'Mamatoco': 'Mamatoco',
  'Bavaria': 'Bavaria',
  'Gaira': 'Gaira',
};

const defaultZones = [
  { city: 'Centro Histórico', count: 42 },
  { city: 'El Rodadero', count: 35 },
  { city: 'Mamatoco', count: 28 },
  { city: 'Bavaria', count: 21 },
  { city: 'Gaira', count: 15 },
];

export function QuickSummaryCard({ statusDistribution, cityOrders, loading }: QuickSummaryCardProps) {
  const totalOrders = statusDistribution.reduce((sum, s) => sum + s.count, 0);
  const activeStatuses = statusDistribution.filter(s => !['delivered', 'cancelled'].includes(s.status));
  const activeTotal = activeStatuses.reduce((sum, s) => sum + s.count, 0);
  const activeStatusesWithFallback = activeStatuses.length > 0 ? activeStatuses : [];

  const displayZones = cityOrders.length > 0
    ? cityOrders.slice(0, 5).map(c => ({
        city: zoneNames[c.city] || c.city,
        count: c.count,
      }))
    : defaultZones;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-5 py-3.5">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4 p-5">
          <div className="mx-auto h-32 w-32 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border/50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-foreground">Resumen rápido</h3>
        </div>
      </div>
      <div className="p-5">
        {activeStatusesWithFallback.length > 0 && (
          <div className="mb-5">
            <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 36 36">
                {activeStatusesWithFallback.map((s, i) => {
                  const pct = totalOrders > 0 ? (s.count / totalOrders) * 100 : 0;
                  const offset = activeStatusesWithFallback
                    .slice(0, i)
                    .reduce((sum, ss) => sum + (totalOrders > 0 ? (ss.count / totalOrders) * 100 : 0), 0);
                  const circumference = 2 * Math.PI * 14;
                  const dashLength = (pct / 100) * circumference;
                  return (
                    <circle
                      key={s.status}
                      cx="18" cy="18" r="14"
                      fill="none"
                      stroke={`hsl(var(--${statusColors[s.status]?.replace('bg-', '').replace('-400', '').replace('-500', '') || 'muted'}))`}
                      strokeWidth="3"
                      strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                      strokeDashoffset={-((offset / 100) * circumference)}
                      className="transition-all duration-700"
                    />
                  );
                })}
                <text x="18" y="18" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[5px] font-bold">
                  {activeTotal}
                </text>
                <text x="18" y="21" textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[2.5px]">
                  activos
                </text>
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {activeStatusesWithFallback.map((s) => (
                <div key={s.status} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusColors[s.status] || 'bg-muted'}`} />
                  <span className="text-[10px] text-muted-foreground">{statusLabels[s.status] || s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground">Zonas con más pedidos</h4>
          </div>
          <div className="space-y-2">
            {displayZones.map((zone, i) => (
              <div key={zone.city} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/10 to-blue-600/5 text-[9px] font-bold text-blue-600">
                    {i + 1}
                  </span>
                  <span className="text-xs text-foreground">{zone.city}</span>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">{zone.count} pedidos</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
