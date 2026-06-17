'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, MapPin } from 'lucide-react';

interface BusinessCardProps {
  name: string;
  image?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  deliveryTime?: string;
  deliveryFee?: string;
  isOpen?: boolean;
  isFeatured?: boolean;
  distance?: string;
  promotion?: string;
  className?: string;
}

export function BusinessCard({
  name,
  image,
  category,
  rating = 0,
  reviewCount,
  deliveryTime,
  deliveryFee,
  isOpen = true,
  isFeatured,
  distance,
  promotion,
  className,
}: BusinessCardProps) {
  return (
    <Card hover className={cn('group overflow-hidden', className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-all duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl text-muted-foreground/20 transition-transform duration-500 group-hover:scale-110">
            🏪
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {promotion && (
          <div className="absolute left-3 top-3 z-10 animate-fade-in">
            <Badge variant="warning" className="bg-warning/90 text-warning-foreground shadow-lg backdrop-blur-sm">
              {promotion}
            </Badge>
          </div>
        )}

        {isFeatured && (
          <div className="absolute right-3 top-3 z-10">
            <Badge variant="default" className="bg-primary/90 text-primary-foreground shadow-lg backdrop-blur-sm">
              Destacado
            </Badge>
          </div>
        )}

        {!isOpen && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Badge variant="destructive" className="px-4 py-1.5 text-sm shadow-lg">
              Cerrado
            </Badge>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
          {distance && (
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
              <MapPin className="h-3 w-3" />
              {distance}
            </span>
          )}
          {deliveryTime && (
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
              <Clock className="h-3 w-3" />
              {deliveryTime}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground transition-colors duration-200 group-hover:text-primary truncate">
              {name}
            </h3>
            {category && (
              <p className="mt-0.5 text-xs text-muted-foreground">{category}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {rating > 0 && (
            <span className="flex items-center gap-1 font-medium">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {rating.toFixed(1)}
              {reviewCount !== undefined && (
                <span className="text-muted-foreground/60">({reviewCount})</span>
              )}
            </span>
          )}
          {deliveryFee && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground/80">
              {deliveryFee}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
