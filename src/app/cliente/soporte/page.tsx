'use client';

import React, { useState, useMemo } from 'react';
import { clientService } from '@/services/client';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, Search, MessageCircle, Mail, Phone, ExternalLink } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  pedidos: 'Pedidos',
  pagos: 'Pagos',
  entregas: 'Entregas',
  cuenta: 'Cuenta',
  fidelidad: 'Fidelización',
  repartidor: 'Repartidor',
};

const CATEGORY_COLORS: Record<string, string> = {
  pedidos: 'text-blue-500 bg-blue-50',
  pagos: 'text-emerald-500 bg-emerald-50',
  entregas: 'text-purple-500 bg-purple-50',
  cuenta: 'text-amber-500 bg-amber-50',
  fidelidad: 'text-rose-500 bg-rose-50',
  repartidor: 'text-cyan-500 bg-cyan-50',
};

export default function SoportePage() {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const faq = useMemo(() => clientService.getFAQ(), []);
  const categories = useMemo(() => clientService.getFAQCategories(), []);

  const filtered = faq.filter(f => {
    if (category && f.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-base font-bold text-foreground">Ayuda y Soporte</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ayuda..."
            className="w-full rounded-2xl border border-border/30 bg-card/50 py-3 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary/50 transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              !category ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Todas
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? null : c)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                category === c ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No encontramos resultados para tu búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="overflow-hidden rounded-2xl border border-border/20 bg-card/30 transition-all hover:border-border/40"
              >
                <button
                  onClick={() => setOpenId(openId === i ? null : i)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase ${CATEGORY_COLORS[item.category] ?? 'bg-muted text-muted-foreground'}`}>
                      {CATEGORY_LABELS[item.category]?.charAt(0) ?? '?'}
                    </span>
                    <span className="text-sm font-medium text-foreground">{item.question}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openId === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openId === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/20 pt-3">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card/90 to-card/60 p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Contacto Directo</h2>
          <div className="space-y-3">
            {[
              { icon: MessageCircle, label: 'Chat en vivo', desc: 'Disponible 8:00 - 22:00', color: 'text-blue-500 bg-blue-50' },
              { icon: Mail, label: 'Email', desc: 'soporte@domiu.app', color: 'text-purple-500 bg-purple-50' },
              { icon: Phone, label: 'Teléfono', desc: '+57 300 123 4567', color: 'text-emerald-500 bg-emerald-50' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
