'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '@/components/ui/page-container';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrderContext';
import { couponService } from '@/services/coupons';
import { ShoppingBag, CheckCircle, MapPin, ClipboardList, ArrowLeft, Loader2, Tag, X, CreditCard, Store } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { items, businessId, businessName, subtotal, isEmpty, clearCart } = useCart();
  const { createOrder } = useOrders();
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [form, setForm] = useState({ address: '', city: '', instructions: '' });

  const deliveryFee = subtotal > 20 ? 0 : 2.50;
  const tax = subtotal * 0.08;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee + tax - discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !businessId || !businessName) return;
    setPlacing(true);
    try {
      const order = await createOrder({
        customerId: profile.id,
        customerName: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Cliente',
        businessId,
        businessName,
        items: items.map((i) => ({ productId: i.product.id, productName: i.product.name, quantity: i.quantity, unitPrice: i.product.price })),
        subtotal,
        deliveryFee,
        taxAmount: tax,
        totalAmount: total,
        deliveryAddress: `${form.address}, ${form.city}`,
        instructions: form.instructions,
      });
      if (appliedCoupon) {
        await couponService.apply(appliedCoupon.id, profile.id, order.id, appliedCoupon.discount);
      }
      setPlaced(true);
      clearCart();
      setTimeout(() => router.push('/cliente/pedidos'), 2000);
    } catch {
      setPlacing(false);
    }
  };

  if (isEmpty && !placed) {
    return (
      <div className="min-h-screen bg-background pb-16 lg:pb-0">
        <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-foreground">Checkout</span>
          </div>
        </div>
        <PageContainer>
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="Carrito vacío"
            description="Agrega productos antes de continuar con el pago."
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

  if (placed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center justify-center px-4 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <motion.div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          >
            <CheckCircle className="h-10 w-10 text-success" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground">¡Pedido confirmado!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu pedido en <strong>{businessName}</strong> ha sido recibido.
          </p>
          <motion.div
            className="mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </motion.div>
          <p className="mt-3 text-xs text-muted-foreground">Redirigiendo a mis pedidos...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">Checkout</span>
        </div>
      </div>

      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div
                className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Dirección de entrega</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Dirección</label>
                    <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle y número" className="rounded-xl" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Ciudad</label>
                    <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ciudad" className="rounded-xl" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Instrucciones</h2>
                </div>
                <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Ej: Dejar el pedido en la puerta, tocar el timbre..." rows={3} className="rounded-xl" />
              </motion.div>

              <motion.div
                className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Método de pago</h2>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-card p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-lg">💳</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Pago contra entrega</p>
                    <p className="text-xs text-muted-foreground">Efectivo, Nequi o Daviplata</p>
                  </div>
                </div>
              </motion.div>

              <motion.button
                type="submit"
                disabled={placing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary/90 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {placing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `Confirmar pedido — $${total.toFixed(2)}`
                )}
              </motion.button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <motion.div
              className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-6 sticky top-24"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h2 className="mb-4 text-base font-bold text-foreground">Resumen del pedido</h2>
              <p className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
                <Store className="h-4 w-4" />
                {businessName}
              </p>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{item.quantity}x</span> {item.product.name}
                    </span>
                    <span className="text-foreground font-medium">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4 rounded-xl border border-border/30 p-3">
                <AnimatePresence mode="wait">
                  {appliedCoupon ? (
                    <motion.div
                      key="applied"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-success" />
                        <code className="text-sm font-semibold text-success">{appliedCoupon.code}</code>
                        <Badge variant="success" className="rounded-xl">-${appliedCoupon.discount.toFixed(2)}</Badge>
                      </div>
                      <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponError(''); }} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2"
                    >
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="¿Tienes un cupón?"
                        className="flex-1 text-sm rounded-xl"
                      />
                      <button
                        onClick={async () => {
                          if (!profile) return;
                          setApplyingCoupon(true); setCouponError('');
                          const result = await couponService.validate(couponCode, profile.id, subtotal + deliveryFee);
                          if (result.valid && result.coupon && result.discount !== undefined) {
                            setAppliedCoupon({ id: result.coupon.id, code: result.coupon.code, discount: result.coupon.type === 'free_shipping' ? deliveryFee : result.discount });
                          } else {
                            setCouponError(result.error || 'Cupón inválido');
                          }
                          setApplyingCoupon(false);
                        }}
                        disabled={!couponCode || applyingCoupon}
                        className="shrink-0 rounded-xl bg-primary/10 px-4 text-xs font-semibold text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
                      >
                        {applyingCoupon ? '...' : 'Aplicar'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {couponError && <p className="mt-1.5 text-xs text-destructive">{couponError}</p>}
              </div>

              <div className="space-y-2 border-t border-border/30 pt-4 text-sm">
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
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Descuento</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/30 pt-3 text-base font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">${total.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}


