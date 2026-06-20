'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export function PremiumHeader() {
  const { profile } = useAuth();
  const { itemCount } = useCart();
  const name = profile?.first_name ?? 'Usuario';
  const initials = `${profile?.first_name?.charAt(0) ?? 'U'}${profile?.last_name?.charAt(0) ?? ''}`;

  return (
    <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/cliente" className="flex items-center gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {initials || 'D'}
          </motion.div>
          <div>
            <p className="text-xs text-muted-foreground leading-tight">Hola,</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{name} 👋</p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/notificaciones"
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:bg-primary/5 hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            href="/cliente/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:bg-primary/5 hover:text-foreground"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <motion.span
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {itemCount > 9 ? '9+' : itemCount}
              </motion.span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
