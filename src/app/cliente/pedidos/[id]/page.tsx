'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/ui/page-container';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, OrderProvider } from '@/contexts/OrderContext';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import { TrackingProvider, useTracking } from '@/contexts/TrackingContext';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { DeliveryStatusTimeline } from '@/components/delivery/DeliveryStatusTimeline';
import { TrackingMap } from '@/components/tracking/TrackingMap';
import { EtaCard } from '@/components/tracking/EtaCard';
import { DeliveryProgress } from '@/components/tracking/DeliveryProgress';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { reviewService } from '@/services/reviews';
import { ArrowLeft, ClipboardList, Clock, MapPin, Truck, MessageCircle, Store } from 'lucide-react';

function OrderDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { getOrder, loading: orderLoading } = useOrders();
  const { getTrackingInfo, getDriverLocation, startTracking, stopTracking } = useTracking();
  const { openConversation, closeConversation } = useChat();
  const [showChat, setShowChat] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const orderId = params.id as string;
  const order = getOrder(orderId);

  const isDeliveryPhase = order && ['assigned', 'picked_up', 'in_transit', 'delivered'].includes(order.status);
  const trackingInfo = order ? getTrackingInfo(order.id) : undefined;
  const driverLocation = order ? getDriverLocation(order.id) : undefined;

  useEffect(() => {
    if (order && isDeliveryPhase) {
      startTracking(order.id, order.business_id, order.customer_id);
    }
    return () => {
      if (order) stopTracking(order.id);
    };
  }, [order, isDeliveryPhase, startTracking, stopTracking]);

  useEffect(() => {
    if (order?.status === 'delivered' && !reviewSubmitted && profile) {
      reviewService.hasOrderBeenReviewed(order.id).then((reviewed) => {
        if (!reviewed) setShowReview(true);
      });
    }
  }, [order?.status, order?.id, reviewSubmitted, profile]);

  const handleOpenChat = async () => {
    if (!order?.courier_id || !order?.courier_name) return;
    await openConversation(order.id, order.customer_id, order.customer_name, order.courier_id, order.courier_name);
    setShowChat(true);
  };

  const handleCloseChat = () => { closeConversation(); setShowChat(false); };

  if (orderLoading) return <LoadingState />;

  if (!order) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" />}
        title="Pedido no encontrado"
        description="Este pedido no existe o ha sido eliminado."
        action={
          <button onClick={() => router.push('/cliente/pedidos')} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
            Ver mis pedidos
          </button>
        }
      />
    );
  }

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
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-foreground truncate">{order.order_number}</span>
          <span className={`ml-auto shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[order.status] ?? 'bg-muted text-muted-foreground'}`}>
            {statusLabels[order.status] ?? order.status}
          </span>
        </div>
      </div>

      <PageContainer>
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{order.business_name}</h1>
              <p className="text-xs text-muted-foreground">{order.order_number}</p>
            </div>
          </div>

          {order.courier_id && !showChat && (
            <motion.button
              onClick={handleOpenChat}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 py-3.5 text-sm font-semibold text-primary transition-all hover:from-primary/20 hover:to-primary/10 border border-primary/10"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <MessageCircle className="h-5 w-5" />
              Chat con repartidor
            </motion.button>
          )}

          {showChat && (
            <div className="h-[400px] md:h-[480px] rounded-2xl overflow-hidden border border-border/30">
              <ChatWindow userRole="customer" onClose={handleCloseChat} />
            </div>
          )}

          {isDeliveryPhase && !showChat && (
            <div className="space-y-4">
              <TrackingMap trackingInfo={trackingInfo ?? null} driverLocation={driverLocation ?? null} />
              <EtaCard trackingInfo={trackingInfo ?? null} isLive={!!driverLocation} />
              <DeliveryProgress trackingInfo={trackingInfo ?? null} currentStatus={order.status} />
            </div>
          )}

          {!isDeliveryPhase && !showChat && (
            <motion.div
              className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="mb-4 text-sm font-bold text-foreground">Estado del pedido</h2>
              <OrderTimeline status={order.status} />
            </motion.div>
          )}

          {order.courier_id && !isDeliveryPhase && !showChat && (
            <motion.div
              className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Truck className="h-4 w-4 text-primary" />
                Repartidor asignado
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-base font-bold text-primary">
                  {order.courier_name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{order.courier_name}</p>
                  <p className="text-xs text-muted-foreground">Pronto compartirá su ubicación</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-muted/30 p-4">
                <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado de entrega</h3>
                <DeliveryStatusTimeline status={order.status} />
              </div>
            </motion.div>
          )}

          {isDeliveryPhase && order.courier_name && !showChat && (
            <motion.div
              className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Truck className="h-4 w-4 text-primary" />
                Repartidor
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-base font-bold text-primary">
                  {order.courier_name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{order.courier_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.status === 'in_transit' ? 'En camino a entregar tu pedido 🚀' : 'Preparando tu entrega'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="mb-4 text-base font-bold text-foreground">Artículos</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{item.quantity}x</span> {item.product_name}
                  </span>
                  <span className="text-foreground font-medium">${item.item_total.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border/20 pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span className="text-foreground">${order.delivery_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Impuestos</span>
                <span className="text-foreground">${order.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border/20 pt-3 text-base font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Dirección de entrega
            </h2>
            <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
            {order.special_instructions && (
              <>
                <h3 className="mb-1 mt-4 text-sm font-semibold text-foreground">Instrucciones especiales</h3>
                <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
              </>
            )}
          </motion.div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Pedido realizado el{' '}
            {new Date(order.created_at).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>

          <ReviewModal
            open={showReview}
            onClose={() => setShowReview(false)}
            orderId={order.id}
            customerId={profile?.id ?? ''}
            businessId={order.business_id}
            businessName={order.business_name}
            courierId={order.courier_id}
            courierName={order.courier_name}
            onSubmitted={() => setReviewSubmitted(true)}
          />
        </motion.div>
      </PageContainer>
    </div>
  );
}

export default function OrderDetailPage() {
  const { profile } = useAuth();
  return (
    <TrackingProvider>
      <ChatProvider userId={profile?.id ?? ''} userRole="customer">
        <OrderProvider customerId={profile?.id}>
          <OrderDetailContent />
        </OrderProvider>
      </ChatProvider>
    </TrackingProvider>
  );
}
