'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { orderService, type OrderData, type OrderStatus, type CreateOrderItemInput } from '@/services/orders';

interface CreateOrderInput { customerId: string; customerName: string; businessId: string; businessName: string; items: CreateOrderItemInput[]; subtotal: number; deliveryFee: number; taxAmount: number; totalAmount: number; deliveryAddress: string; instructions: string; }
interface OrderContextValue { customerOrders: OrderData[]; businessOrders: OrderData[]; loading: boolean; refreshOrders: () => Promise<void>; getOrder: (id: string) => OrderData | undefined; createOrder: (input: CreateOrderInput) => Promise<OrderData>; updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>; acceptOrder: (orderId: string) => Promise<void>; rejectOrder: (orderId: string) => Promise<void>; }
const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children, customerId, businessId }: { children: React.ReactNode; customerId?: string; businessId?: string }) {
  const [customerOrders, setCustomerOrders] = useState<OrderData[]>([]); const [businessOrders, setBusinessOrders] = useState<OrderData[]>([]); const [loading, setLoading] = useState(true);
  const refreshOrders = useCallback(async () => { if (customerId) setCustomerOrders(await orderService.getCustomerOrders(customerId)); if (businessId) setBusinessOrders(await orderService.getBusinessOrders(businessId)); setLoading(false); }, [customerId, businessId]);
  useEffect(() => { void refreshOrders(); }, [refreshOrders]);
  useEffect(() => orderService.subscribe((updated) => { setCustomerOrders((prev) => { const index = prev.findIndex((order) => order.id === updated.id); if (index < 0) return [updated, ...prev]; const next = [...prev]; next[index] = updated; return next; }); setBusinessOrders((prev) => { const index = prev.findIndex((order) => order.id === updated.id); if (index < 0) return [updated, ...prev]; const next = [...prev]; next[index] = updated; return next; }); }), []);
  const getOrder = useCallback((id: string) => customerOrders.find((order) => order.id === id) ?? businessOrders.find((order) => order.id === id), [customerOrders, businessOrders]);
  const createOrder = useCallback((input: CreateOrderInput) => orderService.createOrder(input), []);
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => { await orderService.updateStatus(orderId, status); }, []);
  const acceptOrder = useCallback(async (orderId: string) => { await orderService.acceptOrder(orderId); }, []);
  const rejectOrder = useCallback(async (orderId: string) => { await orderService.rejectOrder(orderId); }, []);
  const value = useMemo(() => ({ customerOrders, businessOrders, loading, refreshOrders, getOrder, createOrder, updateOrderStatus, acceptOrder, rejectOrder }), [customerOrders, businessOrders, loading, refreshOrders, getOrder, createOrder, updateOrderStatus, acceptOrder, rejectOrder]);
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}
export function useOrders() { const context = useContext(OrderContext); if (!context) throw new Error('useOrders must be used within an OrderProvider'); return context; }
