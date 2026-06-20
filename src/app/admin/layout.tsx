'use client';

import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { Footer } from '@/components/ui/footer';
import { LoadingState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';
import { adminAuthService } from '@/services/admin-auth';
import { auditService } from '@/services/audit';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, profile } = useAuth();
  const router = useRouter();
  const sessionRegistered = useRef(false);

  useEffect(() => {
    if (profile?.id && !sessionRegistered.current) {
      sessionRegistered.current = true;
      adminAuthService.registerSession(profile.id);
      adminAuthService.addHistory(profile.id, 'login', 'Acceso al panel de administración');
      auditService.log(profile.id, `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin', 'login', 'session', null, 'Acceso al panel de administración');
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingState />;

  if (!profile) {
    router.push('/login');
    return null;
  }

  if (profile.role !== 'admin') {
    const roleRoutes: Record<string, string> = {
      merchant: '/negocio',
      courier: '/repartidor',
      customer: '/cliente',
    };
    router.push(roleRoutes[profile.role] || '/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className={cn('transition-all duration-300 lg:pl-64')}>
        <AdminHeader />
        <main className="p-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
