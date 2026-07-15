'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { Footer } from '@/components/ui/footer';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const navItems = [
  { label: 'Inicio', href: '/cliente', icon: <span className="text-lg">🏠</span> },
  { label: 'Pedidos', href: '/cliente/pedidos', icon: <span className="text-lg">📋</span> },
  { label: 'Solicitudes', href: '/cliente/solicitudes', icon: <span className="text-lg">📝</span> },
  { label: 'Soporte', href: '/soporte', icon: <span className="text-lg">💬</span> },
  { label: 'Perfil', href: '/cliente/perfil', icon: <span className="text-lg">👤</span> },
];

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, profile, error, retrySession } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !profile && !error) router.replace('/login');
  }, [error, isLoading, profile, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-primary/15" />
          <div className="mx-auto h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mx-auto h-3 w-56 animate-pulse rounded bg-muted" />
          <p className="text-xs text-muted-foreground">Preparando DomiU…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
        <section className="w-full max-w-md rounded-3xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground">D</div>
          <h1 className="mt-4 text-xl font-black">No pudimos abrir tu sesión</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'Tu sesión finalizó. Inicia sesión nuevamente.'}</p>
          <button type="button" onClick={() => void retrySession()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
          <Link href="/login" className="mt-3 inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold">Ir al inicio de sesión</Link>
        </section>
      </div>
    );
  }

  return (
    <ChatProvider userId={profile.id} userRole="customer">
      <div className="min-h-[100dvh] max-w-full overflow-x-hidden bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-6">
          <div className="flex h-14 items-center justify-between sm:h-16">
            <Link href="/cliente" className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">D</div>
              <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">DomiU</h2>
            </Link>

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <NotificationBell />
              <Link href="/cliente/configuracion" title="Configuración" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><span className="text-lg">⚙️</span></Link>
              <Link href="/cliente/cart" title="Carrito" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <span className="text-lg">🛒</span>
                {itemCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{itemCount > 9 ? '9+' : itemCount}</span>}
              </Link>
            </div>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden px-3 sm:px-6">{children}</main>
        <div className="hidden lg:block"><Footer /></div>
        <BottomNavigation items={navItems} />
      </div>
    </ChatProvider>
  );
}
