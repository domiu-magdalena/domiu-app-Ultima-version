'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  FileSpreadsheet,
  PackageCheck,
  Printer,
  RefreshCw,
  Store,
  Truck,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { getBrowserClient } from '@/lib/db/supabase';
import { DomiULogo } from '@/components/brand/DomiULogo';
import { formatCop } from '@/lib/money/cop';

type Summary = {
  ordersCreated: number;
  ordersDelivered: number;
  ordersCancelled: number;
  productSales: number;
  deliveryFees: number;
  serviceFees: number;
  businessEarnings: number;
  courierEarnings: number;
  domiuEarnings: number;
  usersRegistered: number;
  businessesRegistered: number;
  businessShifts: number;
  courierShifts: number;
};

type BusinessRow = {
  id: string;
  name: string;
  orders: number;
  delivered: number;
  cancelled: number;
  productSales: number;
  domiuEarnings: number;
};

export default function DailyCompanyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const start = `${date}T00:00:00-05:00`;
      const endDate = new Date(`${date}T00:00:00-05:00`);
      endDate.setDate(endDate.getDate() + 1);
      const end = endDate.toISOString();
      const [summaryResult, ordersResult, businessResult] = await Promise.all([
        supabase
          .from('daily_company_operations_v')
          .select('*')
          .eq('operation_date', date)
          .maybeSingle(),
        supabase
          .from('orders')
          .select(
            'id,business_id,status,subtotal,business_earnings,platform_earnings,created_at,updated_at',
          )
          .gte('created_at', start)
          .lt('created_at', end)
          .is('deleted_at', null),
        supabase.from('businesses').select('id,name').is('deleted_at', null),
      ]);
      if (summaryResult.error || ordersResult.error || businessResult.error) {
        throw new Error(
          summaryResult.error?.message ||
            ordersResult.error?.message ||
            businessResult.error?.message ||
            'No se pudo cargar el reporte',
        );
      }
      const row = summaryResult.data ?? {};
      setSummary({
        ordersCreated: Number(row.orders_created ?? ordersResult.data?.length ?? 0),
        ordersDelivered: Number(row.orders_delivered ?? 0),
        ordersCancelled: Number(row.orders_cancelled ?? 0),
        productSales: Number(row.product_sales_cop ?? 0),
        deliveryFees: Number(row.delivery_fees_cop ?? 0),
        serviceFees: Number(row.service_fees_cop ?? 0),
        businessEarnings: Number(row.business_earnings_cop ?? 0),
        courierEarnings: Number(row.courier_earnings_cop ?? 0),
        domiuEarnings: Number(row.domiu_earnings_cop ?? 0),
        usersRegistered: Number(row.users_registered ?? 0),
        businessesRegistered: Number(row.businesses_registered ?? 0),
        businessShifts: Number(row.business_shifts_opened ?? 0),
        courierShifts: Number(row.courier_shifts_opened ?? 0),
      });

      const names = new Map(
        (businessResult.data ?? []).map((business) => [String(business.id), String(business.name)]),
      );
      const totals = new Map<string, BusinessRow>();
      for (const order of ordersResult.data ?? []) {
        const id = String(order.business_id || 'sin-negocio');
        const current = totals.get(id) ?? {
          id,
          name: names.get(id) || 'Comercio',
          orders: 0,
          delivered: 0,
          cancelled: 0,
          productSales: 0,
          domiuEarnings: 0,
        };
        current.orders += 1;
        if (order.status === 'delivered') {
          current.delivered += 1;
          current.productSales += Number(order.business_earnings ?? order.subtotal ?? 0);
          current.domiuEarnings += Number(order.platform_earnings ?? 0);
        }
        if (order.status === 'cancelled') current.cancelled += 1;
        totals.set(id, current);
      }
      setBusinesses([...totals.values()].sort((a, b) => b.productSales - a.productSales));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const deliveredRate = useMemo(() => {
    if (!summary?.ordersCreated) return 0;
    return Math.round((summary.ordersDelivered / summary.ordersCreated) * 100);
  }, [summary]);

  return (
    <main className="space-y-6 pb-8 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/reportes" className="inline-flex items-center gap-2 text-sm font-black text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver a reportes
        </Link>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border bg-card px-3 py-2 text-sm font-bold"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"
          >
            <Printer className="h-4 w-4" /> Generar PDF
          </button>
          <a
            href={`/api/reports/daily-company?date=${date}&format=xls`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"
          >
            <FileSpreadsheet className="h-4 w-4" /> Descargar Excel
          </a>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
      </div>

      <article className="overflow-hidden rounded-[2rem] border bg-white text-slate-900 shadow-xl print:rounded-none print:border-0 print:shadow-none">
        <header className="bg-slate-950 px-7 py-7 text-white sm:px-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <DomiULogo variant="dark" className="justify-start" />
              <h1 className="mt-3 text-3xl font-black">Reporte diario de operación</h1>
              <p className="mt-1 text-sm text-slate-300">DomiU Magdalena · {date}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Efectividad</p>
              <p className="mt-1 text-2xl font-black">{deliveredRate}% entregados</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Consolidando operación…
          </div>
        ) : error ? (
          <p className="m-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : summary ? (
          <>
            <section className="grid gap-4 bg-amber-50 px-7 py-7 sm:grid-cols-2 lg:grid-cols-4 sm:px-9">
              <Metric icon={<PackageCheck className="h-5 w-5" />} label="Pedidos creados" value={String(summary.ordersCreated)} />
              <Metric icon={<Truck className="h-5 w-5" />} label="Pedidos entregados" value={String(summary.ordersDelivered)} />
              <Metric icon={<Store className="h-5 w-5" />} label="Pedidos cancelados" value={String(summary.ordersCancelled)} />
              <Metric icon={<Wallet className="h-5 w-5" />} label="Ganancia DomiU" value={formatCop(summary.domiuEarnings)} emphasized />
            </section>

            <section className="px-7 py-7 sm:px-9">
              <h2 className="text-xl font-black">Resultado financiero</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Financial label="Ventas de productos" value={summary.productSales} />
                <Financial label="Tarifas de domicilio" value={summary.deliveryFees} />
                <Financial label="Tarifas de servicio DomiU" value={summary.serviceFees} />
                <Financial label="Ganancias de comercios" value={summary.businessEarnings} />
                <Financial label="Ganancias de repartidores" value={summary.courierEarnings} />
                <Financial label="Ganancia neta DomiU" value={summary.domiuEarnings} emphasized />
              </div>
            </section>

            <section className="border-y bg-slate-50 px-7 py-7 sm:px-9">
              <h2 className="text-xl font-black">Crecimiento y jornadas</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric icon={<UserPlus className="h-5 w-5" />} label="Usuarios registrados" value={String(summary.usersRegistered)} />
                <Metric icon={<Building2 className="h-5 w-5" />} label="Comercios registrados" value={String(summary.businessesRegistered)} />
                <Metric icon={<Store className="h-5 w-5" />} label="Jornadas de comercios" value={String(summary.businessShifts)} />
                <Metric icon={<Truck className="h-5 w-5" />} label="Jornadas de repartidores" value={String(summary.courierShifts)} />
              </div>
            </section>

            <section className="px-7 py-7 sm:px-9">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">Desempeño por comercio</h2>
                  <p className="mt-1 text-xs text-slate-500">Ventas de productos y pedidos creados durante la fecha.</p>
                </div>
                <span className="text-xs font-bold text-slate-500">{businesses.length} comercios con actividad</span>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase tracking-[0.08em] text-white">
                    <tr>
                      <th className="px-4 py-3">Comercio</th>
                      <th className="px-4 py-3">Pedidos</th>
                      <th className="px-4 py-3">Entregados</th>
                      <th className="px-4 py-3">Cancelados</th>
                      <th className="px-4 py-3">Venta productos</th>
                      <th className="px-4 py-3">Ingreso DomiU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {businesses.map((business) => (
                      <tr key={business.id}>
                        <td className="px-4 py-3 font-black">{business.name}</td>
                        <td className="px-4 py-3">{business.orders}</td>
                        <td className="px-4 py-3">{business.delivered}</td>
                        <td className="px-4 py-3">{business.cancelled}</td>
                        <td className="px-4 py-3 font-black">{formatCop(business.productSales)}</td>
                        <td className="px-4 py-3 font-black text-amber-700">{formatCop(business.domiuEarnings)}</td>
                      </tr>
                    ))}
                    {businesses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                          No hubo actividad comercial registrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <footer className="border-t px-7 py-5 text-xs leading-5 text-slate-500 sm:px-9">
              Generado el{' '}
              {new Intl.DateTimeFormat('es-CO', {
                dateStyle: 'long',
                timeStyle: 'short',
                timeZone: 'America/Bogota',
              }).format(new Date())}
              . Las cifras financieras se consolidan desde pedidos entregados y el libro contable oficial.
            </footer>
          </>
        ) : null}
      </article>
    </main>
  );
}

function Metric({ icon, label, value, emphasized = false }: { icon: React.ReactNode; label: string; value: string; emphasized?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasized ? 'border-amber-300 bg-white' : 'bg-white/80'}`}>
      <div className="flex items-center justify-between gap-3 text-amber-600">
        <span>{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      </div>
      <p className="mt-3 text-xl font-black">{value}</p>
    </div>
  );
}

function Financial({ label, value, emphasized = false }: { label: string; value: number; emphasized?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${emphasized ? 'border-amber-300 bg-amber-50' : 'bg-white'}`}>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black">{formatCop(value)}</p>
    </div>
  );
}
