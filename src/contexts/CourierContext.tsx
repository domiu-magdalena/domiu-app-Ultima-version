'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { orderService, type OrderData, type OrderStatus } from '@/services/orders';
import {
  assignmentService,
  type AssignmentRequest,
  type CourierDriver,
} from '@/services/assignment';
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

export interface CourierFinancialBalance {
  netBalance: number;
  companyOwesCourier: number;
  courierOwesCompany: number;
  lifetimeEarnings: number;
  lifetimeCashCollected: number;
  lastMovementAt: string | null;
}

interface CourierContextValue {
  courier: CourierDriver | null;
  availableOrders: OrderData[];
  activeDeliveries: OrderData[];
  deliveryHistory: OrderData[];
  earnings: DeliveryEarning[];
  financialBalance: CourierFinancialBalance | null;
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

function asMoney(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

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
  const [financialBalance, setFinancialBalance] = useState<CourierFinancialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<AssignmentRequest[]>([]);

  const refresh = useCallback(async () => {
    if (!courierId) {
      setLoading(false);
      return;
    }

    try {
      const supabase = getBrowserClient();
      const [courierRow, available, courierOrders, requests, financialOrders, balanceResult] =
        await Promise.all([
          assignmentService.getCourierById(courierId),
          orderService.getAvailableOrders(),
          orderService.getCourierOrders(courierId),
          assignmentService.getPendingRequests(courierId),
          supabase
            .from('orders')
            .select('id,order_number,courier_earnings,delivery_fee,status,updated_at,businesses(name)')
            .eq('courier_id', courierId)
            .eq('status', 'delivered')
            .is('deleted_at', null)
            .order('updated_at', { ascending: false }),
          supabase
            .from('courier_balance_summary_v')
            .select('net_balance_cop,company_owes_courier_cop,courier_owes_company_cop,lifetime_earnings_cop,lifetime_cash_collected_cop,last_movement_at')
            .eq('courier_id', courierId)
            .maybeSingle(),
        ]);

      setCourier(courierRow ?? null);
      setAvailableOrders(available);
      setActiveDeliveries(
        courierOrders.filter((order) => !['delivered', 'cancelled'].includes(order.status)),
      );
      setDeliveryHistory(
        courierOrders.filter((order) => ['delivered', 'cancelled'].includes(order.status)),
      );
      setPendingRequests(requests);

      const orderNameById = new Map(
        courierOrders.map((order) => [order.id, order.business_name]),
      );
      const exactEarnings: DeliveryEarning[] = (financialOrders.data ?? []).map((row) => {
        const relation = row.businesses as { name?: string } | Array<{ name?: string }> | null;
        const relatedName = Array.isArray(relation) ? relation[0]?.name : relation?.name;
        const stored = asMoney(row.courier_earnings);
        const safeFallback = Math.round(asMoney(row.delivery_fee) * 0.8);
        return {
          id: `earn-${row.id}`,
          order_id: String(row.id),
          order_number: String(row.order_number),
          amount: stored > 0 ? stored : safeFallback,
          date: String(row.updated_at),
          business_name:
            relatedName || orderNameById.get(String(row.id)) || 'Comercio',
        };
      });
      setEarnings(exactEarnings);

      if (balanceResult.data) {
        setFinancialBalance({
          netBalance: asMoney(balanceResult.data.net_balance_cop),
          companyOwesCourier: asMoney(balanceResult.data.company_owes_courier_cop),
          courierOwesCompany: asMoney(balanceResult.data.courier_owes_company_cop),
          lifetimeEarnings: asMoney(balanceResult.data.lifetime_earnings_cop),
          lifetimeCashCollected: asMoney(balanceResult.data.lifetime_cash_collected_cop),
          lastMovementAt: balanceResult.data.last_movement_at
            ? String(balanceResult.data.last_movement_at)
            : null,
        });
      } else {
        setFinancialBalance({
          netBalance: exactEarnings.reduce((sum, item) => sum + item.amount, 0),
          companyOwesCourier: exactEarnings.reduce((sum, item) => sum + item.amount, 0),
          courierOwesCompany: 0,
          lifetimeEarnings: exactEarnings.reduce((sum, item) => sum + item.amount, 0),
          lifetimeCashCollected: 0,
          lastMovementAt: exactEarnings[0]?.date ?? null,
        });
      }
    } catch (error) {
      console.error('[CourierContext] refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [courierId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unsubscribeOrders = orderService.subscribe((order) => {
      setActiveDeliveries((previous) => {
        const index = previous.findIndex((item) => item.id === order.id);
        if (index >= 0) {
          if (['delivered', 'cancelled'].includes(order.status)) {
            return previous.filter((item) => item.id !== order.id);
          }
          const next = [...previous];
          next[index] = order;
          return next;
        }
        if (order.courier_id === courierId && !['delivered', 'cancelled'].includes(order.status)) {
          return [...previous, order];
        }
        return previous;
      });

      setDeliveryHistory((previous) => {
        if (!['delivered', 'cancelled'].includes(order.status) || order.courier_id !== courierId) {
          return previous;
        }
        const index = previous.findIndex((item) => item.id === order.id);
        if (index < 0) return [order, ...previous];
        const next = [...previous];
        next[index] = order;
        return next;
      });

      setAvailableOrders((previous) => {
        const isAvailable =
          (['confirmed', 'ready'].includes(order.status) && !order.courier_id) ||
          (order.status === 'pending' && order.order_type === 'manual_delivery' && !order.courier_id);
        if (isAvailable) {
          const index = previous.findIndex((item) => item.id === order.id);
          if (index < 0) return [order, ...previous];
          const next = [...previous];
          next[index] = order;
          return next;
        }
        return previous.filter((item) => item.id !== order.id);
      });

      if (order.courier_id === courierId && ['delivered', 'cancelled'].includes(order.status)) {
        void refresh();
      }
    });

    const unsubscribeRequests = assignmentService.subscribeRequests((request) => {
      if (request.courier_id !== courierId) return;
      setPendingRequests((previous) => {
        const index = previous.findIndex((item) => item.id === request.id);
        if (index < 0) return [...previous, request];
        const next = [...previous];
        next[index] = request;
        return next;
      });
    });

    let channel: ReturnType<ReturnType<typeof getBrowserClient>['channel']> | null = null;
    if (courierId) {
      const supabase = getBrowserClient();
      channel = supabase
        .channel(`courier-finance-realtime-${courierId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `courier_id=eq.${courierId}` },
          () => void refresh(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'financial_ledger_entries', filter: `account_id=eq.${courierId}` },
          () => void refresh(),
        )
        .subscribe();
    }

    return () => {
      unsubscribeOrders();
      unsubscribeRequests();
      if (channel) void getBrowserClient().removeChannel(channel);
    };
  }, [courierId, refresh]);

  const toggleAvailability = useCallback(async () => {
    if (!courierId) return;
    const updated = await assignmentService.toggleAvailability(courierId);
    if (updated) setCourier(updated);
  }, [courierId]);

  const setCourierStatus = useCallback(
    async (status: DriverStatus) => {
      if (!courierId) return;
      const updated = await assignmentService.setCourierStatus(courierId, status);
      if (updated) setCourier(updated);
    },
    [courierId],
  );

  const acceptDelivery = useCallback(
    async (orderId: string) => {
      if (!courierId || !courier) return;
      await orderService.assignCourier(orderId, courierId, courier.name);
      await orderService.updateStatus(orderId, 'assigned');
      await refresh();
    },
    [courierId, courier, refresh],
  );

  const updateDeliveryStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      await orderService.updateStatus(orderId, status);
      await refresh();
    },
    [refresh],
  );

  const todayEarnings = useMemo(() => {
    const today = new Date().toDateString();
    return earnings
      .filter((earning) => new Date(earning.date).toDateString() === today)
      .reduce((sum, earning) => sum + earning.amount, 0);
  }, [earnings]);

  const weekEarnings = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return earnings
      .filter((earning) => new Date(earning.date) >= start)
      .reduce((sum, earning) => sum + earning.amount, 0);
  }, [earnings]);

  const monthEarnings = useMemo(() => {
    const now = new Date();
    return earnings
      .filter((earning) => {
        const date = new Date(earning.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, earning) => sum + earning.amount, 0);
  }, [earnings]);

  const totalEarnings = useMemo(
    () => earnings.reduce((sum, earning) => sum + earning.amount, 0),
    [earnings],
  );

  const value = useMemo<CourierContextValue>(
    () => ({
      courier,
      availableOrders,
      activeDeliveries,
      deliveryHistory,
      earnings,
      financialBalance,
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
      financialBalance,
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
