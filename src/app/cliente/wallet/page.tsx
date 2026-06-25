'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clientService, WalletInfo, WalletTransaction } from '@/services/client';
import { getBrowserClient } from '@/lib/db/supabase';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletPage() {
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState('nequi');
  const [topUpSaving, setTopUpSaving] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    clientService.getWallet(profile.id).then(w => {
      setWallet(w);
      if (w) {
        clientService.getWalletTransactions(w.id).then(t => {
          setTransactions(t);
        });
      }
      setLoading(false);
    });
  }, [profile?.id]);

  if (loading) return <div className="min-h-screen bg-background pb-16 lg:pb-0"><SkeletonCard /></div>;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-base font-bold text-foreground">Mi Wallet</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {wallet ? (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70 p-6 text-white"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Saldo disponible</p>
                  <Wallet className="h-5 w-5 text-white/70" />
                </div>
                <p className="mt-2 text-4xl font-black tracking-tight">
                  ${wallet.balance.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {wallet.currency}
                </p>
                <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-white/80">
                    <ArrowUpRight className="h-3 w-3 text-emerald-300" />
                    <span>Total: ${wallet.total_credited.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/80">
                    <ArrowDownLeft className="h-3 w-3 text-rose-300" />
                    <span>Total: ${wallet.total_debited.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Movimientos</h2>
              <button onClick={() => setShowTopUp(true)} className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Plus className="h-3.5 w-3.5" /> Recargar
              </button>
            </div>

            {showTopUp && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowTopUp(false)}>
                <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-foreground">Solicitar recarga</h3>
                    <button onClick={() => setShowTopUp(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Saldo disponible: <span className="font-bold text-foreground">${wallet?.balance.toFixed(2) ?? '0.00'}</span></p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Monto a recargar</label>
                      <input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} min={1000} step={1000} placeholder="Ej: 50000" className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Método de pago</label>
                      <select value={topUpMethod} onChange={e => setTopUpMethod(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground">
                        <option value="nequi">Nequi</option>
                        <option value="daviplata">Daviplata</option>
                        <option value="transferencia">Transferencia bancaria</option>
                      </select>
                    </div>
                    <button
                      onClick={async () => {
                        const amount = parseInt(topUpAmount);
                        if (!amount || amount < 1000) { toast.error('Monto mínimo: $1,000'); return; }
                        if (!wallet) { toast.error('Wallet no disponible'); return; }
                        setTopUpSaving(true);
                        try {
                          const supabase = await getBrowserClient();
                          const methodMap: Record<string, string> = { nequi: 'transfer', daviplata: 'transfer', transferencia: 'transfer' };
                          const { error } = await supabase.from('wallet_topups').insert({
                            wallet_id: wallet.id,
                            amount,
                            payment_method: methodMap[topUpMethod] ?? 'transfer',
                            status: 'pending',
                          });
                          if (error) throw error;
                          toast.success(`Solicitud de recarga por $${amount.toLocaleString('es-CO')} creada. Te contactaremos para confirmar el pago.`);
                          setShowTopUp(false);
                          setTopUpAmount('');
                        } catch { toast.error('Error al crear solicitud'); }
                        setTopUpSaving(false);
                      }}
                      disabled={topUpSaving}
                      className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {topUpSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : 'Solicitar recarga'}
                    </button>
                    <p className="text-[10px] text-muted-foreground text-center">La recarga será revisada por nuestro equipo antes de acreditarse.</p>
                  </div>
                </div>
              </div>
            )}

            {transactions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No hay movimientos aún.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 rounded-xl border border-border/20 bg-card/30 p-4"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      t.transaction_type === 'credit' || t.transaction_type === 'bonus'
                        ? 'bg-emerald-50 text-emerald-500'
                        : 'bg-rose-50 text-rose-500'
                    }`}>
                      {t.transaction_type === 'credit' || t.transaction_type === 'bonus'
                        ? <TrendingUp className="h-4 w-4" />
                        : <TrendingDown className="h-4 w-4" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {t.transaction_type === 'credit' ? 'Depósito' : t.transaction_type === 'debit' ? 'Retiro' : t.transaction_type === 'refund' ? 'Reembolso' : t.transaction_type === 'bonus' ? 'Bono' : 'Ajuste'}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      {t.reference_type && <span className="text-[10px] text-muted-foreground">{t.reference_type}</span>}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        t.transaction_type === 'credit' || t.transaction_type === 'bonus'
                          ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {t.transaction_type === 'credit' || t.transaction_type === 'bonus' ? '+' : '-'}${t.amount.toFixed(2)}
                      </p>
                      <span className={`text-[10px] font-medium ${
                        t.status === 'completed' ? 'text-emerald-500' : t.status === 'failed' ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        {t.status === 'completed' ? 'Completado' : t.status === 'failed' ? 'Fallido' : 'Pendiente'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="Sin wallet"
            description="Tu billetera digital estará disponible después de tu primer pedido."
          />
        )}
      </div>
    </div>
  );
}
