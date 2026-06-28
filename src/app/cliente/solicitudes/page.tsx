'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { getMyCourierApplication, getMyBusinessApplication } from '@/app/actions/client-applications';
import { Bike, Store, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';

type ApplicationStatus = 'pendiente' | 'aprobado' | 'rechazado' | null;

function StatusBadge({ status }: { status: ApplicationStatus }) {
  if (!status) return null;
  const styles: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
    aprobado: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
    rechazado: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  };
  const icons: Record<string, React.ReactNode> = {
    pendiente: <Clock className="h-3.5 w-3.5" />,
    aprobado: <CheckCircle className="h-3.5 w-3.5" />,
    rechazado: <XCircle className="h-3.5 w-3.5" />,
  };
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {icons[status]} {labels[status]}
    </span>
  );
}

export default function SolicitudesPage() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
  const [courierStatus, setCourierStatus] = useState<ApplicationStatus>(null);
  const [businessStatus, setBusinessStatus] = useState<ApplicationStatus>(null);
  const [loadingApps, setLoadingApps] = useState(true);

  useEffect(() => {
    if (isLoading || !profile) return;
    const load = async () => {
      try {
        const [courier, business] = await Promise.all([
          getMyCourierApplication(),
          getMyBusinessApplication(),
        ]);
        if (courier) setCourierStatus(courier.status);
        if (business) setBusinessStatus(business.status);
      } catch {
        // Silently fail
      } finally {
        setLoadingApps(false);
      }
    };
    load();
  }, [profile, isLoading]);

  if (isLoading || loadingApps) {
    return (
      <div className="min-h-screen bg-background pb-16 lg:pb-0">
        <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <h1 className="text-base font-bold text-foreground">Solicitudes</h1>
          </div>
        </div>
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          {[1, 2].map(i => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Quiero ser Repartidor',
      description: 'Conviértete en repartidor DomiU y comienza a generar ingresos entregando pedidos en tu ciudad.',
      icon: Bike,
      href: '/cliente/solicitudes/repartidor',
      status: courierStatus,
      color: 'from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Quiero registrar mi Negocio',
      description: 'Registra tu negocio en DomiU y llega a más clientes con nuestro sistema de pedidos y entregas.',
      icon: Store,
      href: '/cliente/solicitudes/negocio',
      status: businessStatus,
      color: 'from-emerald-500/20 to-emerald-600/10',
      iconColor: 'text-emerald-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-base font-bold text-foreground">Solicitudes</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            onClick={() => router.push(card.href)}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color} shadow-sm transition-transform group-hover:scale-105`}>
                  <card.icon className={`h-7 w-7 ${card.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{card.title}</h2>
                    {card.status && <StatusBadge status={card.status} />}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5" />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/20 pt-4">
                <span className="inline-flex items-center rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all group-hover:bg-primary/20">
                  Solicitar
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
