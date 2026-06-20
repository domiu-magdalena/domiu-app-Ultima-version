'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, MapPin } from 'lucide-react';

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const POPULAR_TAGS = ['Pizza', 'Sushi', 'Hamburguesas', 'Café'];

export function Hero() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cliente?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-[0.06]" />
      <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 h-80 w-80 rounded-full bg-primary/5 blur-[100px]" />

      <motion.div
        className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        <div className="mx-auto max-w-4xl text-center">
          <motion.div variants={fadeIn} className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Santa Marta, Magdalena</span>
          </motion.div>

          <motion.h1
            variants={fadeIn}
            className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.1]"
          >
            La comida que amas,{' '}
            <span className="bg-gradient-to-r from-primary via-primary/70 to-primary/40 bg-clip-text text-transparent">
              en tu puerta
            </span>
          </motion.h1>

          <motion.p
            variants={fadeIn}
            className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground"
          >
            Descubre los mejores restaurantes de Santa Marta. Pide online y recibe en minutos.
          </motion.p>

          <motion.div variants={fadeIn} className="mx-auto max-w-2xl">
            <form onSubmit={handleSearch} className="group flex items-center gap-2 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl p-1.5 shadow-2xl shadow-primary/5 transition-all focus-within:border-primary/30 focus-within:shadow-primary/10">
              <div className="flex items-center gap-2 border-r border-border/50 px-4 py-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Santa Marta</span>
              </div>
              <div className="flex flex-1 items-center gap-2 px-2">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca un restaurante o plato..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
              >
                <Search className="h-4 w-4" />
                <span>Buscar</span>
              </button>
            </form>

            <motion.div variants={fadeIn} className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs font-medium">Populares:</span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => router.push(`/cliente?search=${encodeURIComponent(tag)}`)}
                  className="rounded-full border border-border/40 bg-background/60 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5 transition-all"
                >
                  {tag}
                </button>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeIn}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/register"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm px-8 text-sm font-semibold text-foreground transition-all hover:bg-background/80 hover:-translate-y-0.5"
            >
              Iniciar sesión
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
