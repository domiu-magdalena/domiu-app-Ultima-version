'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/ui/page-container';
import { HeroSearch } from '@/components/marketplace/hero-search';
import { CategoryScroll } from '@/components/marketplace/category-scroll';
import { BusinessCard } from '@/components/delivery/business-card';
import { marketplaceService } from '@/services/marketplace';
import type { MarketplaceCategory, MarketplaceBusiness } from '@/services/marketplace';
import { ChevronRight, Tag, TrendingUp, MapPin, Pill, ShoppingBasket, Crown } from 'lucide-react';
import { Skeleton, BusinessCardSkeleton, CategoryScrollSkeleton, PromoBannerSkeleton } from '@/components/ui/skeleton';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  promociones: <Tag className="h-5 w-5" />,
  mas_pedidos: <TrendingUp className="h-5 w-5" />,
  cerca_ti: <MapPin className="h-5 w-5" />,
  farmacias: <Pill className="h-5 w-5" />,
  supermercados: <ShoppingBasket className="h-5 w-5" />,
  destacados: <Crown className="h-5 w-5" />,
};

const SECTION_COLORS: Record<string, string> = {
  promociones: 'from-rose-500 to-pink-600',
  mas_pedidos: 'from-amber-500 to-orange-600',
  cerca_ti: 'from-emerald-500 to-teal-600',
  farmacias: 'from-sky-500 to-blue-600',
  supermercados: 'from-violet-500 to-purple-600',
  destacados: 'from-primary to-primary/80',
};

function SectionHeader({
  icon,
  title,
  viewAllHref,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  viewAllHref?: string;
  color: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white shadow-sm`}>
          {icon}
        </div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
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
  );
}

function HorizontalBusinessScroll({ businesses }: { businesses: MarketplaceBusiness[] }) {
  if (businesses.length === 0) return null;
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
      {businesses.map((biz) => (
        <Link key={biz.id} href={`/cliente/business/${biz.slug}`} className="shrink-0 w-[220px] sm:w-[260px]">
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
            promotion={biz.promotion}
          />
        </Link>
      ))}
    </div>
  );
}

function PromoBanner({ business }: { business: MarketplaceBusiness }) {
  return (
    <Link
      href={`/cliente/business/${business.slug}`}
      className="group relative block h-44 w-[280px] shrink-0 overflow-hidden rounded-2xl sm:h-52 sm:w-[320px]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/90 via-rose-600/80 to-pink-700/90 transition-all duration-500 group-hover:scale-105" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
      <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white">
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {business.delivery_time}
          </span>
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-900">
            -20%
          </span>
        </div>
        <div>
          <h3 className="text-lg font-bold leading-tight">{business.name}</h3>
          <p className="mt-1 text-sm text-white/70 line-clamp-1">{business.category_name}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
            <span>⭐ {business.rating}</span>
            <span>{business.delivery_fee}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ClienteHome() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [featured, setFeatured] = useState<MarketplaceBusiness[]>([]);
  const [nearby, setNearby] = useState<MarketplaceBusiness[]>([]);
  const [recommended, setRecommended] = useState<MarketplaceBusiness[]>([]);
  const [pharmacies, setPharmacies] = useState<MarketplaceBusiness[]>([]);
  const [supermarkets, setSupermarkets] = useState<MarketplaceBusiness[]>([]);
  const [promotions, setPromotions] = useState<MarketplaceBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cats, feat, near, rec, pharm, superm] = await Promise.all([
        marketplaceService.getCategories(),
        marketplaceService.getFeaturedBusinesses(),
        marketplaceService.getBusinesses({ isOpen: true }),
        marketplaceService.getRecommendedBusinesses(),
        marketplaceService.getBusinessesByType('pharmacy'),
        marketplaceService.getBusinessesByType('supermarket'),
      ]);
      setCategories(cats);
      setFeatured(feat);
      setNearby(near);
      setRecommended(rec);
      setPharmacies(pharm);
      setSupermarkets(superm);
      setPromotions(feat.filter((b) => b.rating >= 4.5).slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-8 pb-8">
          <div className="animate-pulse rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 px-6 py-8 sm:px-8 sm:py-10">
            <div className="mb-4 h-9 w-48 rounded-full bg-white/20" />
            <div className="mb-2 h-8 w-72 rounded-lg bg-white/20" />
            <div className="mb-6 h-4 w-56 rounded bg-white/10" />
            <div className="h-13 w-full rounded-2xl bg-white/20" style={{ height: '52px' }} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-24" />
            </div>
            <CategoryScrollSkeleton />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              <PromoBannerSkeleton />
              <PromoBannerSkeleton />
              <PromoBannerSkeleton />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <BusinessCardSkeleton />
              <BusinessCardSkeleton />
              <BusinessCardSkeleton />
              <BusinessCardSkeleton />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  const sections: Array<{
    key: string;
    title: string;
    businesses: MarketplaceBusiness[];
    horizontal?: boolean;
    promo?: boolean;
  }> = [
    ...(promotions.length > 0 ? [{ key: 'promociones', title: 'Promociones', businesses: promotions, promo: true }] : []),
    ...(recommended.length > 0 ? [{ key: 'mas_pedidos', title: 'Los más pedidos', businesses: recommended, horizontal: true }] : []),
    ...(nearby.length > 0 ? [{ key: 'cerca_ti', title: 'Cerca de ti', businesses: nearby }] : []),
    ...(pharmacies.length > 0 ? [{ key: 'farmacias', title: 'Farmacias', businesses: pharmacies, horizontal: true }] : []),
    ...(supermarkets.length > 0 ? [{ key: 'supermercados', title: 'Supermercados', businesses: supermarkets, horizontal: true }] : []),
    ...(featured.length > 0 ? [{ key: 'destacados', title: 'Restaurantes destacados', businesses: featured }] : []),
  ];

  return (
    <PageContainer>
      <div className="space-y-8 pb-8">
        <HeroSearch />

        <section className="animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-foreground">Categorías</h2>
            </div>
            <Link
              href="/cliente/categories"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-primary hover:gap-1.5"
            >
              Ver todo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <CategoryScroll categories={categories} />
        </section>

        {sections.map((section) => (
          <section key={section.key} className="animate-fade-in">
            <SectionHeader
              icon={SECTION_ICONS[section.key]}
              title={section.title}
              viewAllHref="/cliente/search"
              color={SECTION_COLORS[section.key]}
            />
            {section.promo ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                {section.businesses.map((biz) => (
                  <PromoBanner key={biz.id} business={biz} />
                ))}
              </div>
            ) : section.horizontal ? (
              <HorizontalBusinessScroll businesses={section.businesses} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.businesses.map((biz) => (
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
                      promotion={biz.promotion}
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </PageContainer>
  );
}
