'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '@/components/ui/page-container';
import { EmptyState } from '@/components/ui/empty-state';
import { useCart } from '@/contexts/CartContext';
import { ShoppingBag, Trash2, Plus, Minus, Store, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const { items, businessId, businessName, subtotal, isEmpty, removeItem, updateQuantity, clearCart } = useCart();

  const deliveryFee = subtotal > 20 ? 0 : 2.50;
  const tax = subtotal * 0.08;
  const total = subtotal + deliveryFee + tax;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-background pb-16 lg:pb-0">
        <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-foreground">Carrito</span>
          </div>
        </div>
        <PageContainer>
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="Tu carrito está vacío"
            description="Agrega productos desde el menú de un restaurante para comenzar."
            action={
              <Link href="/cliente" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
                Ver restaurantes
              </Link>
            }
          />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-36">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-foreground">Carrito</span>
          </div>
          <button onClick={clearCart} className="flex items-center gap-1.5 rounded-2xl border border-border/50 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20">
            <Trash2 className="h-3.5 w-3.5" />
            Vaciar
          </button>
        </div>
      </div>

      <PageContainer>
        {businessId && businessName && (
          <motion.div
            className="mb-6 flex items-center gap-3 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{businessName}</p>
              <Link href={`/cliente/business/${businessId}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Agregar más productos
              </Link>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="mb-3 flex items-center gap-4 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-4 transition-all hover:border-primary/10 hover:shadow-md"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">{item.product.name}</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">${item.product.price.toFixed(2)} c/u</p>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { if (item.quantity <= 1) removeItem(item.product.id); else updateQuantity(item.product.id, item.quantity - 1); }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Minus className="h-3.5 w-3.5" />
                </motion.button>
                <motion.span
                  key={item.quantity}
                  className="w-8 text-center text-sm font-bold text-foreground"
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {item.quantity}
                </motion.span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              <div className="w-16 text-right">
                <span className="text-sm font-bold text-foreground">${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => removeItem(item.product.id)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </PageContainer>

      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border/10 bg-background/80 backdrop-blur-2xl lg:bottom-0">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Envío</span>
              <span className={deliveryFee === 0 ? 'text-success font-medium' : 'text-foreground'}>{deliveryFee === 0 ? 'Gratis' : `$${deliveryFee.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Impuestos</span>
              <span className="text-foreground">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border/30 pt-2 text-base font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">${total.toFixed(2)}</span>
            </div>
          </div>

          <Link
            href="/cliente/checkout"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary/90 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
          >
            Ir a pagar — ${total.toFixed(2)}
          </Link>
        </div>
      </div>
    </div>
  );
}
