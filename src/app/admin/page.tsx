'use client';

import React from 'react';
import Link from 'next/link';
import { AdminLiveDashboard } from '@/components/admin/live-dashboard/AdminLiveDashboard';

const shortcuts = [
  { title: 'Solicitudes pendientes', description: 'Aprobar o rechazar repartidores y negocios.', href: '/admin/solicitudes' },
  { title: 'Soporte y reportes', description: 'Ver mensajes y problemas reportados.', href: '/admin/soporte' },
  { title: 'Pedidos y domicilios', description: 'Gestionar pedidos y domicilios manuales.', href: '/admin/pedidos' },
  { title: 'Repartidores', description: 'Revisar domiciliarios registrados.', href: '/admin/repartidores' },
  { title: 'Negocios', description: 'Administrar tiendas, productos y locales.', href: '/admin/negocios' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/60 p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Panel Admin DomiU</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accesos principales para operar la plataforma.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/40 hover:shadow-md"
            >
              <h2 className="text-sm font-bold text-foreground">{item.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              <p className="mt-4 text-xs font-semibold text-primary">Abrir</p>
            </Link>
          ))}
        </div>
      </section>

      <AdminLiveDashboard />
    </div>
  );
}
