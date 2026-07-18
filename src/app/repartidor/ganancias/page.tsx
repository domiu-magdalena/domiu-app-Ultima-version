'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBrowserClient } from '@/lib/db/supabase';
import { financeService, type CourierFinancialSummary } from '@/services/finance';
import { formatCOP, formatCOPNumber } from '@/lib/money';
import { SkeletonStats } from '@/components/ui/skeleton';
import {
  ArrowDownToLine,
  Bike,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Scale,
  TrendingUp,
  WalletCards,
} from 'lucide-react';

interface LedgerRow {
  id: string;
  order_id: string;
  courier_gross_earnings: number;
  courier_commission: number;
  courier_net_earnings: number;
  collector_type: 'platform' | 'business' | 'courier';
  customer_total: number;
  settlement_status: string;
  finalized_at: string;
  metadata: Record<string, unknown> | null;
}

interface ShiftRow {
  id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  online_minutes: number;
  delivered_orders: number;
  net_earnings: number;
  company_owes_courier: number;
  courier_owes_company: number;
}

const EMPTY_SUMMARY: CourierFinancialSummary = {
  courier_id: '', delivered_orders: 0, gross_delivery_value: 0,
  platform_commission: 0, net_earnings: 0, company_owes_courier: 0,
  courier_owes_company: 0, net_balance: 0,
};

