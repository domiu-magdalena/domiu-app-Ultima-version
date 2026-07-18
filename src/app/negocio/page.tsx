'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Package,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { businessService, type BusinessDashboardStats } from '@/services/business';
import {
  businessFinanceService,
  type BusinessFinancialStats,
} from '@/services/business-finance';
import { formatCop } from '@/lib/money/cop';
import { SkeletonStats } from '@/components/ui/skeleton';
import { BusinessOperationControl } from '@/components/business/BusinessOperationControl';
import { LiveOperationsMapCard } from '@/components/operations/LiveOperationsMapCard';

export default function NegocioDashboard() {
  const { profile } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [general, setGeneral] = useState<BusinessDashboardStats | null>(null);
  const [financial, setFinancial] = useState<BusinessFinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    const load = async () => {
      try {
        const id = await businessService.getBusinessId(profile.id);
        if (!id) throw new Error('No se encontró el comercio asociado a tu cuenta');
        const [generalStats, financialStats] = await Promise.all([
          businessService.getDashboardStats(id),
          businessFinanceService.getStats(id),
        ]);
        if (!active) return;
        setBusinessId(id);
        setGeneral(generalStats);
        setFinancial(financialStats);
        setError('');
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el panel');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [profile?.id]);

  if (loading) return <SkeletonStats />;

  const cards = [
    {
      label: 'Ventas de productos hoy',
      value: formatCop(financial?.todayProductSales ?? 0),
      subtitle: 'El comercio recibe este valor; no incluye domicilio ni tarifa DomiU.',
      icon: Wallet,
    },
    {
      label: 'Ventas de productos semana',
      value: formatCop(financial?.weekProductSales ?? 0),
      subtitle: 'Últimos 7 días, solo pedidos entregados.',
      icon: TrendingUp,
    },
    {
      label: 'Ventas de productos mes',
      value: formatCop(financial?.monthProductSales ?? 0),
      subtitle: 'Acumulado del mes actual.',
      icon: Store,
    },
    {
      label: 'Ticket promedio de productos',
      value: formatCop(financial?.averageProductTicket ?? 0),
      subtitle: 'Promedio real sin costos de entrega.',
      icon: ShoppingCart,
    },
    {
      label: 'Pedidos activos',
      value: String(financial?.activeOrders ?? 0),
      subtitle: 'En preparación, asignación o entrega.',
      icon: Package,
    },
    {
      label: 'Pedidos entregados',
      value: String(financial?.deliveredOrders ?? 0),
      subtitle: 'Pedidos cerrados correctamente.',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <section className="overflow-hidden rounded-[2rem] border bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-amber-100">
              <Sparkles className="h-3.5 w-3.5" /> Centro de operación del comercio
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">
              Hola, {profile?.first_name || 'comercio'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Abre tu jornada, controla pedidos, inventario, ventas de productos y seguimiento en vivo desde un solo lugar.
            </p>
          </div>
          <Link
            href="/negocio/productos"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground"
          >
            <Package className="h-4 w-4" /> Administrar catálogo
          </Link>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <BusinessOperationControl />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, subtitle, icon: Icon }) => (
          <article key={label} className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-3 text-2xl font-black">{value}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{subtitle}</p>
          </article>
        ))}
      </section>

      <LiveOperationsMapCard mode="business" />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-black">Productos más vendidos</h2>
              <p className="text-xs text-muted-foreground">
                Ranking basado en unidades pedidas.
              </p>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {financial?.catalog.totalProducts ?? 0} productos
            </span>
          </div>
          <div className="space-y-2 p-5">
            {general?.topProducts?.length ? (
              general.topProducts.slice(0, 7).map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-2xl border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold">{product.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {product.total} vendidos
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay productos vendidos.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-black">Revisión de catálogo para Domi</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Domi utilizará estos datos para alertar sobre inventario, imágenes y productos incompletos.
          </p>
          <div className="mt-5 space-y-3">
            <CatalogRow
              icon={<CheckCircle2 className="h-4 w-4 text-success" />}
              label="Productos disponibles"
              value={financial?.catalog.availableProducts ?? 0}
            />
            <CatalogRow
              icon={<AlertTriangle className="h-4 w-4 text-warning" />}
              label="Inventario bajo"
              value={financial?.catalog.lowStockProducts ?? 0}
            />
            <CatalogRow
              icon={<Package className="h-4 w-4 text-destructive" />}
              label="Agotados"
              value={financial?.catalog.outOfStockProducts ?? 0}
            />
            <CatalogRow
              icon={<ImageOff className="h-4 w-4 text-warning" />}
              label="Sin imagen aprobada"
              value={
                (financial?.catalog.productsWithoutImage ?? 0) +
                (financial?.catalog.imagesPendingReview ?? 0)
              }
            />
            <CatalogRow
              icon={<Star className="h-4 w-4 text-amber-500" />}
              label="Calificación del comercio"
              value={(general?.rating ?? 0).toFixed(1)}
            />
          </div>
          <Link
            href="/negocio/productos"
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-black text-primary"
          >
            Corregir catálogo
          </Link>
        </article>
      </section>

      {businessId && (
        <p className="text-center text-[10px] text-muted-foreground/60">
          Identificador interno del comercio: {businessId.slice(0, 8)}
        </p>
      )}
    </div>
  );
}

function CatalogRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
