'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { MarketplaceCategory } from '@/services/marketplace';

const CATEGORIES_HARDCODED: { name: string; icon: string; slug: string }[] = [
  { name: 'Comida Rápida', icon: '🍔', slug: 'comida-rapida' },
  { name: 'Pizza', icon: '🍕', slug: 'pizza' },
  { name: 'Sushi', icon: '🍣', slug: 'sushi' },
  { name: 'Café', icon: '☕', slug: 'cafe' },
  { name: 'Saludable', icon: '🥗', slug: 'saludable' },
  { name: 'Mexicana', icon: '🌮', slug: 'mexicana' },
  { name: 'Helados', icon: '🍦', slug: 'helados' },
  { name: 'Mariscos', icon: '🦐', slug: 'mariscos' },
  { name: 'Italiana', icon: '🍝', slug: 'italiana' },
  { name: 'Asiática', icon: '🥟', slug: 'asiatica' },
  { name: 'Postres', icon: '🧁', slug: 'postres' },
  { name: 'Bebidas', icon: '🧋', slug: 'bebidas' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

interface Props {
  categories: MarketplaceCategory[];
}

export function CategoriesSection({ categories }: Props) {
  const display = categories.length > 0
    ? categories as (MarketplaceCategory & { icon: string })[]
    : CATEGORIES_HARDCODED as unknown as (MarketplaceCategory & { icon: string })[];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-10 flex items-end justify-between"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Variedad</span>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Categorías</h2>
            <p className="mt-1 text-sm text-muted-foreground">Encuentra lo que se te antoje</p>
          </div>
          {categories.length > 0 && (
            <Link
              href="/cliente"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver todo <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </motion.div>

        <motion.div
          className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-30px' }}
        >
          {display.slice(0, 12).map((cat) => {
            const catSlug = 'slug' in cat ? (cat as { slug: string }).slug : cat.id;
            return (
            <motion.div key={cat.id || cat.name} variants={item}>
              <Link
                href={`/cliente?category=${cat.id || catSlug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-5 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-2xl transition-all group-hover:scale-110 group-hover:from-primary/20 group-hover:to-primary/10">
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-foreground text-center leading-tight">{cat.name}</span>
                {cat.business_count !== undefined && (
                  <span className="text-[11px] text-muted-foreground -mt-1">{cat.business_count} negocios</span>
                )}
              </Link>
            </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
