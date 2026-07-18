'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, Clock3, MapPin, Navigation, PackageCheck, Route, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCourier } from '@/contexts/CourierContext';
import { getBrowserClient } from '@/lib/db/supabase';
import { acceptOrderByCourierAction } from '@/app/actions/courier-orders';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

type BrowserAudioContext = AudioContext & { close: () => Promise<void> };

function createAlarmTone(context: AudioContext) {
  const start = context.currentTime;
  [880, 660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = start + index * 0.24;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.2);
  });
}

export function CourierDispatchAlarm() {
  const router = useRouter();
  const { profile } = useAuth();
  const { availableOrders, activeDeliveries, courierStatus, loading, refresh } = useCourier();
  const [activeNotificationOrderIds, setActiveNotificationOrderIds] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioContextRef = useRef<BrowserAudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  const loadActiveNotifications = useCallback(async () => {
    if (!profile?.id) return;
    const supabase = getBrowserClient();
    const { data } = await supabase
      .from('notifications')
      .select('order_id')
      .eq('recipient_id', profile.id)
      .eq('notification_type', 'new_order_available')
      .eq('is_read', false)
      .is('deleted_at', null)
      .not('order_id', 'is', null)
      .order('created_at', { ascending: false });
    setActiveNotificationOrderIds(
      Array.from(new Set((data ?? []).map((row) => row.order_id).filter(Boolean))) as string[],
    );
  }, [profile?.id]);

  useEffect(() => {
    void loadActiveNotifications();
  }, [loadActiveNotifications]);

  useEffect(() => {
    if (!profile?.id) return;
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`courier-dispatch-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${profile.id}` }, () => {
        void loadActiveNotifications();
        void refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void refresh())
      .subscribe();
    const polling = window.setInterval(() => {
      void loadActiveNotifications();
      void refresh();
    }, 10_000);
    return () => {
      window.clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [loadActiveNotifications, profile?.id, refresh]);

  const alertOrder = useMemo(() => {
    const notified = availableOrders.find((order) => activeNotificationOrderIds.includes(order.id));
    return notified ?? availableOrders[0] ?? null;
  }, [activeNotificationOrderIds, availableOrders]);

  useEffect(() => {
    if (!alertOrder?.id) {
      setDistanceKm(null);
      setDurationMinutes(null);
      return;
    }
    const supabase = getBrowserClient();
    void supabase
      .from('orders')
      .select('delivery_distance_km,metadata')
      .eq('id', alertOrder.id)
      .maybeSingle()
      .then(({ data }) => {
        setDistanceKm(data?.delivery_distance_km == null ? null : Number(data.delivery_distance_km));
        const metadata = (data?.metadata || {}) as Record<string, unknown>;
        setDurationMinutes(metadata.delivery_duration_minutes == null ? null : Number(metadata.delivery_duration_minutes));
      });
  }, [alertOrder?.id]);

  const shouldAlarm = !loading && courierStatus === 'available' && activeDeliveries.length === 0 && Boolean(alertOrder);

  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current !== null) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if ('vibrate' in navigator) navigator.vibrate(0);
  }, []);

  const playAlarm = useCallback(async () => {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextConstructor() as BrowserAudioContext;
    const context = audioContextRef.current;
    if (context.state === 'suspended') await context.resume();
    createAlarmTone(context);
    setSoundBlocked(false);
    if ('vibrate' in navigator) navigator.vibrate([350, 160, 350, 160, 550]);
  }, []);

  useEffect(() => {
    if (!shouldAlarm) {
      stopAlarm();
      return;
    }
    const start = async () => {
      try {
        await playAlarm();
      } catch {
        setSoundBlocked(true);
      }
    };
    void start();
    alarmIntervalRef.current = window.setInterval(() => void start(), 2_200);
    const unlockSound = () => void playAlarm().catch(() => setSoundBlocked(true));
    window.addEventListener('pointerdown', unlockSound, { once: true });
    window.addEventListener('keydown', unlockSound, { once: true });
    return () => {
      stopAlarm();
      window.removeEventListener('pointerdown', unlockSound);
      window.removeEventListener('keydown', unlockSound);
    };
  }, [alertOrder?.id, playAlarm, shouldAlarm, stopAlarm]);

  useEffect(() => () => {
    stopAlarm();
    if (audioContextRef.current) void audioContextRef.current.close();
  }, [stopAlarm]);

  const acceptOrder = async () => {
    if (!alertOrder || accepting) return;
    setAccepting(true);
    const result = await acceptOrderByCourierAction(alertOrder.id);
    if (!result.success) {
      toast.error(result.error || 'No se pudo aceptar el domicilio');
      await Promise.all([loadActiveNotifications(), refresh()]);
      setAccepting(false);
      return;
    }
    stopAlarm();
    toast.success(`Pedido #${alertOrder.order_number} aceptado`);
    await Promise.all([loadActiveNotifications(), refresh()]);
    router.push('/repartidor/mapa');
    router.refresh();
    setAccepting(false);
  };

  if (!shouldAlarm || !alertOrder) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section role="alertdialog" aria-live="assertive" className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-orange-300/50 bg-white shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-2 animate-pulse bg-gradient-to-r from-orange-500 via-amber-300 to-orange-500" />
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 text-3xl font-black text-white shadow-xl">
              <span className="absolute inset-0 animate-ping rounded-3xl bg-orange-400/30" />
              <span className="relative">D</span>
              <BellRing className="absolute -bottom-2 -right-2 h-8 w-8 animate-bounce rounded-full bg-white p-1.5 text-orange-500 shadow-lg" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Alarma DomiU</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Nuevo domicilio disponible</h2>
              <p className="mt-1 text-sm text-slate-500">La alarma se cerrará cuando un repartidor acepte.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div><p className="text-[11px] font-semibold uppercase text-slate-500">Ticket</p><p className="font-black text-slate-950">#{alertOrder.order_number}</p></div>
              <div className="text-right"><p className="text-[10px] font-bold uppercase text-orange-600">Valor del domicilio</p><p className="text-2xl font-black text-orange-600">{formatCurrency(alertOrder.delivery_fee)}</p></div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex gap-2"><Store className="mt-0.5 h-4 w-4 text-orange-500" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Recoger en</p><p className="text-sm font-semibold text-slate-800">{alertOrder.business_name}</p></div></div>
              <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 text-indigo-500" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Entregar en</p><p className="line-clamp-2 text-sm font-semibold text-slate-800">{alertOrder.delivery_address}</p></div></div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-white p-2 text-center"><Route className="mx-auto h-4 w-4 text-orange-500" /><p className="mt-1 font-black text-slate-900">{distanceKm == null ? '—' : `${distanceKm.toFixed(2)} km`}</p></div>
              <div className="rounded-xl bg-white p-2 text-center"><Clock3 className="mx-auto h-4 w-4 text-orange-500" /><p className="mt-1 font-black text-slate-900">{durationMinutes == null ? '—' : `${durationMinutes} min`}</p></div>
              <div className="rounded-xl bg-white p-2 text-center"><PackageCheck className="mx-auto h-4 w-4 text-orange-500" /><p className="mt-1 font-black text-slate-900">{alertOrder.items.length} producto(s)</p></div>
            </div>
          </div>

          {soundBlocked && <button type="button" onClick={() => void playAlarm()} className="mt-4 w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Toca aquí para activar el sonido</button>}
          <button type="button" onClick={acceptOrder} disabled={accepting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 text-base font-black text-white shadow-xl disabled:opacity-60">
            <Navigation className="h-5 w-5" />{accepting ? 'Confirmando asignación…' : `Aceptar domicilio por ${formatCurrency(alertOrder.delivery_fee)}`}
          </button>
        </div>
      </section>
    </div>
  );
}
