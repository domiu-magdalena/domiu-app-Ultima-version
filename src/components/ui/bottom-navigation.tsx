'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

interface BottomNavigationProps {
  items: BottomNavItem[];
  className?: string;
}

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 max-w-full border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_-24px_rgba(0,0,0,.8)] backdrop-blur-xl lg:hidden',
        className,
      )}
    >
      <div
        className="grid min-h-16 w-full min-w-0 items-stretch px-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg px-0.5 py-1 text-[10px] font-semibold leading-tight transition-colors min-[380px]:text-[11px]',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80',
              )}
            >
              {isActive && <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-primary" />}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
              </span>
              <span className="block w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
