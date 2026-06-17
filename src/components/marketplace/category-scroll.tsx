'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { MarketplaceCategory } from '@/services/marketplace';

interface CategoryScrollProps {
  categories: MarketplaceCategory[];
}

export function CategoryScroll({ categories }: CategoryScrollProps) {
  const router = useRouter();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => router.push('/cliente/categories')}
        className="flex shrink-0 flex-col items-center gap-2"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 text-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 hover:-translate-y-0.5 active:scale-95">
          🎯
        </div>
        <span className="text-xs font-medium text-muted-foreground">Todas</span>
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => router.push(`/cliente/search?cat=${cat.id}`)}
          className="flex shrink-0 flex-col items-center gap-2"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 text-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 hover:-translate-y-0.5 active:scale-95">
            {cat.icon}
          </div>
          <span className="text-xs font-medium text-muted-foreground max-w-[72px] truncate">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
