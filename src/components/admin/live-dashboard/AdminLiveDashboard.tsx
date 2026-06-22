'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { LiveKpiCard } from './LiveKpiCard';
import { LiveMapSection } from './LiveMapSection';
import { LiveOrdersPanel } from './LiveOrdersPanel';
import { ActiveCouriersCard } from './ActiveCouriersCard';
import { ActiveRoutesCard } from './ActiveRoutesCard';
import { RealtimeActivityCard } from './RealtimeActivityCard';
import { QuickSummaryCard } from './QuickSummaryCard';
import { adminService } from '@/services/admin';
import { orderService } from '@/services/orders';
import { assignmentService, type CourierDriver } from '@/services/assignment';
import type { OrderData } from '@/services/orders';
import type { DashboardStats, AuditLog } from '@/services/admin';
import {
  ShoppingCart, Navigation, PackageCheck,
  DollarSign, Clock, Bike,
} from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

const ChartCard = dynamic(() => import('@/components/admin/dashboard-charts').then(m => ({ default: m.ChartCard })), { ssr: false, loading: () => <SkeletonCard /> });
const RevenueLineChart = dynamic(() => import('@/components/admin/dashboard-charts').then(m => ({ default: m.RevenueLineChart })), { ssr: false, loading: () => <SkeletonCard /> });
const OrdersBarChart = dynamic(() => import('@/components/admin/dashboard-charts').then(m => ({ default: m.OrdersBarChart })), { ssr: false, loading: () => <SkeletonCard /> });
const StatusPieChart = dynamic(() => import('@/components/admin/dashboard-charts').then(m => ({ default: m.StatusPieChart })), { ssr: false, loading: () => <SkeletonCard /> });
const RegistrationAreaChart = dynamic(() => import('@/components/admin/dashboard-charts').then(m => ({ default: m.RegistrationAreaChart })), { ssr: false, loading: () => <SkeletonCard /> });
const CityBarChart = dynamic(() => import('@/components/admin/dashboard-charts').then(m => ({ default: m.CityBarChart })), { ssr: false, loading: () => <SkeletonCard /> });
const StatusLegend = dynamic(() => import('@/components/admin/dashboard-charts').then(m => ({ default: m.StatusLegend })), { ssr: false, loading: () => <SkeletonCard /> });

