'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, Clock, ChevronRight } from 'lucide-react';
import type { MarketplaceBusiness } from '@/services/marketplace';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

interface Props {
  featured: MarketplaceBusiness[];
  recommended: MarketplaceBusiness[];
}

function BusinessCard({ biz }: { biz: MarketplaceBusiness }) {
  return (
    <Link
      href={`/cliente/negocio/${biz.slug}`}
      className="group block rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-5 transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-xl font-bold text-primary transition-all group-hover:scale-105 group-hover:from-primary/20 group-hover:to-primary/10">
          {biz.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{biz.name}</p>
          <p className="text-sm text-muted-foreground">{biz.category_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Star className="h-4 w-4 text-warning" fill="currentColor" />
          <span className="font-medium text-foreground">{biz.rating.toFixed(1)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {biz.delivery_time}
        </span>
        <span className="ml-auto font-semibold text-primary">
          ${parseFloat(biz.delivery_fee.replace('$', '')).toFixed(1)}
        </span>
      </div>
    </Link>
  );
}

export function FeaturedRestaurants({ featured, recommended }: Props) {
  if (featured.length === 0 && recommended.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-primary/[0.02] via-transparent to-primary/[0.02] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {featured.length > 0 && (
          <>
            <motion.div
              className="mb-8 flex items-end justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Populares</span>
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Destacados</h2>
                <p className="mt-1 text-sm text-muted-foreground">Los mejores calificados de Santa Marta</p>
              </div>
              <Link
                href="/cliente"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Ver todo <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-30px' }}
            >
              {featured.map((biz) => (
                <motion.div key={biz.id} variants={item}>
                  <BusinessCard biz={biz} />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {recommended.length > 0 && (
          <>
            <motion.div
              className="mb-8 mt-12 flex items-end justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Para ti</span>
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Recomendados</h2>
                <p className="mt-1 text-sm text-muted-foreground">Basado en tu ubicación</p>
              </div>
            </motion.div>

            <motion.div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-30px' }}
            >
              {recommended.map((biz) => (
                <motion.div key={biz.id} variants={item}>
                  <BusinessCard biz={biz} />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}
