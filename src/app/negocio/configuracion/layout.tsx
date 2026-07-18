'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Settings } from 'lucide-react';
import { MapsProvider } from '@/contexts/MapsContext';

const sections = [
  { href: '/negocio/configuracion', label: 'Configuración general', icon: Settings, exact: true },
  { href: '/negocio/configuracion/ubicacion', label: 'Dirección y ubicación', icon: MapPin, exact: false },
];

export default function BusinessSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <MapsProvider>
      <div className="space-y-4">
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2">
          {sections.map((section) => {
            const active = section.exact ? pathname === section.href : pathname.startsWith(section.href);
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active ? 'bg-warning text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </MapsProvider>
  );
}
