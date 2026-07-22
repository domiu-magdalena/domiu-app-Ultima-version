'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { orderService, type OrderData, type OrderStatus } from '@/services/orders';
import { assignmentService, type CourierDriver, type AssignmentRequest } from '@/services/assignment';
import { operationsService } from '@/services/operations';
import type { DriverStatus } from '@/types/database';
import { getBrowserClient } from '@/lib/db/supabase';

export interface DeliveryEarning {
  id: string;
  order_id: string;
  order_number: string;
  amount: number;
  date: string;
  business_name: string;
}

interface CourierContextValue {
  courier: CourierDriver | null;
  availableOrders: OrderData[];
  activeDeliveries: OrderData[];
  deliveryHistory: OrderData[];
  earnings: DeliveryEarning[];
  loading: boolean;
  isAvailable: boolean;
  courierStatus: DriverStatus | null;
  pendingRequests: AssignmentRequest[];
  toggleAvailability: () => Promise<void>;
  setCourierStatus: (status: DriverStatus) => Promise<void>;
  acceptDelivery: (orderId: string) => Promise<void>;
  updateDeliveryStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  refresh: () => Promise<void>;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
}

const CourierContext = createContext<CourierContextValue | null>(null);

export function CourierProvider({
  children,
  courierId,
}: {
  children: React.ReactNode;
  courierId?: string;
}) {
  const [courier, setCourier] = useState<CourierDriver | null>(null);
  const [availableOrders, setAvailableOrders] = useState<OrderData[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<OrderData[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<OrderData[]>([]);
  const [earnings, setEarnings] = useState<DeliveryEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<AssignmentRequest[]>([]);

  const clearOperationalLists = useCallback(() => {
    setAvailableOrders([]);
    setActiveDeliveries([]);
    setDeliveryHistory([]);
    setEarnings([]);
    setPendingRequests([]);
  }, []);

  const refresh = useCallback(async () => {
    if (!courierId) {
      setCourier(null);
      clearOperationalLists();
      setLoading(false);
      return;
    }

    try {
      const [courierProfile, shift] = await Promise.all([
        assignmentService.getCourierById(courierId),
        operationsService.getCourierShift(courierId),
      ]);

      setCourier(courierProfile ?? null);

      // Una jornada cerrada no debe heredar pedidos, historial ni solicitudes de jornadas anteriores.
      if (!shift.isOpen || !shift.startedAt) {
        clearOperationalLists();
        return;
      }

      const [available, courierOrders, requests] = await Promise.all([
        orderService.getAvailableOrders(),
        orderService.getCourierOrders(courierId),
        assignmentService.getPendingRequests(courierId),
      ]);

      const shiftStartedAt = new Date(shift.startedAt).getTime();
      const belongsToCurrentShift = (value: string) => {
        const timestamp = new Date(value).getTime();
        return Number.isFinite(timestamp) && timestamp >= shiftStartedAt;
      };

      const shiftOrders = courierOrders.filter((order) => belongsToCurrentShift(order.updated_at));
      const shiftRequests = requests.filter((request) => belongsToCurrentShift(request.created_at));

      setAvailableOrders(available);
      setActiveDeliveries(shiftOrders.filter((order) => !['delivered', 'cancelled'].includes(order.status)));
      setDeliveryHistory(shiftOrders.filter((order) => ['delivered', 'cancelled'].includes(order.status)));
      setPendingRequests(shiftRequests);

      const earned: DeliveryEarning[] = shiftOrders
        .filter((order) => order.status === 'delivered')
        .map((order) => ({
          id: `earn-${order.id}`,
          order_id: order.id,
          order_number: order.order_number,
          amount: assignmentService.calculateEarnings(3.0, 2.5),
          date: order.updated_at,
          business_name: order.business_name,
        }));
      setEarnings(earned);
    } catch (error) {
      console.error('[CourierContext] refresh error:', error);
      clearOperationalLists();
    } finally {
      setLoading(false);
    }
  }, [clearOperationalLists, courierId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unsubscribeOrder = orderService.subscribe(() => {
      void refresh();
    });

    const unsubscribeRequest = assignmentService.subscribeRequests((request) => {
      if (request.courier_id === courierId) void refresh();
    });

    let channel: ReturnType<ReturnType<typeof getBrowserClient>['channel']> | null = null;

    if (courierId) {
      const supabase = getBrowserClient();
      channel = supabase
        .channel(`courier-orders-realtime-${courierId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => void refresh(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'courier_shifts', filter: `courier_id=eq.${courierId}` },
          () => void refresh(),
        )
        .subscribe();
    }

    return () => {
      unsubscribeOrder();
      unsubscribeRequest();
      if (channel) {
        const supabase = getBrowserClient();
        void supabase.removeChannel(channel);
      }
    };
  }, [courierId, refresh]);

  const toggleAvailability = useCallback(async () => {
    if (!courierId) return;
    const updated = await assignmentService.toggleAvailability(courierId);
    if (updated) setCourier(updated);
  }, [courierId]);

  const setCourierStatus = useCallback(async (status: DriverStatus) => {
    if (!courierId) return;
    const updated = await assignmentService.setCourierStatus(courierId, status);
    if (updated) setCourier(updated);
  }, [courierId]);

  const acceptDelivery = useCallback(async (orderId: string) => {
    if (!courierId || !courier) return;
    await orderService.assignCourier(orderId, courierId, courier.name);
    await orderService.updateStatus(orderId, 'assigned');
    await refresh();
  }, [courierId, courier, refresh]);

  const updateDeliveryStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    await orderService.updateStatus(orderId, status);
    await refresh();
  }, [refresh]);

  const todayEarnings = useMemo(
    () =>
      earnings
        .filter((earning) => new Date(earning.date).toDateString() === new Date().toDateString())
        .reduce((sum, earning) => sum + earning.amount, 0),
    [earnings],
  );

  const weekEarnings = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return earnings
      .filter((earning) => new Date(earning.date) >= weekStart)
      .reduce((sum, earning) => sum + earning.amount, 0);
  }, [earnings]);

  const monthEarnings = useMemo(() => {
    const now = new Date();
    return earnings
      .filter(
        (earning) =>
          new Date(earning.date).getMonth() === now.getMonth() &&
          new Date(earning.date).getFullYear() === now.getFullYear(),
      )
      .reduce((sum, earning) => sum + earning.amount, 0);
  }, [earnings]);

  const totalEarnings = useMemo(
    () => earnings.reduce((sum, earning) => sum + earning.amount, 0),
    [earnings],
  );

  const value = useMemo(
    () => ({
      courier,
      availableOrders,
      activeDeliveries,
      deliveryHistory,
      earnings,
      loading,
      isAvailable: courier?.is_available ?? false,
      courierStatus: courier?.status ?? null,
      pendingRequests,
      toggleAvailability,
      setCourierStatus,
      acceptDelivery,
      updateDeliveryStatus,
      refresh,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      totalEarnings,
    }),
    [
      courier,
      availableOrders,
      activeDeliveries,
      deliveryHistory,
      earnings,
      loading,
      pendingRequests,
      toggleAvailability,
      setCourierStatus,
      acceptDelivery,
      updateDeliveryStatus,
      refresh,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      totalEarnings,
    ],
  );

  return <CourierContext.Provider value={value}>{children}</CourierContext.Provider>;
}

export function useCourier(): CourierContextValue {
  const context = useContext(CourierContext);
  if (!context) throw new Error('useCourier must be used within a CourierProvider');
  return context;
}
