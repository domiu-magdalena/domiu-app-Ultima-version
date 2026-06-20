'use client';

import { motion } from 'framer-motion';

const TESTIMONIALS = [
  { name: 'María García', role: 'Cliente frecuente', avatar: '👩', text: 'DomiU me salva cuando no quiero cocinar. La comida llega rápida y caliente. El seguimiento en tiempo real es increíble.' },
  { name: 'Carlos Mendoza', role: 'Repartidor', avatar: '👨', text: 'Trabajar con DomiU me ha dado flexibilidad y buenos ingresos. Las propinas y bonos ayudan mucho a fin de mes.' },
  { name: 'Ana Martínez', role: 'Dueña de restaurante', avatar: '👩‍🍳', text: 'DomiU ha duplicado mis ventas. La plataforma es fácil de usar y el soporte al cliente es excelente.' },
  { name: 'Pedro López', role: 'Cliente frecuente', avatar: '👨‍🦱', text: 'La mejor app de delivery en Santa Marta. Siempre llega a tiempo y el servicio al cliente responde al instante.' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function Testimonials() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Reseñas</span>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Lo que dicen nuestros usuarios</h2>
          <p className="mt-2 text-sm text-muted-foreground">Miles de personas confían en DomiU</p>
        </motion.div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={item}
              className="group rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm p-6 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-xl">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
