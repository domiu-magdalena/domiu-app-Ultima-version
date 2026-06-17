'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/ui/page-container';
import { PageTitle } from '@/components/ui/page-title';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, OrderProvider } from '@/contexts/OrderContext';
import { OrderCard } from '@/components/delivery/order-card';
import { ClipboardList } from 'lucide-react';

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
    <div className="space-y-3 animate-fade-in">
      {customerOrders.map((order) => (
        <OrderCard
          key={order.id}
          id={order.id}
          status={order.status}
          businessName={order.business_name}
          itemsCount={order.items.length}
          total={order.total_amount}
          deliveryAddress={order.delivery_address}
          estimatedTime={order.created_at ? new Date(order.created_at).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }) : undefined}
          onClick={() => router.push(`/cliente/pedidos/${order.id}`)}
        />
      ))}
    </div>
  );
}

export default function ClientePedidos() {
  const { profile } = useAuth();
  return (
    <PageContainer>
      <PageTitle title="Mis Pedidos" description="Historial de todos tus pedidos" />
      <OrderProvider customerId={profile?.id}>
        <PedidosContent />
      </OrderProvider>
    </PageContainer>
  );
}
