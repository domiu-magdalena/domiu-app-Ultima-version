'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Scale,
  Wallet,
} from 'lucide-react';
import {
  financeService,
  type OperationalShift,
  type ParticipantType,
  type SettlementBalance,
  type SettlementBatch,
  type SettlementEntry,
} from '@/services/finance';
import { formatCOP } from '@/lib/formatters/currency';
import { downloadSettlementExcel, downloadSettlementPdf, type SettlementExportData } from '@/lib/exports/settlement';

function reasonLabel(reason: SettlementEntry['reason']) {
  const labels = {
    business_product_sale: 'Venta neta de productos',
    courier_earning: 'Ganancia neta del repartidor',
    cash_remittance: 'Efectivo por entregar a DomiU',
    adjustment: 'Ajuste administrativo',
  };
  return labels[reason];
}

export default function AdminLiquidacionesPage() {
  const [balances, setBalances] = useState<SettlementBalance[]>([]);
  const [selected, setSelected] = useState<SettlementBalance | null>(null);
  const [entries, setEntries] = useState<SettlementEntry[]>([]);
  const [shifts, setShifts] = useState<OperationalShift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('all');
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadBalances = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await financeService.getAllBalances();
      setBalances(rows);
      setSelected((current) => rows.find((row) => row.participant_type === current?.participant_type && row.participant_id === current?.participant_id) ?? rows[0] ?? null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las liquidaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    if (!selected) {
      setEntries([]);
      setShifts([]);
      setBatches([]);
      return;
    }
    setSelectedShiftId('all');
    setActionLoading(true);
    Promise.all([
      financeService.getEntries(selected.participant_type, selected.participant_id),
      financeService.getShiftHistory(selected.participant_type, selected.participant_id, 100),
      financeService.getBatches(selected.participant_type, selected.participant_id, 100),
    ]).then(([entryRows, shiftRows, batchRows]) => {
      setEntries(entryRows);
      setShifts(shiftRows);
      setBatches(batchRows);
      setError('');
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo abrir el detalle')).finally(() => setActionLoading(false));
  }, [selected]);

  const filteredEntries = useMemo(
    () => selectedShiftId === 'all' ? entries : entries.filter((entry) => entry.shift_id === selectedShiftId),
    [entries, selectedShiftId],
  );
  const selectedShift = shifts.find((shift) => shift.id === selectedShiftId) ?? null;

  const exportData = useMemo<SettlementExportData | null>(() => {
    if (!selected) return null;
    const companyOwes = filteredEntries.filter((entry) => entry.status !== 'void' && entry.direction === 'company_owes_participant').reduce((sum, entry) => sum + entry.amount, 0);
    const participantOwes = filteredEntries.filter((entry) => entry.status !== 'void' && entry.direction === 'participant_owes_company').reduce((sum, entry) => sum + entry.amount, 0);
    const orders = new Set(filteredEntries.map((entry) => entry.order_id));
    return {
      title: selected.participant_type === 'courier' ? 'Desprendible de liquidación de repartidor' : 'Liquidación de comercio',
      participantName: selected.participant_name || 'Participante DomiU',
      participantType: selected.participant_type,
      periodStart: selectedShift?.opened_at || filteredEntries.at(-1)?.created_at || new Date().toISOString(),
      periodEnd: selectedShift?.closed_at || filteredEntries[0]?.created_at || new Date().toISOString(),
      openedAt: selectedShift?.opened_at,
      closedAt: selectedShift?.closed_at,
      onlineSeconds: selectedShift?.online_seconds ?? 0,
      ordersCount: selectedShift?.orders_count ?? orders.size,
      deliveryFees: selectedShift?.delivery_fees ?? 0,
      productSales: selectedShift?.product_sales ?? (selected.participant_type === 'business' ? companyOwes : 0),
      serviceFees: selectedShift?.service_fees ?? 0,
      courierEarnings: selectedShift?.courier_earnings ?? (selected.participant_type === 'courier' ? filteredEntries.filter((entry) => entry.reason === 'courier_earning').reduce((sum, entry) => sum + entry.amount, 0) : 0),
      companyOwesParticipant: companyOwes,
      participantOwesCompany: participantOwes,
      netBalance: companyOwes - participantOwes,
      rows: filteredEntries.map((entry) => ({
        date: entry.created_at,
        orderNumber: String(entry.metadata?.order_number || entry.order_id.slice(0, 8)),
        concept: reasonLabel(entry.reason),
        direction: entry.direction === 'company_owes_participant' ? 'DomiU debe' : 'Participante debe a DomiU',
        amount: entry.amount,
        status: entry.status,
      })),
    };
  }, [filteredEntries, selected, selectedShift]);

  const createBatch = async () => {
    if (!selected || actionLoading) return;
    const pending = filteredEntries.filter((entry) => entry.status === 'pending');
    if (!pending.length) return setError('No existen movimientos pendientes en la selección actual.');
    setActionLoading(true);
    try {
      const start = selectedShift?.opened_at || pending.at(-1)?.created_at || new Date(Date.now() - 30 * 86_400_000).toISOString();
      const end = selectedShift?.closed_at || new Date(Date.now() + 1000).toISOString();
      await financeService.createBatch({ participantType: selected.participant_type, participantId: selected.participant_id, periodStart: start, periodEnd: end, notes: 'Liquidación creada desde el centro administrativo' });
      const [entryRows, batchRows, balanceRows] = await Promise.all([
        financeService.getEntries(selected.participant_type, selected.participant_id),
        financeService.getBatches(selected.participant_type, selected.participant_id),
        financeService.getAllBalances(),
      ]);
      setEntries(entryRows);
      setBatches(batchRows);
      setBalances(balanceRows);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la liquidación');
    } finally {
      setActionLoading(false);
    }
  };

  const payBatch = async (batchId: string) => {
    setActionLoading(true);
    try {
      await financeService.payBatch(batchId);
      if (selected) {
        const [entryRows, batchRows, balanceRows] = await Promise.all([
          financeService.getEntries(selected.participant_type, selected.participant_id),
          financeService.getBatches(selected.participant_type, selected.participant_id),
          financeService.getAllBalances(),
        ]);
        setEntries(entryRows);
        setBatches(batchRows);
        setBalances(balanceRows);
      }
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la liquidación');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-3xl bg-gradient-to-br from-[#17191F] to-[#2C3138] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#FFD400]">Administración financiera</p><h1 className="mt-2 text-3xl font-black">Liquidaciones DomiU</h1><p className="mt-2 max-w-2xl text-sm text-white/65">Control exacto de obligaciones con comercios y repartidores, efectivo recaudado y comprobantes por jornada.</p></div><button type="button" onClick={() => void loadBalances()} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button></div>
      </section>

      {error && <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b p-4"><h2 className="font-black">Participantes con saldo</h2><p className="text-xs text-muted-foreground">{balances.length} cuentas por revisar</p></div>
          <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">{loading ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : balances.map((balance) => <button key={`${balance.participant_type}-${balance.participant_id}`} type="button" onClick={() => setSelected(balance)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.participant_id === balance.participant_id && selected.participant_type === balance.participant_type ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}><div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{balance.participant_name}</strong><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">{balance.participant_type === 'courier' ? 'Repartidor' : 'Comercio'}</span></div><p className={`mt-3 text-lg font-black ${balance.net_balance < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCOP(Math.abs(balance.net_balance))}</p><p className="mt-1 text-[11px] text-muted-foreground">{balance.net_balance > 0 ? 'DomiU debe pagar' : balance.net_balance < 0 ? 'Debe entregar a DomiU' : 'Saldo conciliado'} · {balance.pending_entries} movimientos</p></button>)}</div>
        </aside>

        <div className="space-y-5">
          {!selected ? <div className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed bg-card p-8 text-center"><Scale className="h-10 w-10 text-muted-foreground" /><h2 className="mt-3 font-black">Selecciona un participante</h2></div> : <>
            <section className="rounded-3xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Detalle contable</p><h2 className="mt-1 text-2xl font-black">{selected.participant_name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.participant_type === 'courier' ? 'Repartidor' : 'Comercio'}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!exportData} onClick={() => exportData && downloadSettlementPdf(exportData)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><FileText className="h-4 w-4" />PDF</button><button type="button" disabled={!exportData} onClick={() => exportData && downloadSettlementExcel(exportData)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><FileSpreadsheet className="h-4 w-4" />Excel</button><button type="button" onClick={() => void createBatch()} disabled={actionLoading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">{actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}Crear liquidación</button></div></div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-muted/50 p-4"><p className="text-xs font-bold text-muted-foreground">DomiU debe</p><p className="mt-1 text-xl font-black text-emerald-600">{formatCOP(selected.company_owes_participant)}</p></div><div className="rounded-2xl bg-muted/50 p-4"><p className="text-xs font-bold text-muted-foreground">Debe a DomiU</p><p className="mt-1 text-xl font-black text-amber-600">{formatCOP(selected.participant_owes_company)}</p></div><div className="rounded-2xl bg-primary/5 p-4"><p className="text-xs font-bold text-muted-foreground">Saldo neto</p><p className="mt-1 text-xl font-black text-primary">{formatCOP(selected.net_balance)}</p></div></div>

              <label className="mt-5 block text-xs font-bold text-muted-foreground">Jornada o periodo<select value={selectedShiftId} onChange={(event) => setSelectedShiftId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground"><option value="all">Todos los movimientos</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{new Date(shift.opened_at).toLocaleString('es-CO')} · {shift.status}</option>)}</select></label>
            </section>

            <section className="overflow-hidden rounded-3xl border bg-card shadow-sm"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-black">Movimientos</h2><p className="text-xs text-muted-foreground">{filteredEntries.length} registros en la selección</p></div><Download className="h-5 w-5 text-primary" /></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Pedido</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Dirección</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Estado</th></tr></thead><tbody>{filteredEntries.map((entry) => <tr key={entry.id} className="border-t"><td className="px-4 py-3 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString('es-CO')}</td><td className="px-4 py-3 font-mono text-xs">{String(entry.metadata?.order_number || entry.order_id.slice(0, 8))}</td><td className="px-4 py-3 font-medium">{reasonLabel(entry.reason)}</td><td className="px-4 py-3 text-xs">{entry.direction === 'company_owes_participant' ? 'DomiU debe' : 'Participante debe'}</td><td className="px-4 py-3 text-right font-black">{formatCOP(entry.amount)}</td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">{entry.status}</span></td></tr>)}</tbody></table>{!filteredEntries.length && <p className="p-8 text-center text-sm text-muted-foreground">No hay movimientos para esta selección.</p>}</div></section>

            <section className="rounded-3xl border bg-card p-5 shadow-sm"><h2 className="font-black">Liquidaciones generadas</h2><div className="mt-4 space-y-2">{batches.length ? batches.map((batch) => <div key={batch.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"><div><p className="text-sm font-black">{formatCOP(batch.net_balance)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(batch.period_start).toLocaleDateString('es-CO')} – {new Date(batch.period_end).toLocaleDateString('es-CO')} · {batch.status}</p></div>{batch.status !== 'paid' && <button type="button" onClick={() => void payBatch(batch.id)} disabled={actionLoading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"><CheckCircle2 className="h-4 w-4" />Marcar pagada</button>}</div>) : <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aún no se han generado liquidaciones.</p>}</div></section>
          </>}
        </div>
      </section>
    </div>
  );
}
