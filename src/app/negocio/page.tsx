'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { businessService, type BusinessDashboardStats } from '@/services/business';
import { operationsService, type BusinessOperationState } from '@/services/operations';
import { financeService, type BusinessFinancialSummary } from '@/services/finance';
import { getBrowserClient } from '@/lib/db/supabase';
import { formatCOP } from '@/lib/money';
import { SkeletonStats } from '@/components/ui/skeleton';
import { LiveOperationsMapCard } from '@/components/operations/LiveOperationsMapCard';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Package,
  RefreshCw,
  ShoppingCart,
  Star,
  Store,
  UnlockKeyhole,
  WalletCards,
} from 'lucide-react';

const EMPTY_FINANCE: BusinessFinancialSummary = {
  business_id: '', delivered_orders: 0, product_sales: 0,
  company_owes_business: 0, business_owes_company: 0, net_balance: 0,
};

export default function NegocioDashboard() {
  const { profile } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [stats, setStats] = useState<BusinessDashboardStats | null>(null);
  const [finance, setFinance] = useState<BusinessFinancialSummary>(EMPTY_FINANCE);
  const [operation, setOperation] = useState<BusinessOperationState | null>(null);
  const [periodSales, setPeriodSales] = useState({ today: 0, week: 0, month: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const id = await businessService.getBusinessId(profile.id);
      if (!id) throw new Error('No existe un comercio asociado a esta cuenta');
      setBusinessId(id);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const week = new Date(today.getTime() - 6 * 86400000);
      const month = new Date(now.getFullYear(), now.getMonth(), 1);
      const supabase = getBrowserClient();
      const [dashboard, financial, state, orders] = await Promise.all([
        businessService.getDashboardStats(id),
        financeService.getBusinessSummary(id),
        operationsService.getBusinessState(id),
        supabase
          .from('orders')
          .select('merchant_earnings,actual_delivery_time,updated_at')
          .eq('business_id', id)
          .eq('status', 'delivered')
          .gte('updated_at', month.toISOString()),
      ]);
      const deliveredRows = orders.data ?? [];
      const calculate = (from: Date) => deliveredRows.reduce((sum, row) => {
        const date = new Date(row.actual_delivery_time || row.updated_at);
        return date >= from ? sum + Number(row.merchant_earnings ?? 0) : sum;
      }, 0);
      setStats(dashboard);
      setFinance(financial);
      setOperation(state);
      setPeriodSales({ today: calculate(today), week: calculate(week), month: calculate(month) });
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el panel del comercio');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { void load(); }, [load]);

  const toggleOperation = async () => {
    if (!businessId || updating) return;
    setUpdating(true);
    setError('');
    try {
      if (operation?.isOpen) await operationsService.closeBusiness(businessId);
      else await operationsService.openBusiness(businessId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la jornada');
    } finally {
      setUpdating(false);
    }
  };

  const balanceText = useMemo(() => {
    if (finance.net_balance > 0) return `DomiU te debe ${formatCOP(finance.net_balance)}`;
    if (finance.net_balance < 0) return `Debes entregar ${formatCOP(Math.abs(finance.net_balance))} a DomiU`;
    return 'Saldo conciliado';
  }, [finance.net_balance]);

  if (loading) return <SkeletonStats />;

  const cards = [
    { label: 'Ventas de productos hoy', value: formatCOP(periodSales.today), icon: WalletCards, note: 'Solo productos vendidos', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Ventas últimos 7 días', value: formatCOP(periodSales.week), icon: BarChart3, note: 'Pedidos entregados', tone: 'bg-blue-50 text-blue-700' },
    { label: 'Ventas del mes', value: formatCOP(periodSales.month), icon: Store, note: 'Ingreso del comercio', tone: 'bg-violet-50 text-violet-700' },
    { label: 'Pedidos activos', value: String(stats?.activeOrders ?? 0), icon: ShoppingCart, note: 'En preparación o entrega', tone: 'bg-amber-50 text-amber-700' },
    { label: 'Saldo de liquidación', value: formatCOP(Math.abs(finance.net_balance)), icon: CheckCircle2, note: balanceText, tone: finance.net_balance < 0 ? 'bg-red-50 text-red-700' : 'bg-cyan-50 text-cyan-700' },
    { label: 'Calificación', value: (stats?.rating ?? 0).toFixed(1), icon: Star, note: `${stats?.totalRatings ?? 0} reseñas`, tone: 'bg-yellow-50 text-yellow-700' },
  ];

  return (
    <div className="space-y-6 pb-6">
      <section className="overflow-hidden rounded-[2rem] bg-[#17191F] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FFD400]">Panel del comercio</p>
            <h1 className="mt-2 text-3xl font-black">Hola, {profile?.first_name || 'comercio'}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">Controla la jornada, pedidos, ventas de productos, liquidaciones y domicilios en vivo.</p>
            {operation?.openedAt && operation.isOpen && <p className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-300"><Clock3 className="h-4 w-4" />Abierto desde {new Date(operation.openedAt).toLocaleString('es-CO')}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15"><RefreshCw className="h-4 w-4" />Actualizar</button>
            <button type="button" onClick={() => void toggleOperation()} disabled={updating} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-60 ${operation?.isOpen ? 'bg-red-500 text-white' : 'bg-[#FFD400] text-[#17191F]'}`}>
              {operation?.isOpen ? <LockKeyhole className="h-4 w-4" /> : <UnlockKeyhole className="h-4 w-4" />}
              {updating ? 'Procesando…' : operation?.isOpen ? 'Cerrar jornada' : 'Abrir jornada'}
            </button>
          </div>
        </div>
      </section>

      <div className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${operation?.isOpen ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <div><p className="font-black">{operation?.isOpen ? 'Comercio abierto y recibiendo pedidos' : 'Comercio cerrado'}</p><p className="mt-1 text-xs text-muted-foreground">{operation?.isOpen ? 'Los clientes pueden confirmar pedidos.' : 'El sistema bloquea pedidos nuevos hasta abrir la jornada.'}</p></div>
        <span className={`h-3 w-3 rounded-full ${operation?.isOpen ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
      </div>

      {error && <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

      {businessId && <LiveOperationsMapCard scope="business" businessId={businessId} />}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, note, tone }) => (
          <article key={label} className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b px-5 py-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><h2 className="font-black">Productos más vendidos</h2></div><Link href="/negocio/productos" className="text-xs font-bold text-primary">Administrar</Link></header>
          <div className="p-5">
            {!stats?.topProducts?.length ? <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay ventas entregadas.</p> : (
              <div className="space-y-2">{stats.topProducts.slice(0, 8).map((product, index) => <div key={product.id} className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">{index + 1}</span><span className="text-sm font-bold">{product.name}</span></div><span className="text-xs text-muted-foreground">{product.total} vendidos</span></div>)}</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border bg-card p-5 shadow-sm">
          <h2 className="font-black">Liquidación actual</h2><p className="mt-1 text-xs text-muted-foreground">Movimientos de pedidos entregados pendientes de conciliar.</p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between rounded-2xl bg-emerald-50 px-4 py-3"><span>DomiU te debe</span><strong>{formatCOP(finance.company_owes_business)}</strong></div>
            <div className="flex justify-between rounded-2xl bg-amber-50 px-4 py-3"><span>Debes a DomiU</span><strong>{formatCOP(finance.business_owes_company)}</strong></div>
            <div className="flex justify-between border-t pt-4 text-base"><span>Saldo neto</span><strong>{formatCOP(finance.net_balance)}</strong></div>
          </div>
          <Link href="/negocio/reportes" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">Ver reportes <ArrowRight className="h-4 w-4" /></Link>
        </article>
      </section>
    </div>
  );
}
