'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { notificationService, type NotificationData } from '@/services/notifications';
import { Bell, Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  order_confirmed: <Check className="h-4 w-4 text-status-success" />,
  order_preparing: <Clock className="h-4 w-4 text-warning" />,
  order_ready: <Check className="h-4 w-4 text-primary" />,
  driver_assigned: <Bell className="h-4 w-4 text-info" />,
  order_assigned: <Bell className="h-4 w-4 text-info" />,
  order_in_transit: <Bell className="h-4 w-4 text-primary" />,
  order_delivered: <CheckCheck className="h-4 w-4 text-status-success" />,
  order_cancelled: <Bell className="h-4 w-4 text-destructive" />,
  new_order: <Bell className="h-4 w-4 text-primary" />,
  new_message: <Bell className="h-4 w-4 text-info" />,
  new_registration: <Bell className="h-4 w-4 text-warning" />,
};

export function NotificationBell({ className }: { className?: string }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationData[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    notificationService.getUnreadCount(profile.id).then(setUnread).catch(() => {});
    const unsub = notificationService.subscribe(profile.id, () => {
      setUnread((c) => c + 1);
    });
    return unsub;
  }, [profile?.id]);

  const toggle = async () => {
    if (!profile?.id) return;
    if (!open) {
      const all = await notificationService.getNotifications(profile.id, 10).catch(() => []);
      setItems(all);
    }
    setOpen(!open);
  };

  const handleClick = async (n: NotificationData) => {
    if (!n.is_read) {
      await notificationService.markAsRead(n.id).catch(() => {});
      setUnread((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (n.action_url) {
      router.push(n.action_url);
    } else if (n.order_id) {
      if (profile?.role === 'merchant') router.push(`/negocio/pedidos?id=${n.order_id}`);
      else if (profile?.role === 'customer') router.push(`/cliente/pedidos/${n.order_id}`);
      else if (profile?.role === 'courier') router.push(`/repartidor/pedidos?id=${n.order_id}`);
    }
    setOpen(false);
  };

  const handleMarkAll = async () => {
    if (!profile?.id) return;
    await notificationService.markAllAsRead(profile.id).catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-dropdown animate-scale-in">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50',
                    !n.is_read && 'bg-primary/5',
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {TYPE_ICONS[n.notification_type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', n.is_read ? 'text-foreground' : 'font-semibold text-foreground')}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <button
              onClick={() => { router.push('/notificaciones'); setOpen(false); }}
              className="w-full text-center text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
