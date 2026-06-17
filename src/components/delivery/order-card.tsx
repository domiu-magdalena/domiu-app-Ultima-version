'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Clock, MapPin, Store, ChefHat, Bike, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'refunded';

interface OrderCardProps {
  id: string;
  status: OrderStatus;
  businessName: string;
  itemsCount: number;
  total: number;
  currency?: string;
  deliveryAddress?: string;
  estimatedTime?: string;
  onClick?: () => void;
  className?: string;
}

const statusConfig: Record<OrderStatus, {
  label: string;
  variant: 'warning' | 'info' | 'success' | 'destructive' | 'default' | 'secondary';
  icon: React.ReactNode;
  color: string;
}> = {
  pending: {
    label: 'Pendiente', variant: 'warning',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  },
  confirmed: {
    label: 'Confirmado', variant: 'info',
    icon: <ChefHat className="h-3.5 w-3.5" />,
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  },
  preparing: {
    label: 'Preparando', variant: 'info',
    icon: <ChefHat className="h-3.5 w-3.5" />,
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
  },
  ready: {
    label: 'Listo', variant: 'success',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  },
  in_transit: {
    label: 'En camino', variant: 'default',
    icon: <Bike className="h-3.5 w-3.5" />,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800',
  },
  delivered: {
    label: 'Entregado', variant: 'success',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  },
  assigned: {
    label: 'Asignado', variant: 'info',
    icon: <Bike className="h-3.5 w-3.5" />,
    color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800',
  },
  picked_up: {
    label: 'Recogido', variant: 'default',
    icon: <Bike className="h-3.5 w-3.5" />,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800',
  },
  cancelled: {
    label: 'Cancelado', variant: 'destructive',
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  },
  refunded: {
    label: 'Reembolsado', variant: 'destructive',
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
  },
};

export function OrderCard({
  status,
  businessName,
  itemsCount,
  total,
  currency = '$',
  deliveryAddress,
  estimatedTime,
  onClick,
  className,
}: OrderCardProps) {
  const config = statusConfig[status];

  return (
    <Card
      hover
      onClick={onClick}
      className={cn(
        'group cursor-pointer overflow-hidden transition-all duration-300',
        className,
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm transition-transform duration-300 group-hover:scale-105">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-200">
                {businessName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {itemsCount} producto{itemsCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-300 group-hover:scale-105',
              config.color,
            )}
          >
            {config.icon}
            {config.label}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {deliveryAddress && (
              <span className="flex items-center gap-1 truncate max-w-[180px]">
                <MapPin className="h-3 w-3 shrink-0" />
                {deliveryAddress}
              </span>
            )}
            {estimatedTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {estimatedTime}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-foreground tracking-tight">
              {currency}{total.toFixed(2)}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Card>
  );
}