function downloadCsv(rows: LedgerRow[]) {
  const header = ['Pedido', 'Fecha', 'Domicilio bruto', 'Comisión DomiU', 'Ganancia neta', 'Cobró', 'Estado liquidación'];
  const lines = rows.map((row) => [
    String(row.metadata?.order_number || row.order_id),
    new Date(row.finalized_at).toLocaleString('es-CO'),
    formatCOPNumber(row.courier_gross_earnings),
    formatCOPNumber(row.courier_commission),
    formatCOPNumber(row.courier_net_earnings),
    row.collector_type === 'courier' ? 'Repartidor' : row.collector_type === 'business' ? 'Comercio' : 'DomiU',
    row.settlement_status,
  ]);
  const csv = '\uFEFF' + [header, ...lines].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ganancias-repartidor-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function RepartidorGanancias() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<CourierFinancialSummary>(EMPTY_SUMMARY);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const supabase = getBrowserClient();
    try {
      const [financial, ledgerResult, shiftResult] = await Promise.all([
        financeService.getCourierSummary(profile.id),
        supabase
          .from('order_financial_ledger')
          .select('id,order_id,courier_gross_earnings,courier_commission,courier_net_earnings,collector_type,customer_total,settlement_status,finalized_at,metadata')
          .eq('courier_id', profile.id)
          .order('finalized_at', { ascending: false })
          .limit(100),
        supabase
          .from('courier_shifts')
          .select('id,status,started_at,ended_at,online_minutes,delivered_orders,net_earnings,company_owes_courier,courier_owes_company')
          .eq('courier_id', profile.id)
          .order('started_at', { ascending: false })
          .limit(30),
      ]);
      if (ledgerResult.error) throw new Error(ledgerResult.error.message);
      if (shiftResult.error) throw new Error(shiftResult.error.message);
      setSummary(financial);
      setLedger((ledgerResult.data ?? []).map((row) => ({
        ...row,
        courier_gross_earnings: Number(row.courier_gross_earnings ?? 0),
        courier_commission: Number(row.courier_commission ?? 0),
        courier_net_earnings: Number(row.courier_net_earnings ?? 0),
        customer_total: Number(row.customer_total ?? 0),
        metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : null,
      })) as LedgerRow[]);
      setShifts((shiftResult.data ?? []).map((row) => ({
        ...row,
        online_minutes: Number(row.online_minutes ?? 0),
        delivered_orders: Number(row.delivered_orders ?? 0),
        net_earnings: Number(row.net_earnings ?? 0),
        company_owes_courier: Number(row.company_owes_courier ?? 0),
        courier_owes_company: Number(row.courier_owes_company ?? 0),
      })) as ShiftRow[]);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las ganancias');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { void load(); }, [load]);

  const period = useMemo(() => {
    const now = Date.now();
    return ledger.reduce((result, row) => {
      const age = now - new Date(row.finalized_at).getTime();
      if (age <= 86400000) result.today += row.courier_net_earnings;
      if (age <= 7 * 86400000) result.week += row.courier_net_earnings;
      if (age <= 30 * 86400000) result.month += row.courier_net_earnings;
      return result;
    }, { today: 0, week: 0, month: 0 });
  }, [ledger]);

  if (loading) return <SkeletonStats />;

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[2rem] bg-[#17191F] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#FFD400]">Libro financiero</p><h1 className="mt-2 text-3xl font-black">Ganancias y liquidación</h1><p className="mt-2 text-sm text-white/65">Cifras calculadas por pedido entregado. No se usan porcentajes simulados.</p></div>
          <button type="button" onClick={() => downloadCsv(ledger)} disabled={ledger.length === 0} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black disabled:opacity-40"><FileSpreadsheet className="h-4 w-4" />Exportar Excel/CSV</button>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border bg-card p-5"><TrendingUp className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Hoy</p><p className="mt-1 text-2xl font-black">{formatCOP(period.today)}</p></article>
        <article className="rounded-3xl border bg-card p-5"><TrendingUp className="h-5 w-5 text-blue-600" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Últimos 7 días</p><p className="mt-1 text-2xl font-black">{formatCOP(period.week)}</p></article>
        <article className="rounded-3xl border bg-card p-5"><TrendingUp className="h-5 w-5 text-violet-600" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Últimos 30 días</p><p className="mt-1 text-2xl font-black">{formatCOP(period.month)}</p></article>
        <article className="rounded-3xl border bg-card p-5"><WalletCards className="h-5 w-5 text-primary" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Ganancia neta total</p><p className="mt-1 text-2xl font-black">{formatCOP(summary.net_earnings)}</p></article>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border bg-card p-5"><Bike className="h-5 w-5 text-blue-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">Domicilios brutos</p><p className="mt-1 text-xl font-black">{formatCOP(summary.gross_delivery_value)}</p></article>
        <article className="rounded-3xl border bg-card p-5"><ArrowDownToLine className="h-5 w-5 text-amber-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">Comisión DomiU</p><p className="mt-1 text-xl font-black">{formatCOP(summary.platform_commission)}</p></article>
        <article className="rounded-3xl border bg-card p-5"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">DomiU te debe</p><p className="mt-1 text-xl font-black">{formatCOP(summary.company_owes_courier)}</p></article>
        <article className="rounded-3xl border bg-card p-5"><Scale className="h-5 w-5 text-red-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">Debes entregar a DomiU</p><p className="mt-1 text-xl font-black">{formatCOP(summary.courier_owes_company)}</p></article>
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">Saldo actual</h2><p className="mt-1 text-xs text-muted-foreground">Un saldo positivo significa que DomiU debe pagarte; uno negativo indica efectivo pendiente por entregar.</p></div><p className={`text-3xl font-black ${summary.net_balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCOP(summary.net_balance)}</p></div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <header className="border-b px-5 py-4"><h2 className="font-black">Movimientos por pedido</h2><p className="text-xs text-muted-foreground">Cada registro corresponde a un pedido entregado.</p></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-4">Pedido</th><th className="p-4">Fecha</th><th className="p-4">Domicilio</th><th className="p-4">Comisión</th><th className="p-4">Neto</th><th className="p-4">Cobró</th><th className="p-4">Liquidación</th></tr></thead><tbody>{ledger.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No hay pedidos entregados en el libro financiero.</td></tr> : ledger.map((row) => <tr key={row.id} className="border-t"><td className="p-4 font-bold">#{String(row.metadata?.order_number || row.order_id).slice(0, 18)}</td><td className="p-4 text-muted-foreground">{new Date(row.finalized_at).toLocaleString('es-CO')}</td><td className="p-4">{formatCOP(row.courier_gross_earnings)}</td><td className="p-4 text-amber-700">-{formatCOP(row.courier_commission)}</td><td className="p-4 font-black text-emerald-700">{formatCOP(row.courier_net_earnings)}</td><td className="p-4">{row.collector_type === 'courier' ? 'Tú' : row.collector_type === 'business' ? 'Comercio' : 'DomiU'}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.settlement_status === 'settled' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.settlement_status === 'settled' ? 'Liquidado' : row.settlement_status === 'batched' ? 'En liquidación' : 'Pendiente'}</span></td></tr>)}</tbody></table></div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <header className="border-b px-5 py-4"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /><h2 className="font-black">Historial de jornadas</h2></div></header>
        <div className="divide-y">{shifts.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No hay jornadas registradas.</p> : shifts.map((shift) => { const minutes = shift.status === 'open' ? Math.max(0, Math.floor((Date.now() - new Date(shift.started_at).getTime()) / 60000)) : shift.online_minutes; return <article key={shift.id} className="grid gap-3 p-5 sm:grid-cols-5"><div><p className="text-[10px] uppercase text-muted-foreground">Inicio</p><p className="text-sm font-bold">{new Date(shift.started_at).toLocaleString('es-CO')}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Tiempo en línea</p><p className="text-sm font-bold">{(minutes / 60).toFixed(2)} h</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Entregas</p><p className="text-sm font-bold">{shift.delivered_orders}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Neto</p><p className="text-sm font-bold">{formatCOP(shift.net_earnings)}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Estado</p><p className="text-sm font-bold">{shift.status === 'open' ? 'Abierta' : 'Cerrada'}</p></div></article>; })}</div>
      </section>
    </div>
  );
}
