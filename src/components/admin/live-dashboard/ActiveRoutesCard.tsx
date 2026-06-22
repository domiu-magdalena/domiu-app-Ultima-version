'use client';

import React from 'react';
import { Route } from 'lucide-react';

interface RouteData {
  code: string;
  orders: number;
  courierName: string;
  progress: number;
}

const mockRoutes: RouteData[] = [
  { code: 'R-001', orders: 5, courierName: 'Carlos Pérez', progress: 80 },
  { code: 'R-002', orders: 3, courierName: 'Ana Patiño', progress: 45 },
  { code: 'R-003', orders: 4, courierName: 'Jorge Díaz', progress: 20 },
  { code: 'R-004', orders: 2, courierName: 'María Torres', progress: 60 },
];

export function ActiveRoutesCard() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border/50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-foreground">Rutas activas</h3>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {mockRoutes.map((route) => (
          <div key={route.code} className="group rounded-xl border border-border/50 bg-background/50 p-3 transition-all hover:bg-muted/30 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                  <Route className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-xs font-bold text-foreground">{route.code}</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{route.orders} pedidos</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Repartidor: {route.courierName}</p>
              <span className="text-[10px] font-medium text-blue-600">{route.progress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${route.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
