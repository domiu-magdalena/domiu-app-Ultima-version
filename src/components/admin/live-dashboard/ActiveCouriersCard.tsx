'use client';

import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Bike, Battery, ChevronRight } from 'lucide-react';
import type { CourierDriver } from '@/services/assignment';

interface ActiveCouriersCardProps {
  couriers: CourierDriver[];
  loading: boolean;
  selectedCourierId: string | null;
  onSelectCourier: (id: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  available: { label: 'Libre', color: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  busy: { label: 'En entrega', color: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
  offline: { label: 'Desconectado', color: 'text-muted-foreground bg-muted', dot: 'bg-muted-foreground' },
};

export function ActiveCouriersCard({ couriers, loading, selectedCourierId, onSelectCourier }: ActiveCouriersCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-5 py-3.5">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                <div className="h-2 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border/50 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-foreground">Repartidores activos</h3>
          </div>
          <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-600">
            {couriers.length}
          </span>
        </div>
      </div>
      <div className="max-h-[320px] space-y-1 overflow-y-auto p-2">
        {couriers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bike className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Sin repartidores activos</p>
            <p className="text-xs text-muted-foreground/60">Los repartidores aparecerán cuando se conecten</p>
          </div>
        ) : (
          couriers.slice(0, 15).map((courier) => {
            const cfg = courier.is_available ? statusConfig.available : statusConfig.offline;
            return (
              <button
                key={courier.id}
                onClick={() => onSelectCourier(courier.id)}
                className={`w-full rounded-xl p-3 text-left transition-all hover:shadow-sm ${
                  selectedCourierId === courier.id
                    ? 'bg-blue-50/50 ring-1 ring-blue-300'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar
                      initials={courier.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      size="md"
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{courier.name}</p>
                      <div className="flex items-center gap-1">
                        <Battery className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] text-muted-foreground">85%</span>
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {courier.total_deliveries} entregas
                      </span>
                    </div>
                    {courier.total_deliveries > 0 && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, (courier.total_deliveries % 20) * 5)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
