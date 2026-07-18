'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Printer, RefreshCw, Scale, WalletCards } from 'lucide-react';
import { getBrowserClient } from '@/lib/db/supabase';
import { financeService, type SettlementBatch } from '@/services/finance';
import { formatCOP, formatCOPNumber } from '@/lib/money';
import { DOMIU_OFFICIAL_LOGO_DATA_URI } from '@/lib/brand-assets';

interface CourierBalance {
  courier_id: string;
  name: string;
  delivered_orders: number;
  gross_delivery_value: number;
  platform_commission: number;
  net_earnings: number;
  company_owes_courier: number;
  courier_owes_company: number;
  net_balance: number;
  online_minutes: number;
  shift_started_at: string | null;
  shift_status: string;
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start: start.toISOString(), end: now.toISOString() };
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function downloadFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportExcel(courier: CourierBalance) {
  const rows = [
    ['DomiU Magdalena', 'Desprendible de liquidación'],
    ['Repartidor', courier.name],
    ['Fecha', new Date().toLocaleString('es-CO')],
    ['Jornada iniciada', courier.shift_started_at ? new Date(courier.shift_started_at).toLocaleString('es-CO') : 'Sin jornada activa'],
    ['Horas en línea', (courier.online_minutes / 60).toFixed(2)],
    ['Domicilios realizados', courier.delivered_orders],
    ['Valor bruto domicilios', formatCOPNumber(courier.gross_delivery_value)],
    ['Comisión DomiU', formatCOPNumber(courier.platform_commission)],
    ['Ganancia neta', formatCOPNumber(courier.net_earnings)],
    ['DomiU debe al repartidor', formatCOPNumber(courier.company_owes_courier)],
    ['Repartidor debe a DomiU', formatCOPNumber(courier.courier_owes_company)],
    ['Saldo neto', formatCOPNumber(courier.net_balance)],
  ];
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1">${rows.map((row) => `<tr><td><strong>${escapeHtml(row[0])}</strong></td><td>${escapeHtml(row[1])}</td></tr>`).join('')}</table></body></html>`;
  downloadFile(html, `liquidacion-${courier.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel;charset=utf-8');
}

function printPdf(courier: CourierBalance) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900');
  if (!popup) return;
  const netText = courier.net_balance > 0
    ? `DomiU debe pagar ${formatCOP(courier.net_balance)}`
    : courier.net_balance < 0
      ? `El repartidor debe entregar ${formatCOP(Math.abs(courier.net_balance))}`
      : 'Saldo conciliado';
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Liquidación ${escapeHtml(courier.name)}</title><style>
    @page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#17191f;margin:0}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid #ffd400;padding-bottom:16px}.logo{width:115px;height:75px;object-fit:contain}.badge{background:#17191f;color:white;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:700}.title{font-size:26px;font-weight:900;margin:24px 0 4px}.muted{color:#68707c;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.card{border:1px solid #e2e5e9;border-radius:14px;padding:15px}.card span{display:block;color:#737b87;font-size:11px;text-transform:uppercase}.card strong{display:block;font-size:18px;margin-top:6px}.balance{margin-top:20px;background:#fff7c2;border:1px solid #ffd400;border-radius:16px;padding:18px;font-size:20px;font-weight:900}.footer{margin-top:32px;border-top:1px solid #ddd;padding-top:14px;font-size:10px;color:#737b87}button{margin-top:20px;background:#17191f;color:white;border:0;border-radius:10px;padding:12px 18px;font-weight:700}@media print{button{display:none}}
  </style></head><body>
  <div class="header"><img class="logo" src="${DOMIU_OFFICIAL_LOGO_DATA_URI}" alt="DomiU"><span class="badge">Liquidación de repartidor</span></div>
  <h1 class="title">${escapeHtml(courier.name)}</h1><p class="muted">Generado ${new Date().toLocaleString('es-CO')} · Valores en pesos colombianos (COP)</p>
  <div class="grid">
    <div class="card"><span>Horas en línea</span><strong>${(courier.online_minutes / 60).toFixed(2)}</strong></div>
    <div class="card"><span>Domicilios realizados</span><strong>${courier.delivered_orders}</strong></div>
    <div class="card"><span>Valor bruto domicilios</span><strong>${formatCOP(courier.gross_delivery_value)}</strong></div>
    <div class="card"><span>Comisión DomiU</span><strong>${formatCOP(courier.platform_commission)}</strong></div>
    <div class="card"><span>Ganancia neta</span><strong>${formatCOP(courier.net_earnings)}</strong></div>
    <div class="card"><span>Efectivo por conciliar</span><strong>${formatCOP(courier.courier_owes_company)}</strong></div>
    <div class="card"><span>DomiU debe al repartidor</span><strong>${formatCOP(courier.company_owes_courier)}</strong></div>
    <div class="card"><span>Jornada</span><strong>${courier.shift_status === 'open' ? 'Abierta' : 'Cerrada'}</strong></div>
  </div>
  <div class="balance">${escapeHtml(netText)}</div>
  <div class="footer">Documento operativo generado por DomiU Magdalena. Cada cifra proviene del libro financiero relacionado con pedidos entregados y debe verificarse contra el estado de la liquidación.</div>
  <button onclick="window.print()">Guardar o imprimir PDF</button>
  </body></html>`);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 500);
}

