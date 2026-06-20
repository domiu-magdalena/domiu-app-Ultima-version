'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/ui/page-container';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, OrderProvider } from '@/contexts/OrderContext';
import { ClipboardList, Store, Clock, MapPin, ChevronRight } from 'lucide-react';

function PedidosContent() {
  const { customerOrders, loading } = useOrders();
  const router = useRouter();

  if (loading) return <LoadingState />;

  if (customerOrders.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" />}
        title="No tienes pedidos"
        description="Los pedidos que realices aparecerán aquí. Explora restaurantes cercanos para comenzar."
      />
    );
  }

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {customerOrders.map((order, i) => {
        const statusColors: Record<string, string> = {
          pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
          confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
          preparing: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
          ready: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
          assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400',
          picked_up: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400',
          in_transit: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
          delivered: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
          cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
        };
        const statusLabels: Record<string, string> = {
          pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
          ready: 'Listo', assigned: 'Asignado', picked_up: 'Recogido',
          in_transit: 'En camino', delivered: 'Entregado', cancelled: 'Cancelado',
        };

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            onClick={() => router.push(`/cliente/pedidos/${order.id}`)}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-4 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm transition-transform group-hover:scale-105">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {order.business_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[order.status] ?? 'bg-muted text-muted-foreground'}`}>
                {statusLabels[order.status] ?? order.status}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/20 pt-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {order.delivery_address && (
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {order.delivery_address}
                  </span>
                )}
                {order.created_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground">${order.total_amount.toFixed(2)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default function ClientePedidos() {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-base font-bold text-foreground">Mis Pedidos</h1>
        </div>
      </div>
      <PageContainer>
        <OrderProvider customerId={profile?.id}>
          <PedidosContent />
        </OrderProvider>
      </PageContainer>
    </div>
  );
}
