'use client';

import React from 'react';
import {
  Package, Bike, CheckCircle, AlertTriangle,
  XCircle, Clock, ArrowRight, UserCheck, UserX
} from 'lucide-react';
import type { AuditLog } from '@/services/admin';

interface RealtimeActivityCardProps {
  activities: AuditLog[];
  loading: boolean;
}

function getActivityIcon(action: string) {
  const iconMap: Record<string, React.ReactNode> = {
    order_created: <Package className="h-3.5 w-3.5 text-blue-500" />,
    order_assigned: <ArrowRight className="h-3.5 w-3.5 text-violet-500" />,
    order_picked_up: <Package className="h-3.5 w-3.5 text-indigo-500" />,
    order_in_transit: <Bike className="h-3.5 w-3.5 text-emerald-500" />,
    order_delivered: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
    order_cancelled: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    courier_online: <UserCheck className="h-3.5 w-3.5 text-emerald-500" />,
    courier_offline: <UserX className="h-3.5 w-3.5 text-muted-foreground" />,
    incident_reported: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  };
  return iconMap[action] ?? <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getActivityText(log: AuditLog): string {
  const actionText: Record<string, string> = {
    order_created: 'Nuevo pedido recibido',
    order_assigned: 'Pedido asignado a repartidor',
    order_picked_up: 'Pedido recogido por repartidor',
    order_in_transit: 'Pedido en camino al cliente',
    order_delivered: 'Pedido entregado exitosamente',
    order_cancelled: 'Pedido cancelado',
    courier_online: 'Repartidor conectado',
    courier_offline: 'Repartidor desconectado',
    incident_reported: 'Incidencia reportada',
  };
  return actionText[log.action] || log.action;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `Hace ${secs} seg`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

export function RealtimeActivityCard({ activities, loading }: RealtimeActivityCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-5 py-3.5">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-2 w-16 animate-pulse rounded bg-muted" />
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
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-foreground">Actividad en tiempo real</h3>
        </div>
      </div>
      <div className="max-h-[320px] space-y-1 overflow-y-auto p-2">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Sin actividad reciente</p>
            <p className="text-xs text-muted-foreground/60">Los eventos aparecerán aquí en tiempo real</p>
          </div>
        ) : (
          activities.map((log) => (
            <div key={log.id} className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50">
                {getActivityIcon(log.action)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">{getActivityText(log)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {log.entity_type} {log.details ? `— ${log.details}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground/60">{timeAgo(log.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
