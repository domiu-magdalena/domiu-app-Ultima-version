'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getBrowserClient } from '@/lib/db/supabase';
import { DomiULogo } from '@/components/brand/DomiULogo';
import { formatCop } from '@/lib/money/cop';

type Statement = {
  workDate: string;
  shiftsCount: number;
  onlineSeconds: number;
  completedDeliveries: number;
  deliveryFees: number;
  netEarnings: number;
  cashCollected: number;
  companyOwes: number;
  courierOwes: number;
  netBalance: number;
  firstOnlineAt: string | null;
  lastOfflineAt: string | null;
};

function duration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 3600)} h ${Math.floor((safe % 3600) / 60)} min`;
}

function dateTime(value: string | null) {
  if (!value) return 'No registrado';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

export default function CourierStatementPage() {
  const params = useSearchParams();
  const { profile } = useAuth();
  const date = params.get('date') || new Date().toISOString().slice(0, 10);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const [stubResult, balanceResult] = await Promise.all([
        supabase
          .from('courier_daily_payment_stub_v')
          .select('*')
          .eq('courier_id', profile.id)
          .eq('work_date', date)
          .maybeSingle(),
        supabase
          .from('courier_balance_summary_v')
          .select('*')
          .eq('courier_id', profile.id)
          .maybeSingle(),
      ]);
      if (stubResult.error) throw new Error(stubResult.error.message);
      if (balanceResult.error) throw new Error(balanceResult.error.message);
      const row = stubResult.data ?? {};
      const balance = balanceResult.data ?? {};
      setStatement({
        workDate: date,
        shiftsCount: Number(row.shifts_count ?? 0),
        onlineSeconds: Number(row.online_seconds ?? 0),
        completedDeliveries: Number(row.completed_deliveries ?? 0),
        deliveryFees: Number(row.delivery_fees_cop ?? 0),
        netEarnings: Number(row.courier_net_earnings_cop ?? 0),
        cashCollected: Number(row.cash_collected_cop ?? 0),
        companyOwes: Number(balance.company_owes_courier_cop ?? 0),
        courierOwes: Number(balance.courier_owes_company_cop ?? 0),
        netBalance: Number(balance.net_balance_cop ?? 0),
        firstOnlineAt: row.first_online_at ? String(row.first_online_at) : null,
        lastOfflineAt: row.last_offline_at ? String(row.last_offline_at) : null,
      });
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el desprendible');
    } finally {
      setLoading(false);
    }
  }, [date, profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Repartidor';

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-black">Desprendible de liquidación</h1>
          <p className="text-sm text-muted-foreground">Datos exactos del {date}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"
          >
            <Printer className="h-4 w-4" /> Generar PDF
          </button>
          <a
            href={`/api/reports/courier-statement?courierId=${profile?.id}&date=${date}&format=xls`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"
          >
            <FileSpreadsheet className="h-4 w-4" /> Descargar Excel
          </a>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border bg-card">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Cargando información…
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : statement ? (
        <article className="overflow-hidden rounded-[2rem] border bg-white text-slate-900 shadow-xl print:rounded-none print:border-0 print:shadow-none">
          <header className="flex flex-col gap-5 bg-slate-950 px-7 py-7 text-white sm:flex-row sm:items-center sm:justify-between print:bg-slate-950 print:text-white">
            <div>
              <DomiULogo variant="dark" className="justify-start" />
              <h2 className="mt-3 text-2xl font-black">Desprendible diario del repartidor</h2>
              <p className="mt-1 text-sm text-slate-300">DomiU Magdalena · {statement.workDate}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Saldo actual</p>
              <p className="mt-1 text-xl font-black">
                {statement.netBalance > 0
                  ? `DomiU debe ${formatCop(statement.companyOwes)}`
                  : statement.netBalance < 0
                    ? `Debe entregar ${formatCop(statement.courierOwes)}`
                    : 'Saldo en cero'}
              </p>
            </div>
          </header>

          <section className="grid gap-4 border-b bg-amber-50 px-7 py-6 sm:grid-cols-3">
            <Identity label="Repartidor" value={fullName} />
            <Identity label="Correo" value={profile?.email || 'No registrado'} />
            <Identity label="Teléfono" value={profile?.phone || 'No registrado'} />
          </section>

          <section className="grid gap-4 px-7 py-7 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Jornadas" value={String(statement.shiftsCount)} />
            <Metric label="Tiempo en línea" value={duration(statement.onlineSeconds)} />
            <Metric label="Domicilios realizados" value={String(statement.completedDeliveries)} />
            <Metric label="Tarifas de domicilio" value={formatCop(statement.deliveryFees)} />
            <Metric label="Ganancia neta" value={formatCop(statement.netEarnings)} emphasized />
            <Metric label="Efectivo cobrado" value={formatCop(statement.cashCollected)} />
            <Metric label="DomiU le debe" value={formatCop(statement.companyOwes)} />
            <Metric label="Debe a DomiU" value={formatCop(statement.courierOwes)} />
          </section>

          <section className="mx-7 mb-7 rounded-2xl border bg-slate-50 p-5">
            <h3 className="font-black">Detalle de la jornada</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Identity label="Primera conexión" value={dateTime(statement.firstOnlineAt)} />
              <Identity label="Último cierre" value={dateTime(statement.lastOfflineAt)} />
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              Saldo positivo significa que DomiU debe pagar al repartidor. Saldo negativo significa que el repartidor debe entregar efectivo a DomiU. Las cifras provienen del libro contable y no se modifican en este documento.
            </p>
          </section>

          <footer className="border-t px-7 py-5 text-xs text-slate-500">
            Generado el{' '}
            {new Intl.DateTimeFormat('es-CO', {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'America/Bogota',
            }).format(new Date())}
            . Documento informativo sujeto a conciliación de movimientos registrados.
          </footer>
        </article>
      ) : null}

      <div className="hidden print:block">
        <Download className="hidden" />
      </div>
    </main>
  );
}

function Identity({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold">{value}</p>
    </div>
  );
}

function Metric({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasized ? 'border-amber-300 bg-amber-50' : 'bg-white'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}
