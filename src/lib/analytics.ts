'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

type EventParams = Record<string, string | number | boolean>;

export const analytics = {
  // Track custom events for the app
  track(eventName: string, params?: EventParams) {
    if (typeof window === 'undefined') return;
    try {
      // Google Analytics 4 (gtag)
      if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', eventName, params);
      }
      // Meta Pixel
      if (typeof (window as any).fbq === 'function') {
        (window as any).fbq('trackCustom', eventName, params);
      }
      // Console debug in dev
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] ${eventName}`, params);
      }
    } catch { /* analytics errors are non-blocking */ }
  },

  // User events
  userRegistered(role: string) { this.track('sign_up', { method: 'email', role }); },
  userLoggedIn(role: string) { this.track('login', { role }); },

  // Order events
  orderCreated(orderId: string, total: number, businessId: string) {
    this.track('purchase', {
      transaction_id: orderId,
      value: total,
      currency: 'COP',
      items: JSON.stringify([{ item_id: businessId }]),
    });
  },
  orderStatusChanged(orderId: string, status: string) {
    this.track('order_status_change', { order_id: orderId, status });
  },
  orderCancelled(orderId: string) { this.track('cancel_order', { order_id: orderId }); },

  // Cart events
  cartAdded(productId: string, name: string, price: number) {
    this.track('add_to_cart', { currency: 'COP', value: price, items: JSON.stringify([{ item_id: productId, item_name: name }]) });
  },
  cartRemoved(productId: string) { this.track('remove_from_cart', { product_id: productId }); },
  cartAbandoned(cartValue: number) { this.track('cart_abandoned', { value: cartValue }); },

  // Business events
  businessCreated(businessId: string, category: string) {
    this.track('business_created', { business_id: businessId, category });
  },

  // Courier events
  deliveryAccepted(orderId: string) { this.track('delivery_accepted', { order_id: orderId }); },
  deliveryCompleted(orderId: string) { this.track('delivery_completed', { order_id: orderId }); },

  // Page view
  pageView(path: string) {
    if (typeof window === 'undefined') return;
    try {
      if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', { page_path: path });
      }
    } catch { /* ignore */ }
  },
};
