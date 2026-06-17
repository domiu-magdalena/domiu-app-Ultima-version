'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BusinessCard } from '@/components/delivery/business-card';
import type { MarketplaceBusiness } from '@/services/marketplace';

interface BusinessSectionProps {
  title: string;
  businesses: MarketplaceBusiness[];
  viewAllHref?: string;
}

export function BusinessSection({ title, businesses, viewAllHref }: BusinessSectionProps) {
  return (
    <section className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-primary hover:gap-1.5"
          >
            Ver todo
            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {businesses.map((biz) => (
          <Link key={biz.id} href={`/cliente/business/${biz.slug}`} className="block">
            <BusinessCard
              name={biz.name}
              image={biz.banner_url ?? biz.logo_url ?? undefined}
              category={biz.category_name}
              rating={biz.rating}
              reviewCount={biz.review_count}
              deliveryTime={biz.delivery_time}
              deliveryFee={biz.delivery_fee}
              isOpen={biz.is_open}
              isFeatured={biz.is_featured}
              distance={biz.distance}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
