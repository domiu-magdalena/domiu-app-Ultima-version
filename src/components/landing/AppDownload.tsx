'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Smartphone, Apple, Globe } from 'lucide-react';

export function AppDownload() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/[0.03] to-background border border-primary/10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary)_0%,_transparent_60%)] opacity-[0.04]" />
          <div className="absolute top-10 right-10 h-40 w-40 rounded-full bg-primary/5 blur-[80px]" />

          <div className="relative flex flex-col items-center gap-8 p-10 sm:p-14 lg:flex-row lg:justify-between">
            <div className="max-w-lg text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Descarga</span>
                <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
                  Lleva DomiU en tu bolsillo
                </h2>
                <p className="mb-8 text-base text-muted-foreground">
                  Descarga la app y pide desde cualquier lugar. Disponible en iOS, Android y Web.
                </p>
              </motion.div>

              <motion.div
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link
                  href="#"
                  className="inline-flex h-12 items-center gap-3 rounded-2xl bg-foreground px-6 text-sm font-semibold text-background transition-all hover:bg-foreground/90 hover:-translate-y-0.5 shadow-lg"
                >
                  <Apple className="h-5 w-5" />
                  App Store
                </Link>
                <Link
                  href="#"
                  className="inline-flex h-12 items-center gap-3 rounded-2xl bg-foreground px-6 text-sm font-semibold text-background transition-all hover:bg-foreground/90 hover:-translate-y-0.5 shadow-lg"
                >
                  <Smartphone className="h-5 w-5" />
                  Google Play
                </Link>
                <Link
                  href="#"
                  className="inline-flex h-12 items-center gap-3 rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm px-6 text-sm font-semibold text-foreground transition-all hover:bg-background/80 hover:-translate-y-0.5"
                >
                  <Globe className="h-5 w-5" />
                  Web App
                </Link>
              </motion.div>
            </div>

            <motion.div
              className="shrink-0"
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              whileInView={{ opacity: 1, scale: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="flex h-56 w-40 items-center justify-center rounded-[2rem] border-4 border-foreground/10 bg-gradient-to-b from-primary/20 to-primary/5 shadow-2xl">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                    D
                  </div>
                  <span className="text-xs font-semibold text-foreground">DomiU</span>
                  <span className="text-[10px] text-muted-foreground">Delivery</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
