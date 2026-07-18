'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ProductPlaceholder } from '@/components/ui/placeholders';
import { Plus, Check, ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  name: string;
  price: number;
  image?: string;
  description?: string;
  currency?: string;
  isAvailable?: boolean;
  category?: string;
  isAdded?: boolean;
  inCart?: boolean;
  onAdd?: () => void;
  onViewCart?: () => void;
  className?: string;
}

function formatPrice(value: number, currency: string) {
  if (currency !== '$') return `${currency}${value.toLocaleString('es-CO')}`;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductCard({
  name,
  price,
  image,
  description,
  currency = '$',
  isAvailable = true,
  category,
  isAdded,
  inCart,
  onAdd,
  onViewCart,
  className,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = React.useState(false);

  const handleAdd = () => {
    if (justAdded) return;
    setJustAdded(true);
    onAdd?.();
    window.setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        !isAvailable && 'opacity-60',
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ProductPlaceholder />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {category && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-900 shadow-sm backdrop-blur-sm">
            {category}
          </span>
        )}

        {!isAvailable && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-sm">
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground shadow-lg">No disponible</span>
          </div>
        )}

        {justAdded && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-success/35 backdrop-blur-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success shadow-xl"><Check className="h-7 w-7 text-white" /></div>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-base font-bold leading-tight text-foreground">{name}</h3>
          {description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-lg font-black tracking-tight text-foreground">{formatPrice(price, currency)}</span>

          {isAvailable && onAdd && (
            justAdded || isAdded ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success text-white shadow-lg"><Check className="h-5 w-5" /></div>
            ) : inCart ? (
              <button onClick={onViewCart} className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20">
                <ShoppingBag className="h-3.5 w-3.5" /> En carrito
              </button>
            ) : (
              <button onClick={handleAdd} aria-label={`Agregar ${name}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 active:scale-90">
                <Plus className="h-5 w-5" />
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
}
