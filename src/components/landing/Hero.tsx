'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, MapPin, Sparkles, Bike, Store, Clock3 } from 'lucide-react';
import { DomiULogo } from '@/components/brand/DomiULogo';

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

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cliente?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative flex min-h-[94vh] items-center overflow-hidden pt-20">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#101216_0%,#181B21_46%,#111317_100%)]" />
      <div className="absolute -left-28 top-24 h-[28rem] w-[28rem] rounded-full bg-[#FFE600]/20 blur-[120px]" />
      <div className="absolute -right-28 top-8 h-[30rem] w-[30rem] rounded-full bg-[#FF9D00]/15 blur-[130px]" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-[140px]" />
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(255,230,0,.22)_0,transparent_1px)] [background-size:26px_26px]" />

      <motion.div
        className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.12fr_.88fr] lg:px-8"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        <div className="text-center lg:text-left">
          <motion.div variants={fadeIn} className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#FFE600]/35 bg-[#FFE600]/10 px-4 py-2 shadow-[0_0_26px_rgba(255,222,0,.16)] backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFE600] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FFE600]" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#FFF4A5]">Activos en Santa Marta</span>
          </motion.div>

          <motion.h1 variants={fadeIn} className="font-heading text-5xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            Pide lo que quieres.
            <span className="mt-2 block bg-gradient-to-r from-[#FFF000] via-[#FFD400] to-[#FF9D00] bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(255,218,0,.22)]">
              Recíbelo con vida.
            </span>
          </motion.h1>

          <motion.p variants={fadeIn} className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-[#C9CED6] lg:mx-0">
            Restaurantes, farmacias, supermercados y comercios locales conectados con repartidores y seguimiento en tiempo real.
          </motion.p>

          <motion.div variants={fadeIn} className="mt-9 max-w-2xl">
            <form onSubmit={handleSearch} className="group flex flex-col gap-2 rounded-2xl border border-[#FFE600]/25 bg-[#20242B]/90 p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,.95),0_0_34px_rgba(255,218,0,.08)] backdrop-blur-xl sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-xl bg-[#15181D] px-4 py-3 sm:border-r sm:border-border sm:bg-transparent sm:py-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#FFE000]" />
                <span className="whitespace-nowrap text-sm font-bold text-white">Santa Marta</span>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#15181D] px-3 py-3 sm:bg-transparent sm:py-2">
                <Search className="h-4 w-4 shrink-0 text-[#AAB0BA]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Busca un restaurante o producto..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-[#8F96A1] focus:outline-none"
                />
              </div>
              <button type="submit" className="domiu-brand-glow flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-black text-primary-foreground sm:h-11">
                <Search className="h-4 w-4" /> Buscar
              </button>
            </form>

            <motion.div variants={fadeIn} className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm lg:justify-start">
              <span className="text-xs font-semibold text-[#8F96A1]">Populares:</span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => router.push(`/cliente?search=${encodeURIComponent(tag)}`)}
                  className="rounded-full border border-[#FFE600]/15 bg-[#20242B]/80 px-3.5 py-1.5 text-xs font-bold text-[#DDE1E7] transition-all hover:-translate-y-0.5 hover:border-[#FFE600]/50 hover:bg-[#FFE600]/10 hover:text-[#FFF5AD]"
                >
                  {tag}
                </button>
              ))}
            </motion.div>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/register" className="domiu-brand-glow inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-black text-primary-foreground">
              Crear cuenta gratis
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.055] px-8 text-sm font-bold text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#FFE600]/40 hover:bg-[#FFE600]/10 hover:text-[#FFF4A5]">
              Iniciar sesión
            </Link>
          </motion.div>
        </div>

        <motion.div variants={fadeIn} className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-[#FFE600]/25 via-[#FFB000]/12 to-transparent blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.2rem] border border-[#FFE600]/30 bg-gradient-to-br from-[#2B3038] via-[#1C2026] to-[#15181D] p-5 shadow-[0_35px_80px_-30px_rgba(0,0,0,.95),0_0_55px_rgba(255,218,0,.16)]">
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-[#FFE600]/25 bg-[#FFE600]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#FFF3A0]">
              <Sparkles className="h-3 w-3" /> DomiU en vivo
            </div>
            <div className="domiu-float mx-auto mt-7 flex justify-center">
              <DomiULogo showTagline className="scale-110 sm:scale-125" />
            </div>

            <div className="mt-10 grid grid-cols-3 gap-2.5">
              {[
                { icon: Store, label: 'Negocios', value: 'Locales' },
                { icon: Bike, label: 'Reparto', value: 'En vivo' },
                { icon: Clock3, label: 'Entrega', value: 'Rápida' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.045] p-3 text-center backdrop-blur-sm">
                  <Icon className="mx-auto h-5 w-5 text-[#FFE000]" />
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8F96A1]">{label}</p>
                  <p className="mt-0.5 text-xs font-black text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#FFE600]/18 bg-gradient-to-r from-[#FFE600]/12 to-[#FF9D00]/8 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#FFF2A0]">Seguimiento visible</p>
                  <p className="mt-1 text-[11px] text-[#B8BEC8]">Pedido, ruta, repartidor y tiempo estimado.</p>
                </div>
                <div className="domiu-pulse-glow flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Bike className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
