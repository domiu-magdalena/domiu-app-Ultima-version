'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/ui/page-container';
import { HeroSearch } from '@/components/marketplace/hero-search';
import { CategoryScroll } from '@/components/marketplace/category-scroll';
import { marketplaceService } from '@/services/marketplace';
import { ASSETS } from '@/lib/assets';
import type { MarketplaceCategory, MarketplaceBusiness } from '@/services/marketplace';
import { PremiumHeader } from './_components/PremiumHeader';
import { SearchBar } from './_components/SearchBar';
import { PromoCarousel } from './_components/PromoCarousel';
import { SectionHeader } from './_components/SectionHeader';
import { BusinessCardPremium } from './_components/BusinessCardPremium';
import { PromoCarouselSkeleton, SectionSkeleton } from './_components/SkeletonPremium';
import { Tag, TrendingUp, MapPin, Pill, ShoppingBasket, Crown, Sparkles, ArrowRight } from 'lucide-react';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  promociones: <Tag className="h-5 w-5" />,
  mas_pedidos: <TrendingUp className="h-5 w-5" />,
  cerca_ti: <MapPin className="h-5 w-5" />,
  farmacias: <Pill className="h-5 w-5" />,
  supermercados: <ShoppingBasket className="h-5 w-5" />,
  destacados: <Crown className="h-5 w-5" />,
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  promociones: 'Ofertas imperdibles',
  mas_pedidos: 'Los favoritos de la semana',
  cerca_ti: 'Restaurantes cercanos',
  farmacias: 'Todo en salud y bienestar',
  supermercados: 'Tu despensa en casa',
  destacados: 'Los mejores calificados',
};

function HorizontalBusinessScroll({ businesses }: { businesses: MarketplaceBusiness[] }) {
  if (businesses.length === 0) return null;
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none">
      {businesses.map((biz) => (
        <Link key={biz.id} href={`/cliente/business/${biz.slug}`} className="w-[260px] shrink-0 sm:w-[280px]">
          <BusinessCardPremium
            name={biz.name}
            image={biz.banner_url ?? biz.logo_url ?? undefined}
            logo={biz.logo_url ?? undefined}
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
  const PROMO_IMAGES = [ASSETS.promotions['50-off'], ASSETS.promotions.envio_gratis, ASSETS.promotions.combos, ASSETS.promotions.primera_compra];
  const bgImage = PROMO_IMAGES[Number(business.id?.charCodeAt?.(0) ?? 0) % PROMO_IMAGES.length];
  return (
    <Link
      href={`/cliente/business/${business.slug}`}
      className="group relative block h-44 w-[280px] shrink-0 overflow-hidden rounded-2xl sm:h-52 sm:w-[320px]"
    >
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${bgImage})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white">
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">{business.delivery_time}</span>
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-900">-20%</span>
        </div>
        <div>
          <h3 className="text-lg font-bold leading-tight">{business.name}</h3>
          <p className="mt-1 text-sm text-white/70 line-clamp-1">{business.category_name}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
            <span>{'★'.repeat(Math.round(business.rating))} {business.rating}</span>
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
  const [cityId, setCityId] = useState<string | undefined>();

  const handleCityChange = (newCityId: string) => setCityId(newCityId);

  useEffect(() => {
    const cid = cityId;
    marketplaceService.getCategories()
      .then((cats) => {
        setCategories(cats);
        return Promise.all([
          marketplaceService.getBusinesses({ featured: true, cityId: cid }),
          marketplaceService.getBusinesses({ isOpen: true, cityId: cid }),
          marketplaceService.getBusinesses({ cityId: cid }),
          marketplaceService.getBusinessesByType('pharmacy'),
          marketplaceService.getBusinessesByType('supermarket'),
        ]);
      })
      .then(([feat, near, rec, pharm, superm]) => {
        setFeatured(feat);
        setNearby(near);
        setRecommended(rec);
        setPharmacies(pharm);
        setSupermarkets(superm);
        setPromotions(feat.filter((b) => b.rating >= 4.5).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cityId]);

  const sections: Array<{
    key: string; title: string; businesses: MarketplaceBusiness[]; horizontal?: boolean; promo?: boolean;
  }> = [
    ...(promotions.length > 0 ? [{ key: 'promociones', title: '🎉 Promociones', businesses: promotions, promo: true }] : []),
    ...(recommended.length > 0 ? [{ key: 'mas_pedidos', title: '🔥 Más pedidos', businesses: recommended, horizontal: true }] : []),
    ...(nearby.length > 0 ? [{ key: 'cerca_ti', title: '❤️ Cerca de ti', businesses: nearby }] : []),
    ...(pharmacies.length > 0 ? [{ key: 'farmacias', title: '💊 Farmacias', businesses: pharmacies, horizontal: true }] : []),
    ...(supermarkets.length > 0 ? [{ key: 'supermercados', title: '🛒 Supermercados', businesses: supermarkets, horizontal: true }] : []),
    ...(featured.length > 0 ? [{ key: 'destacados', title: '⭐ Restaurantes destacados', businesses: featured }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PremiumHeader />
      <SearchBar />
      <PageContainer>
        {loading ? (
          <div className="space-y-8 pb-8">
            <PromoCarouselSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
          </div>
        ) : (
          <motion.div
            className="space-y-10 pb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <HeroSearch selectedCityId={cityId} onCityChange={handleCityChange} />

            <PromoCarousel />

            <section>
              <SectionHeader
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                }
                title="Categorías"
                description="Encuentra lo que se te antoje"
                viewAllHref="/cliente/categories"
              />
              <CategoryScroll categories={categories} />
            </section>

            {sections.map((section) => (
              <section key={section.key}>
                <SectionHeader
                  icon={SECTION_ICONS[section.key]}
                  title={section.title}
                  description={SECTION_DESCRIPTIONS[section.key]}
                  viewAllHref="/cliente/search"
                />
                {section.promo ? (
                  <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none">
                    {section.businesses.map((biz) => (
                      <PromoBanner key={biz.id} business={biz} />
                    ))}
                  </div>
                ) : section.horizontal ? (
                  <HorizontalBusinessScroll businesses={section.businesses} />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {section.businesses.map((biz) => (
                      <Link key={biz.id} href={`/cliente/business/${biz.slug}`}>
                        <BusinessCardPremium
                          name={biz.name}
                          image={biz.banner_url ?? biz.logo_url ?? undefined}
                          logo={biz.logo_url ?? undefined}
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

            <motion.section
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 px-6 py-10 text-center text-primary-foreground shadow-xl sm:px-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/5" />
              <Sparkles className="mx-auto mb-4 h-8 w-8 text-white/70" />
              <h3 className="mb-2 text-2xl font-bold">¿Eres un negocio?</h3>
              <p className="mb-6 text-sm text-white/70 max-w-md mx-auto">
                Únete a DomiU y llega a miles de clientes en Santa Marta. Registra tu negocio hoy.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-primary shadow-xl transition-all duration-200 hover:bg-white/90 hover:shadow-2xl active:scale-95"
              >
                Registra tu negocio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.section>
          </motion.div>
        )}
      </PageContainer>
    </div>
  );
}
