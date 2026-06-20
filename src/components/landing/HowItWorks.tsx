'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const STEPS = [
  { step: '1', title: 'Elige tu comida', desc: 'Explora restaurantes y platos cerca de ti', icon: '📱' },
  { step: '2', title: 'Haz tu pedido', desc: 'Personaliza y paga seguro desde la app', icon: '🛒' },
  { step: '3', title: 'Recibe en casa', desc: 'Seguimiento en tiempo real hasta tu puerta', icon: '🚀' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Simple y rápido</span>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">¿Cómo funciona?</h2>
          <p className="mt-3 text-base text-muted-foreground">Tres pasos para disfrutar tu comida favorita</p>
        </motion.div>

        <motion.div
          className="grid gap-8 sm:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          {STEPS.map((s, idx) => (
            <motion.div
              key={s.title}
              variants={item}
              className="group relative rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-8 text-center transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20">
                {s.step}
              </div>
              <div className="mt-4 mb-5 text-4xl transition-transform group-hover:scale-110">{s.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
              {idx < STEPS.length - 1 && (
                <div className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 text-muted-foreground/20">
                  <ChevronRight className="h-6 w-6" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
