'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourier } from '@/contexts/CourierContext';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, User, ClipboardList, Map, TrendingUp, MessageCircle,
  Bell, Settings, LifeBuoy, LogOut, Menu, X, Bike,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/repartidor', icon: LayoutDashboard },
  { label: 'Mi perfil', href: '/repartidor/perfil', icon: User },
  { label: 'Pedidos', href: '/repartidor/pedidos', icon: ClipboardList },
  { label: 'Mapa y rutas', href: '/repartidor/mapa', icon: Map },
  { label: 'Ganancias', href: '/repartidor/ganancias', icon: TrendingUp },
  { label: 'Chat', href: '/repartidor/chat', icon: MessageCircle },
  { label: 'Notificaciones', href: '/repartidor/notificaciones', icon: Bell },
  { label: 'Configuración', href: '/repartidor/configuracion', icon: Settings },
  { label: 'Soporte', href: '/soporte', icon: LifeBuoy },
];

const STATUS_LABELS: Record<string, { label: string; dot: string }> = {
  available: { label: 'Disponible', dot: 'bg-success' },
  busy: { label: 'Ocupado', dot: 'bg-warning' },
  offline: { label: 'Desconectado', dot: 'bg-muted-foreground' },
  on_break: { label: 'En pausa', dot: 'bg-info' },
};

export function CourierSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { courierStatus } = useCourier();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const initials = profile
    ? `${profile.first_name?.charAt(0) ?? ''}${profile.last_name?.charAt(0) ?? ''}`
    : 'R';

  const statusKey = courierStatus || 'offline';
  const statusCfg = STATUS_LABELS[statusKey] || STATUS_LABELS.offline;
  const avatarUrl = profile?.avatar_url;

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
    router.refresh();
  };

  const sidebar = (
    <aside className="flex h-full flex-col bg-[#0F172A] text-white">
      <div className="flex h-16 items-center justify-between border-b border-[#334155] px-4">
        <Link href="/repartidor" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-warning to-orange-500 shadow-lg shadow-warning/20">
            <Bike className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="block text-sm font-bold text-white">DomiU</span>
            <span className="block text-[10px] font-medium text-[#94A3B8]">Courier</span>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:text-white transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-[#334155] p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full rounded-xl object-cover ring-2 ring-[#334155]" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#1E293B] text-sm font-bold text-white ring-2 ring-[#334155]">
                {initials || 'R'}
              </div>
            )}
            <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0F172A]', statusCfg.dot)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {profile?.first_name} {profile?.last_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
              <span className="text-[11px] text-[#94A3B8]">{statusCfg.label}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#1E293B] text-white shadow-sm border border-[#334155]'
                      : 'text-[#94A3B8] hover:bg-[#1E293B]/50 hover:text-white',
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#3B82F6]" />
                  )}
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-[#3B82F6]')} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[#334155] p-3 space-y-2">
        <div className="rounded-xl bg-[#1E293B] border border-[#334155] p-3">
          <div className="flex items-center gap-2">
            <Bike className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-medium text-white">Courier Pro</span>
          </div>
          <p className="mt-0.5 text-[10px] text-[#94A3B8]">v1.5</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#94A3B8] transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 flex lg:hidden h-9 w-9 items-center justify-center rounded-xl bg-[#0F172A]/90 border border-[#334155] shadow-sm backdrop-blur-sm text-white transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebar}
      </div>

      <div className="hidden lg:block fixed inset-y-0 left-0 z-40 w-72">
        {sidebar}
      </div>
    </>
  );
}
