'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ASSETS } from '@/lib/assets';

const PROMO_SLIDES = [
  { id: 1, title: 'Primer pedido sin costo de envío', code: 'DOMIU15', bg: ASSETS.promotions.primera_compra, color: 'from-rose-500 to-pink-600' },
  { id: 2, title: '50% OFF en tu segunda compra', code: 'DOMIU50', bg: ASSETS.promotions['50-off'], color: 'from-violet-500 to-purple-600' },
  { id: 3, title: 'Envío gratis en pedidos +$20', code: 'FREE20', bg: ASSETS.promotions.envio_gratis, color: 'from-emerald-500 to-teal-600' },
  { id: 4, title: 'Combos exclusivos por tiempo limitado', code: 'COMBO30', bg: ASSETS.promotions.combos, color: 'from-amber-500 to-orange-600' },
];

export function PromoCarousel() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((p) => (p + 1) % PROMO_SLIDES.length), []);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="relative h-48 sm:h-56"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${PROMO_SLIDES[current].bg})` }}
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${PROMO_SLIDES[current].color} opacity-90`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-8">
            <h3 className="mb-1 text-xl font-bold text-white sm:text-2xl">{PROMO_SLIDES[current].title}</h3>
            <p className="mb-3 text-sm text-white/80">
              Usa el código <span className="font-bold text-white">{PROMO_SLIDES[current].code}</span>
            </p>
            <Link
              href="/cliente/search"
              className="inline-flex h-9 w-fit items-center gap-1.5 rounded-2xl bg-white/20 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
            >
              Ordenar ahora
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>

      <button onClick={prev} className="absolute left-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30">
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
        {PROMO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
