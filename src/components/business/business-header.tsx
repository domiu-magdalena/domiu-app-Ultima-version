'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Circle, ChevronDown } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function BusinessHeader() {
  const { profile } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex min-h-16 min-w-0 items-center justify-between gap-2 border-b border-border/50 bg-background/90 px-3 py-2 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-success/20 bg-gradient-to-br from-success/10 to-success/5 px-2.5 py-1.5 sm:px-3">
          <Circle className="h-2.5 w-2.5 shrink-0 fill-success text-success" />
          <span className="text-xs font-medium text-success">Abierto</span>
        </div>
        <span className="hidden truncate text-xs text-muted-foreground sm:block">Hoy: 8:00 AM - 10:00 PM</span>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationBell />
        <button
          type="button"
          onClick={() => router.push('/negocio/configuracion')}
          className="flex min-w-0 items-center gap-1.5 rounded-xl border border-border/50 px-2 py-1.5 transition-colors hover:bg-muted sm:gap-2 sm:px-3"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 text-xs font-bold text-warning">
            {profile?.first_name?.[0] || 'N'}
          </div>
          <div className="hidden min-w-0 text-left sm:block">
            <p className="max-w-28 truncate text-xs font-medium leading-tight text-foreground">{profile?.first_name || 'Negocio'}</p>
            <p className="text-[10px] text-muted-foreground">Vendedor</p>
          </div>
          <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground min-[380px]:block" />
        </button>
      </div>
    </header>
  );
}
