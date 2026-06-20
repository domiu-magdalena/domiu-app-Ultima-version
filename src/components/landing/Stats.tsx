'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS_DATA = [
  { value: 50, suffix: '+', label: 'Restaurantes' },
  { value: 1000, suffix: '+', label: 'Pedidos diarios' },
  { value: 48, suffix: '', label: 'Rating promedio', format: (v: number) => (v / 10).toFixed(1) },
  { value: 15, suffix: '', label: 'Minutos promedio' },
];

function AnimatedCounter({ target, suffix, label, format }: {
  target: number;
  suffix: string;
  label: string;
  format?: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = Math.max(1, Math.floor(target / 60));
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(start);
      }
    }, duration / (target / step));
    return () => clearInterval(interval);
  }, [inView, target]);

  const display = format ? format(count) : count.toLocaleString();

  return (
    <div ref={ref} className="rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm p-8 text-center transition-all hover:border-primary/10 hover:shadow-lg hover:shadow-primary/5">
      <motion.p
        className="text-4xl font-bold text-foreground sm:text-5xl"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {display}{suffix}
      </motion.p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export function Stats() {
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
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cifras</span>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">DomiU en números</h2>
          <p className="mt-2 text-sm text-muted-foreground">Crecemos contigo cada día</p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-5 sm:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          {STATS_DATA.map((s) => (
            <motion.div key={s.label} variants={item}>
              <AnimatedCounter target={s.value} suffix={s.suffix} label={s.label} format={s.format} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
