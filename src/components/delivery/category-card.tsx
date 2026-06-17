'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface CategoryCardProps {
  name: string;
  icon?: React.ReactNode;
  productCount?: number;
  image?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CategoryCard({
  name,
  icon,
  productCount,
  image,
  active,
  onClick,
  className,
}: CategoryCardProps) {
  return (
    <Card
      hover
      onClick={onClick}
      className={cn(
        'group cursor-pointer overflow-hidden transition-all duration-300',
        active && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 33vw, 25vw"
            className="object-cover transition-all duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl transition-transform duration-500 group-hover:scale-110">
            {icon ?? <span className="text-3xl text-muted-foreground/30">📁</span>}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="space-y-0.5 p-3 text-center">
        <h4 className="text-sm font-semibold text-foreground truncate transition-colors duration-200 group-hover:text-primary">
          {name}
        </h4>
        {productCount !== undefined && (
          <p className="text-xs text-muted-foreground">{productCount} productos</p>
        )}
      </div>
    </Card>
  );
}