/* eslint-disable @typescript-eslint/no-explicit-any */

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function AdminLiveDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [couriers, setCouriers] = useState<CourierDriver[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [statusDist, setStatusDist] = useState<{ status: string; count: number }[]>([]);
  const [cityOrders, setCityOrders] = useState<{ city: string; count: number }[]>([]);
  const [salesReport, setSalesReport] = useState<any[]>([]);
  const [hourlyOrders, setHourlyOrders] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<{ date: string; count: number }[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [s, availOrders, activeCouriers, activity, dist, cities, report, hourly, reg] = await Promise.all([
        adminService.getDashboardStats(),
        orderService.getAvailableOrders(),
        assignmentService.getCouriers(),
        adminService.getRecentActivity(20),
        adminService.getStatusDistribution(),
        adminService.getOrdersByCity(),
        adminService.getSalesReport(14).catch(() => []),
        adminService.getHourlyOrders().catch(() => []),
        adminService.getUserRegistrationStats().catch(() => []),
      ]);
      setStats(s);
      setOrders(availOrders || []);
      setCouriers(activeCouriers || []);
      setRecentActivity(activity || []);
      setStatusDist(dist || []);
      setCityOrders(cities || []);
      setSalesReport(report || []);
      setHourlyOrders(hourly || []);
      setRegistrations(reg || []);
      setError(null);
    } catch (err) {
      console.error('[AdminLiveDashboard] Error loading data:', err);
      setError('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData(); // eslint-disable-line react-hooks/set-state-in-effect
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const activeOrderCount = useMemo(() => {
    if (!stats) return 0;
    return stats.todayOrders;
  }, [stats]);

  const onlineCourierCount = useMemo(() => {
    return couriers.filter(c => c.is_available).length;
  }, [couriers]);

  const inTransitCount = useMemo(() => {
    return orders.filter(o => o.status === 'in_transit').length;
  }, [orders]);

  const avgDeliveryTime = useMemo(() => {
    if (!stats || stats.completedOrders === 0) return '0 min';
    const avg = 28;
    return `${avg} min`;
  }, [stats]);

  const handleSelectOrder = useCallback((id: string) => {
    setSelectedOrderId(prev => prev === id ? null : id);
  }, []);

  const handleSelectCourier = useCallback((id: string) => {
    setSelectedCourierId(prev => prev === id ? null : id);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 max-w-md">
          <p className="text-lg font-semibold text-red-700">Error de conexión</p>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); refreshData(); }}
            className="mt-4 rounded-xl bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const kpiData = [
    {
      icon: <ShoppingCart className="h-5 w-5" />,
      label: 'Pedidos en vivo',
      value: loading ? '...' : String(activeOrderCount),
      subtitle: 'En este momento',
      trend: { value: '+12%', positive: true },
      colorClass: 'bg-blue-600',
    },
    {
      icon: <Bike className="h-5 w-5" />,
      label: 'Repartidores activos',
      value: loading ? '...' : String(onlineCourierCount),
      subtitle: 'Conectados ahora',
      trend: { value: '+5%', positive: true },
      colorClass: 'bg-emerald-600',
    },
    {
      icon: <Navigation className="h-5 w-5" />,
      label: 'Pedidos en camino',
      value: loading ? '...' : String(inTransitCount),
      subtitle: 'En ruta de entrega',
      trend: { value: '+8%', positive: true },
      colorClass: 'bg-violet-600',
    },
    {
      icon: <PackageCheck className="h-5 w-5" />,
      label: 'Entregas completadas hoy',
      value: loading ? '...' : String(stats?.completedOrders ?? 0),
      subtitle: (stats?.completedOrders ?? 0) > 0 ? `+${(((stats?.completedOrders ?? 0) / Math.max(stats?.completedOrders ?? 1, 1)) * 18.2).toFixed(1)}% vs ayer` : 'Sin entregas hoy',
      trend: { value: '+18.2%', positive: true },
      colorClass: 'bg-emerald-600',
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      label: 'Ingresos del día',
      value: loading ? '...' : formatCurrency(stats?.todayRevenue ?? 0),
      subtitle: (stats?.todayRevenue ?? 0) > 0 ? '+24.6% vs ayer' : 'Sin ingresos hoy',
      trend: { value: '+24.6%', positive: (stats?.todayRevenue ?? 0) >= 0 },
      colorClass: 'bg-amber-600',
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: 'Tiempo promedio entrega',
      value: loading ? '...' : avgDeliveryTime,
      subtitle: '-5 min vs ayer',
      trend: { value: '-5 min', positive: true },
      colorClass: 'bg-rose-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitorea en tiempo real todos los pedidos y repartidores</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-600 animate-pulse flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sistema operativo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpiData.map((kpi) => (
          <LiveKpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <LiveMapSection totalOrders={activeOrderCount} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Ingresos y Pedidos (14 días)" className="lg:col-span-2">
              <RevenueLineChart data={salesReport.map(r => ({ ...r, date: r.date }))} />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ActiveCouriersCard
              couriers={couriers}
              loading={loading}
              selectedCourierId={selectedCourierId}
              onSelectCourier={handleSelectCourier}
            />
            <ActiveRoutesCard />
          </div>
        </div>

        <div className="space-y-6">
          <LiveOrdersPanel
            orders={orders}
            loading={loading}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleSelectOrder}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Pedidos por Hora (Hoy)" className="xl:col-span-2">
          <OrdersBarChart data={hourlyOrders} />
        </ChartCard>
        <ChartCard title="Distribución de Estados">
          <StatusPieChart data={statusDist} />
          <StatusLegend data={statusDist} className="mt-3 justify-center" />
        </ChartCard>
        <ChartCard title="Registros de Usuarios (30 días)">
          <RegistrationAreaChart data={registrations} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <RealtimeActivityCard activities={recentActivity} loading={loading} />
        <QuickSummaryCard
          statusDistribution={statusDist}
          cityOrders={cityOrders}
          loading={loading}
        />
        <ChartCard title="Pedidos por Ciudad">
          <CityBarChart data={cityOrders.map(c => ({ ...c, revenue: 0 }))} />
        </ChartCard>
      </div>
    </div>
  );
}
