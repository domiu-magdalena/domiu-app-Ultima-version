'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  { q: '¿Cómo hago un pedido?', a: 'Solo tienes que registrarte, seleccionar tu restaurante favorito, elegir tus platos y confirmar el pedido. Recibirás notificaciones en tiempo real hasta que llegue a tu puerta.' },
  { q: '¿Cuánto tardan en entregar?', a: 'El tiempo promedio de entrega en Santa Marta es de 15 minutos. Puede variar según la distancia, el tráfico y el volumen de pedidos.' },
  { q: '¿Cuáles son las zonas de cobertura?', a: 'Actualmente cubrimos Santa Marta y áreas cercanas. Puedes verificar si tu dirección está en nuestra zona de cobertura desde la app.' },
  { q: '¿Cómo puedo ser repartidor?', a: 'Regístrate como repartidor en nuestra plataforma. Necesitas tener un medio de transporte, smartphone y ser mayor de edad. Revisa la sección "Trabaja con nosotros".' },
  { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos tarjetas débito/crédito, Nequi, Daviplata y efectivo. Todos los pagos están protegidos con encriptación de extremo a extremo.' },
  { q: '¿Puedo cancelar mi pedido?', a: 'Sí, puedes cancelar tu pedido siempre que el restaurante no haya comenzado a prepararlo. Desde la app puedes gestionar cancelaciones y reembolsos.' },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => setOpenIndex(openIndex === idx ? null : idx);

  return (
    <section className="bg-gradient-to-b from-primary/[0.02] via-transparent to-primary/[0.02] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ayuda</span>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Preguntas frecuentes</h2>
          <p className="mt-2 text-sm text-muted-foreground">Todo lo que necesitas saber</p>
        </motion.div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, idx) => (
            <motion.div
              key={idx}
              className="group rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden transition-all hover:border-primary/20"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <button
                onClick={() => toggle(idx)}
                className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-primary/[0.02]"
              >
                <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-5">
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
