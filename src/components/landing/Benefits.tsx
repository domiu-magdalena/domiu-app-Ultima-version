'use client';

import { motion } from 'framer-motion';
import { Zap, Shield, CreditCard, Smartphone, Heart, MapPin } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Entrega rápida', desc: 'Promedio de 15 min en Santa Marta' },
  { icon: Shield, title: 'Pago seguro', desc: 'Datos protegidos con encriptación' },
  { icon: CreditCard, title: 'Sin efectivo', desc: 'Paga con tarjeta, Nequi o Daviplata' },
  { icon: Smartphone, title: 'Fácil de usar', desc: 'App intuitiva para todos' },
  { icon: Heart, title: 'Mejores precios', desc: 'Ofertas exclusivas cada semana' },
  { icon: MapPin, title: 'Cobertura total', desc: 'Santa Marta y áreas cercanas' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function Benefits() {
  return (
    <section className="border-y border-border/10 bg-gradient-to-r from-primary/[0.02] via-transparent to-primary/[0.02]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid grid-cols-2 divide-x divide-border/10 md:grid-cols-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={item} className="flex items-center gap-3 px-4 py-5 md:py-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
