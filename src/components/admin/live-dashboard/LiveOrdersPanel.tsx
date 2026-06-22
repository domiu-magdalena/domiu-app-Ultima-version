'use client';

import React from 'react';
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import type { OrderData } from '@/services/orders';

interface LiveOrdersPanelProps {
  orders: OrderData[];
  loading: boolean;
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-600' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/10 text-blue-600' },
  assigned: { label: 'Asignado', color: 'bg-violet-500/10 text-violet-600' },
  picked_up: { label: 'Recogido', color: 'bg-indigo-500/10 text-indigo-600' },
  in_transit: { label: 'En camino', color: 'bg-emerald-500/10 text-emerald-600' },
  delivered: { label: 'Entregado', color: 'bg-emerald-500/10 text-emerald-600' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600' },
  incident: { label: 'Incidencia', color: 'bg-red-500/10 text-red-600' },
};

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

export function LiveOrdersPanel({ orders, loading, selectedOrderId, onSelectOrder }: LiveOrdersPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-5 py-3.5">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const statusText = (s: string) => statusConfig[s]?.label ?? s;
  const statusColor = (s: string) => statusConfig[s]?.color ?? 'bg-muted text-muted-foreground';

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border/50 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Pedidos en vivo</h3>
          <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-600">
            {orders.length}
          </span>
        </div>
      </div>
      <div className="max-h-[520px] space-y-2 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Sin pedidos activos</p>
            <p className="text-xs text-muted-foreground/60">Los pedidos aparecerán aquí en tiempo real</p>
          </div>
        ) : (
          orders.slice(0, 20).map((order) => (
            <button
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className={`w-full rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                selectedOrderId === order.id
                  ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                  : 'border-border/50 bg-background/50 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">#{order.order_number}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${statusColor(order.status)}`}>
                    {statusText(order.status)}
                  </span>
                </div>
                <ChevronRight className={`h-3.5 w-3.5 transition-colors ${
                  selectedOrderId === order.id ? 'text-blue-500' : 'text-muted-foreground/40'
                }`} />
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-foreground">{order.business_name}</p>
                <p className="text-[11px] text-muted-foreground">Cliente: {order.customer_name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{formatCurrency(order.total_amount)}</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
