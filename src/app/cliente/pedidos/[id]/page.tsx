'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bike, MessageCircle, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useChat } from '@/contexts/ChatContext';
import { orderService, type OrderData } from '@/services/orders';
import { reviewService } from '@/services/reviews';
import type { MarketplaceProduct } from '@/services/marketplace';
import { getBrowserClient } from '@/lib/db/supabase';
import { SkeletonCard } from '@/components/ui/skeleton';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { CustomerOrderLiveMap } from '@/components/customer/CustomerOrderLiveMap';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

type CourierInfo = {
  name: string;
  avatarUrl: string | null;
  plate: string | null;
  vehicleModel: string | null;
  rating: number;
  totalDeliveries: number;
};

type TrackingMeta = {
  distanceKm: number | null;
  estimatedDeliveryTime: string | null;
};

const CHAT_STATUSES = ['assigned', 'accepted', 'picked_up', 'in_transit'];

export default function ClientePedidoDetalle() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { clearCart, addItem } = useCart();
  const { openConversation, closeConversation } = useChat();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [courier, setCourier] = useState<CourierInfo | null>(null);
  const [trackingMeta, setTrackingMeta] = useState<TrackingMeta>({ distanceKm: null, estimatedDeliveryTime: null });
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reordering, setReordering] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!params.id) return;
    const supabase = getBrowserClient();
    const [result, metadataResult] = await Promise.all([
      orderService.getOrderById(params.id),
      supabase
        .from('orders')
        .select('delivery_distance_km,estimated_delivery_time')
        .eq('id', params.id)
        .maybeSingle(),
    ]);
    setOrder(result);
    setTrackingMeta({
      distanceKm: metadataResult.data?.delivery_distance_km == null ? null : Number(metadataResult.data.delivery_distance_km),
      estimatedDeliveryTime: metadataResult.data?.estimated_delivery_time ?? null,
    });
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    void loadOrder();
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`customer-order-${params.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${params.id}` },
        () => void loadOrder(),
      )
      .subscribe();
    const polling = window.setInterval(() => void loadOrder(), 15_000);
    return () => {
      window.clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [loadOrder, params.id]);

  useEffect(() => {
    if (!order?.courier_id) {
      setCourier(null);
      return;
    }
    const supabase = getBrowserClient();
    void Promise.all([
      supabase.from('profiles').select('first_name,last_name,avatar_url').eq('id', order.courier_id).single(),
      supabase.from('drivers').select('vehicle_plate,vehicle_model,rating,completed_deliveries').eq('id', order.courier_id).single(),
    ]).then(([profileResult, driverResult]) => {
      setCourier({
        name: [profileResult.data?.first_name, profileResult.data?.last_name].filter(Boolean).join(' ') || order.courier_name || 'Repartidor DomiU',
        avatarUrl: profileResult.data?.avatar_url ?? null,
        plate: driverResult.data?.vehicle_plate ?? null,
        vehicleModel: driverResult.data?.vehicle_model ?? null,
        rating: Number(driverResult.data?.rating ?? 0),
        totalDeliveries: Number(driverResult.data?.completed_deliveries ?? 0),
      });
    });
  }, [order?.courier_id, order?.courier_name]);

  useEffect(() => {
    if (order?.status === 'delivered' && !reviewSubmitted && profile) {
      void reviewService.hasOrderBeenReviewed(order.id).then((reviewed) => {
        if (!reviewed) setShowReview(true);
      });
    }
  }, [order?.status, order?.id, reviewSubmitted, profile]);

  const handleOpenChat = async () => {
    if (!order?.courier_id || !courier || !CHAT_STATUSES.includes(order.status)) return;
    await openConversation(
      order.id,
      order.customer_id,
      order.customer_name,
      order.courier_id,
      courier.name,
    );
    setShowChat(true);
  };

  const handleReorder = async () => {
    if (!order || reordering) return;
    setReordering(true);
    try {
      clearCart();
      for (const item of order.items) {
        const product: MarketplaceProduct = {
          id: item.product_id,
          business_id: order.business_id,
          name: item.product_name,
          price: item.unit_price,
          description: '',
          image_url: null,
          is_available: true,
        };
        addItem(product, order.business_id, order.business_name, {
          quantity: item.quantity,
          unitPrice: item.unit_price,
          customization: item.variant_selections || undefined,
        });
      }
      router.push('/cliente/cart');
    } finally {
      setReordering(false);
    }
  };

  if (loading) return <SkeletonCard />;
  if (!order) return <div className="p-12 text-center text-muted-foreground">Pedido no encontrado</div>;

  const chatAvailable = Boolean(order.courier_id && courier && CHAT_STATUSES.includes(order.status));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <section className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Pedido en seguimiento</p>
            <h1 className="text-2xl font-black">#{order.order_number}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{order.business_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black">{formatCurrency(order.total_amount)}</p>
            <p className="text-xs text-muted-foreground">Domicilio: {formatCurrency(order.delivery_fee)}</p>
          </div>
        </div>
      </section>

      <OrderTimeline status={order.status} />

      {courier && (
        <section className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-primary/10">
              {courier.avatarUrl ? (
                <Image src={courier.avatarUrl} alt={courier.name} fill className="object-cover" sizes="64px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-black text-primary">{courier.name.charAt(0)}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><h2 className="text-lg font-black">{courier.name}</h2><ShieldCheck className="h-5 w-5 text-success" /></div>
              <p className="text-sm text-muted-foreground">Repartidor asignado</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-3 py-1 font-semibold"><Bike className="mr-1 inline h-3.5 w-3.5" />{courier.vehicleModel || 'Vehículo registrado'}</span>
                <span className="rounded-full bg-slate-900 px-3 py-1 font-black text-white">Placa {courier.plate || 'pendiente'}</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700"><Star className="mr-1 inline h-3.5 w-3.5 fill-current" />{courier.rating.toFixed(1)} · {courier.totalDeliveries} entregas</span>
              </div>
            </div>
            {chatAvailable && (
              <button type="button" onClick={() => void handleOpenChat()} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">
                <MessageCircle className="h-4 w-4" /> Chat de entrega
              </button>
            )}
          </div>
          <p className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">Este chat se habilita únicamente durante la entrega y se cierra al finalizar o cancelar el pedido.</p>
        </section>
      )}

      <CustomerOrderLiveMap
        orderId={order.id}
        courierId={order.courier_id}
        status={order.status}
        pickupAddress={order.pickup_address}
        pickupLat={order.pickup_lat}
        pickupLng={order.pickup_lng}
        deliveryAddress={order.delivery_address}
        deliveryLat={order.delivery_lat}
        deliveryLng={order.delivery_lng}
        storedDistanceKm={trackingMeta.distanceKm}
        estimatedDeliveryTime={trackingMeta.estimatedDeliveryTime}
      />

      <section className="rounded-3xl border bg-card p-5">
        <h2 className="font-black">Productos</h2>
        <div className="mt-4 space-y-3">
          {order.items.map((item) => (
            <div key={`${item.product_id}-${item.product_name}`} className="flex justify-between gap-3 border-b pb-3 last:border-0">
              <div><p className="font-medium">{item.quantity}x {item.product_name}</p>{item.special_instructions && <p className="mt-1 text-xs text-muted-foreground">{item.special_instructions}</p>}</div>
              <p className="font-semibold">{formatCurrency(item.item_total)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => void handleReorder()} disabled={reordering} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${reordering ? 'animate-spin' : ''}`} /> Volver a pedir
        </button>
        {order.status === 'delivered' && (
          <button type="button" onClick={() => setShowReview(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">
            <Star className="h-4 w-4" /> Calificar experiencia
          </button>
        )}
      </div>

      {showChat && <ChatWindow userRole="customer" onClose={() => { closeConversation(); setShowChat(false); }} />}
      {profile && (
        <ReviewModal
          open={showReview}
          orderId={order.id}
          customerId={profile.id}
          businessId={order.business_id}
          businessName={order.business_name}
          courierId={order.courier_id}
          courierName={courier?.name || order.courier_name}
          onClose={() => setShowReview(false)}
          onSubmitted={() => { setReviewSubmitted(true); setShowReview(false); }}
        />
      )}
    </main>
  );
}
