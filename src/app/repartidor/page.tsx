'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock3,
  Coffee,
  Download,
  FileSpreadsheet,
  MapPin,
  Package,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourier } from '@/contexts/CourierContext';
import { getCourierLevel, getNextLevel } from '@/services/courier-pro';
import { getBrowserClient } from '@/lib/db/supabase';
import { formatCop } from '@/lib/money/cop';
import { SkeletonStats } from '@/components/ui/skeleton';
import { setCourierOperationalStatusAction } from '@/app/actions/courier-operations';

const STATUS_CYCLE: Record<string, 'available' | 'busy' | 'offline' | 'on_break'> = {
  available: 'on_break',
  on_break: 'offline',
  busy: 'offline',
  offline: 'available',
};

const STATUS_PRESENTATION: Record<
  string,
  { label: string; description: string; icon: React.ReactNode; className: string }
> = {
  available: {
    label: 'Disponible',
    description: 'Jornada abierta y recibiendo solicitudes.',
    icon: <Bike className="h-7 w-7" />,
    className: 'border-emerald-300 bg-emerald-500/10 text-emerald-700',
  },
  busy: {
    label: 'Ocupado',
    description: 'Tienes un domicilio activo.',
    icon: <Zap className="h-7 w-7" />,
    className: 'border-amber-300 bg-amber-500/10 text-amber-700',
  },
  on_break: {
    label: 'En pausa',
    description: 'La jornada sigue abierta, pero no recibes pedidos.',
    icon: <Coffee className="h-7 w-7" />,
    className: 'border-sky-300 bg-sky-500/10 text-sky-700',
  },
  offline: {
    label: 'Fuera de línea',
    description: 'Jornada cerrada. Actívate para trabajar.',
    icon: <XCircle className="h-7 w-7" />,
    className: 'border-slate-300 bg-slate-500/10 text-slate-700',
  },
};

type ShiftState = {
  id: string;
  openedAt: string;
  elapsedSeconds: number;
} | null;

function durationLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours} h ${minutes} min`;
}

export default function CourierDashboard() {
  const { profile } = useAuth();
  const {
    courier,
    activeDeliveries,
    availableOrders,
    loading,
    courierStatus,
    financialBalance,
    todayEarnings,
    weekEarnings,
    monthEarnings,
    totalEarnings,
    refresh,
  } = useCourier();
  const [changingStatus, setChangingStatus] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [shift, setShift] = useState<ShiftState>(null);
  const [statusError, setStatusError] = useState('');
  const [clock, setClock] = useState(Date.now());

  const loadShift = async () => {
    if (!profile?.id) return;
    const supabase = getBrowserClient();
    const { data } = await supabase
      .from('operation_sessions')
      .select('id,opened_at')
      .eq('actor_id', profile.id)
      .eq('session_type', 'courier')
      .eq('status', 'open')
      .maybeSingle();
    if (!data) {
      setShift(null);
      return;
    }
    setShift({
      id: String(data.id),
      openedAt: String(data.opened_at),
      elapsedSeconds: Math.max(
        0,
        Math.floor((Date.now() - new Date(data.opened_at).getTime()) / 1000),
      ),
    });
  };

  useEffect(() => {
    void loadShift();
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [profile?.id]);

  const currentStatus = courierStatus && STATUS_PRESENTATION[courierStatus]
    ? courierStatus
    : 'offline';
  const presentation = STATUS_PRESENTATION[currentStatus];
  const activeOrder = activeDeliveries[0] ?? null;
  const level = useMemo(
    () => getCourierLevel(courier?.total_deliveries ?? 0),
    [courier?.total_deliveries],
  );
  const nextLevel = useMemo(
    () => getNextLevel(courier?.total_deliveries ?? 0),
    [courier?.total_deliveries],
  );
  const progress = nextLevel
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (((courier?.total_deliveries ?? 0) - level.minDeliveries) /
              Math.max(1, nextLevel.minDeliveries - level.minDeliveries)) *
              100,
          ),
        ),
      )
    : 100;
  const currentShiftSeconds = shift
    ? Math.max(shift.elapsedSeconds, Math.floor((clock - new Date(shift.openedAt).getTime()) / 1000))
    : 0;
  const workDate = new Date().toISOString().slice(0, 10);

  const changeStatus = async () => {
    if (changingStatus) return;
    const next = STATUS_CYCLE[currentStatus] ?? 'available';
    setChangingStatus(true);
    setStatusError('');
    try {
      const result = await setCourierOperationalStatusAction({ status: next });
      if (!result.success) throw new Error(result.error);
      await Promise.all([refresh(), loadShift()]);
    } catch (cause) {
      setStatusError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado');
    } finally {
      setChangingStatus(false);
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (accepting) return;
    setAccepting(orderId);
    try {
      const { acceptOrderByCourierAction } = await import('@/app/actions/courier-orders');
      const result = await acceptOrderByCourierAction(orderId);
      if (!result.success) throw new Error(result.error);
      await refresh();
    } catch (cause) {
      setStatusError(cause instanceof Error ? cause.message : 'No se pudo aceptar el pedido');
    } finally {
      setAccepting(null);
    }
  };

  if (loading) return <SkeletonStats />;

  const companyOwes = financialBalance?.companyOwesCourier ?? 0;
  const courierOwes = financialBalance?.courierOwesCompany ?? 0;

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" /> Operación del repartidor
            </div>
            <h1 className="mt-4 text-3xl font-black">Hola, {profile?.first_name || 'repartidor'}</h1>
            <p className="mt-2 text-sm text-slate-300">
              Ganancias, jornada, pedidos, mapa y saldo con DomiU calculados desde el libro contable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/repartidor/liquidacion?date=${workDate}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
            >
              <Download className="h-4 w-4" /> Ver desprendible
            </Link>
            <a
              href={`/api/reports/courier-statement?courierId=${profile?.id}&date=${workDate}&format=xls`}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </a>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={changeStatus}
        disabled={changingStatus}
        className={`w-full rounded-3xl border-2 p-6 text-left transition hover:-translate-y-0.5 ${presentation.className}`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-current/10">
              {changingStatus ? <RefreshCw className="h-7 w-7 animate-spin" /> : presentation.icon}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]">Estado actual</p>
              <h2 className="mt-1 text-2xl font-black">{presentation.label}</h2>
              <p className="mt-1 text-sm opacity-80">{presentation.description}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-current/20 bg-background/70 px-4 py-3 text-foreground">
            <p className="text-xs text-muted-foreground">Tiempo en línea hoy</p>
            <p className="mt-1 font-black">{durationLabel(currentShiftSeconds)}</p>
          </div>
        </div>
      </button>

      {statusError && (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {statusError}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ganancia hoy', value: formatCop(todayEarnings), icon: TrendingUp },
          { label: 'Ganancia semana', value: formatCop(weekEarnings), icon: TrendingUp },
          { label: 'Ganancia mes', value: formatCop(monthEarnings), icon: Wallet },
          { label: 'Ganancia histórica', value: formatCop(totalEarnings), icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-black">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Valor neto del repartidor después de la comisión DomiU.
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article
          className={`rounded-3xl border p-6 shadow-sm ${
            courierOwes > 0
              ? 'border-amber-300 bg-amber-500/10'
              : 'border-emerald-300 bg-emerald-500/10'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Saldo con DomiU
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {courierOwes > 0
                  ? `Debes entregar ${formatCop(courierOwes)}`
                  : companyOwes > 0
                    ? `DomiU te debe ${formatCop(companyOwes)}`
                    : 'Saldo en cero'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                El saldo combina tus ganancias y el efectivo que hayas cobrado a clientes. Cada movimiento queda registrado y no se calcula con valores estimados.
              </p>
            </div>
            {courierOwes > 0 ? (
              <AlertTriangle className="h-7 w-7 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-xs text-muted-foreground">DomiU te debe</p>
              <p className="mt-1 font-black">{formatCop(companyOwes)}</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-xs text-muted-foreground">Debes a DomiU</p>
              <p className="mt-1 font-black">{formatCop(courierOwes)}</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Nivel</p>
              <h2 className="mt-2 text-xl font-black">
                {level.icon} {level.title}
              </h2>
            </div>
            <span className="rounded-2xl bg-primary/10 px-3 py-2 text-xs font-black text-primary">
              {courier?.total_deliveries ?? 0} entregas
            </span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {nextLevel
              ? `${Math.max(0, nextLevel.minDeliveries - (courier?.total_deliveries ?? 0))} entregas para ${nextLevel.title}`
              : 'Alcanzaste el nivel máximo.'}
          </p>
        </article>
      </section>

      {activeOrder && (
        <section className="rounded-3xl border-2 border-sky-300 bg-sky-500/10 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-sky-600" />
              <h2 className="font-black">Domicilio activo #{activeOrder.order_number}</h2>
            </div>
            <Link href="/repartidor/pedidos" className="text-xs font-black text-primary">
              Abrir seguimiento
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Comercio" value={activeOrder.business_name} />
            <Info label="Cliente" value={activeOrder.customer_name} />
            <Info label="Dirección" value={activeOrder.delivery_address} />
            <Info label="Tu ganancia" value={formatCop(Math.round(activeOrder.delivery_fee * 0.8))} />
          </div>
        </section>
      )}

      <section className="rounded-3xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-black">Domicilios disponibles</h2>
            <p className="text-xs text-muted-foreground">Solo puedes aceptar estando disponible.</p>
          </div>
          <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            {availableOrders.length}
          </span>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {availableOrders.slice(0, 6).map((order) => (
            <article key={order.id} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black">#{order.order_number}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{order.business_name}</p>
                </div>
                <span className="text-sm font-black text-success">
                  {formatCop(Math.round(order.delivery_fee * 0.8))}
                </span>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{order.delivery_address}</span>
              </div>
              <button
                type="button"
                onClick={() => void acceptOrder(order.id)}
                disabled={currentStatus !== 'available' || Boolean(accepting)}
                className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                {accepting === order.id ? 'Aceptando…' : 'Aceptar domicilio'}
              </button>
            </article>
          ))}
          {availableOrders.length === 0 && (
            <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-3 h-8 w-8 opacity-50" />
              No hay domicilios disponibles en este momento.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-primary" />
          <div>
            <h2 className="font-black">Domi para repartidores</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Domi podrá explicarte la app, el saldo, las liquidaciones, el mapa y los pasos de cada domicilio usando únicamente información autorizada de tu perfil.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}
