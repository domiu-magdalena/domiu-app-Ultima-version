'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CourierSidebar } from '@/components/courier/layout/CourierSidebar';
import { CourierTopbar } from '@/components/courier/layout/CourierTopbar';
import { CourierDispatchAlarm } from '@/components/courier/CourierDispatchAlarm';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CourierProvider } from '@/contexts/CourierContext';
import { Home, ClipboardList, Map, DollarSign, User } from 'lucide-react';

const navItems = [
  { label: 'Inicio', href: '/repartidor', icon: <Home className="h-5 w-5" /> },
  { label: 'Pedidos', href: '/repartidor/pedidos', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Mapa', href: '/repartidor/mapa', icon: <Map className="h-5 w-5" /> },
  { label: 'Ganancias', href: '/repartidor/ganancias', icon: <DollarSign className="h-5 w-5" /> },
  { label: 'Perfil', href: '/repartidor/perfil', icon: <User className="h-5 w-5" /> },
];

export default function RepartidorLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace('/login');
    } else if (!isLoading && profile && profile.role !== 'courier') {
      router.replace('/?error=unauthorized');
    }
  }, [isLoading, profile, router]);

  if (isLoading) return <SkeletonCard />;
  if (!profile) return null;
  if (profile.role !== 'courier') return null;

  return (
    <div className="min-h-[100dvh] w-full min-w-0 max-w-full overflow-x-clip bg-background">
      <CourierProvider courierId={profile.id}>
        <CourierDispatchAlarm />
        <CourierSidebar />
        <div className="min-w-0 max-w-full overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] transition-all duration-300 lg:pl-72 lg:pb-0">
          <CourierTopbar />
          <main className="min-w-0 max-w-full overflow-x-clip p-3 sm:p-5 lg:p-6">
            <ErrorBoundary name="Layout-children">
              {children}
            </ErrorBoundary>
          </main>
        </div>
        <BottomNavigation items={navItems} />
      </CourierProvider>
    </div>
  );
}