export default function LiquidacionesPage() {
  const [couriers, setCouriers] = useState<CourierBalance[]>([]);
  const [settlements, setSettlements] = useState<SettlementBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    try {
      const [{ data: summaries, error: summaryError }, { data: profiles }, { data: shifts }, batches] = await Promise.all([
        supabase.from('courier_financial_summary').select('*'),
        supabase.from('profiles').select('id,first_name,last_name').eq('role', 'courier'),
        supabase.from('courier_shifts').select('courier_id,status,started_at,ended_at,online_minutes').order('started_at', { ascending: false }),
        financeService.listSettlements(),
      ]);
      if (summaryError) throw new Error(summaryError.message);
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Repartidor']));
      const shiftMap = new Map<string, { status: string; started_at: string; online_minutes: number }>();
      for (const shift of shifts ?? []) if (!shiftMap.has(shift.courier_id)) shiftMap.set(shift.courier_id, shift);
      setCouriers((summaries ?? []).map((row) => {
        const shift = shiftMap.get(row.courier_id);
        const liveMinutes = shift?.status === 'open' && shift.started_at
          ? Math.max(0, Math.floor((Date.now() - new Date(shift.started_at).getTime()) / 60000))
          : Number(shift?.online_minutes ?? 0);
        return {
          courier_id: row.courier_id,
          name: profileMap.get(row.courier_id) || 'Repartidor',
          delivered_orders: Number(row.delivered_orders ?? 0),
          gross_delivery_value: Number(row.gross_delivery_value ?? 0),
          platform_commission: Number(row.platform_commission ?? 0),
          net_earnings: Number(row.net_earnings ?? 0),
          company_owes_courier: Number(row.company_owes_courier ?? 0),
          courier_owes_company: Number(row.courier_owes_company ?? 0),
          net_balance: Number(row.net_balance ?? 0),
          online_minutes: liveMinutes,
          shift_started_at: shift?.started_at ?? null,
          shift_status: shift?.status ?? 'closed',
        };
      }));
      setSettlements(batches);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las liquidaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => couriers.reduce((result, courier) => ({
    owes: result.owes + courier.company_owes_courier,
    receivable: result.receivable + courier.courier_owes_company,
    net: result.net + courier.net_balance,
  }), { owes: 0, receivable: 0, net: 0 }), [couriers]);

  const createTodaySettlement = async (courier: CourierBalance) => {
    setProcessing(courier.courier_id);
    setError('');
    try {
      const range = todayRange();
      await financeService.createSettlement('courier', courier.courier_id, range.start, range.end);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo generar la liquidación');
    } finally {
      setProcessing(null);
    }
  };

  const pay = async (batch: SettlementBatch) => {
    setProcessing(batch.id);
    try {
      await financeService.markSettlementPaid(batch.id, `DomiU-${Date.now()}`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cerrar el pago');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[2rem] bg-[#17191F] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#FFD400]">Finanzas operativas</p><h1 className="mt-2 text-3xl font-black">Liquidaciones</h1><p className="mt-2 text-sm text-white/65">Saldos exactos calculados desde pedidos entregados y quién recibió el pago.</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold"><RefreshCw className="h-4 w-4" />Actualizar</button></div>
      </section>

      {error && <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl border bg-card p-5"><WalletCards className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">DomiU debe pagar</p><p className="mt-1 text-2xl font-black">{formatCOP(totals.owes)}</p></article>
        <article className="rounded-3xl border bg-card p-5"><Download className="h-5 w-5 text-amber-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">DomiU debe recibir</p><p className="mt-1 text-2xl font-black">{formatCOP(totals.receivable)}</p></article>
        <article className="rounded-3xl border bg-card p-5"><Scale className="h-5 w-5 text-primary" /><p className="mt-4 text-xs uppercase text-muted-foreground">Balance neto</p><p className="mt-1 text-2xl font-black">{formatCOP(totals.net)}</p></article>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <header className="border-b px-5 py-4"><h2 className="font-black">Repartidores</h2><p className="text-xs text-muted-foreground">Genera liquidación diaria y desprendibles individuales.</p></header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-4">Repartidor</th><th className="p-4">Horas</th><th className="p-4">Entregas</th><th className="p-4">Neto ganado</th><th className="p-4">DomiU debe</th><th className="p-4">Debe a DomiU</th><th className="p-4">Saldo</th><th className="p-4">Acciones</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Cargando movimientos…</td></tr> : couriers.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No hay movimientos financieros entregados.</td></tr> : couriers.map((courier) => <tr key={courier.courier_id} className="border-t"><td className="p-4"><strong>{courier.name}</strong><span className={`ml-2 rounded-full px-2 py-1 text-[10px] font-bold ${courier.shift_status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{courier.shift_status === 'open' ? 'En jornada' : 'Fuera de línea'}</span></td><td className="p-4">{(courier.online_minutes / 60).toFixed(2)}</td><td className="p-4">{courier.delivered_orders}</td><td className="p-4 font-bold">{formatCOP(courier.net_earnings)}</td><td className="p-4 text-emerald-700">{formatCOP(courier.company_owes_courier)}</td><td className="p-4 text-amber-700">{formatCOP(courier.courier_owes_company)}</td><td className={`p-4 font-black ${courier.net_balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCOP(courier.net_balance)}</td><td className="p-4"><div className="flex gap-2"><button type="button" onClick={() => printPdf(courier)} className="rounded-xl border p-2" title="Generar PDF"><Printer className="h-4 w-4" /></button><button type="button" onClick={() => exportExcel(courier)} className="rounded-xl border p-2" title="Descargar Excel"><FileSpreadsheet className="h-4 w-4" /></button><button type="button" onClick={() => void createTodaySettlement(courier)} disabled={processing === courier.courier_id} className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">Liquidar hoy</button></div></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <header className="border-b px-5 py-4"><h2 className="font-black">Historial de liquidaciones</h2></header>
        <div className="divide-y">{settlements.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No hay liquidaciones generadas.</p> : settlements.map((batch) => <article key={batch.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-sm font-black">{batch.participant_type === 'courier' ? 'Repartidor' : 'Comercio'} · {batch.participant_id.slice(0, 8)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(batch.period_start).toLocaleString('es-CO')} — {new Date(batch.period_end).toLocaleString('es-CO')}</p></div><div className="flex items-center gap-5 text-sm"><span>DomiU debe <strong>{formatCOP(batch.company_owes_participant)}</strong></span><span>Debe a DomiU <strong>{formatCOP(batch.participant_owes_company)}</strong></span><span className="text-base">Saldo <strong>{formatCOP(batch.net_balance)}</strong></span>{batch.status === 'paid' ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Pagada</span> : <button type="button" onClick={() => void pay(batch)} disabled={processing === batch.id} className="rounded-xl bg-[#17191F] px-4 py-2 text-xs font-black text-white">Marcar pagada</button>}</div></article>)}</div>
      </section>
    </div>
  );
}
