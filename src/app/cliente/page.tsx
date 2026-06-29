'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { marketplaceService } from '@/services/marketplace';
import type { MarketplaceBusiness } from '@/services/marketplace';

export default function ClienteHome() {
  const [businesses, setBusinesses] = useState<MarketplaceBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceService
      .getBusinesses({})
      .then((data) => setBusinesses(data.slice(0, 12)))
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-5">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">DomiU Magdalena</p>
        <h1 className="mt-2 text-3xl font-black text-foreground">Pide fácil, rápido y seguro</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Explora negocios, productos y servicios disponibles en tu zona.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/cliente/search" className="rounded-2xl border border-border bg-background p-4 text-sm font-bold hover:bg-muted">
            Buscar productos
          </Link>
          <Link href="/cliente/pedidos" className="rounded-2xl border border-border bg-background p-4 text-sm font-bold hover:bg-muted">
            Mis pedidos
          </Link>
          <Link href="/cliente/solicitudes" className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-bold text-primary hover:bg-primary/15">
            Solicitudes
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Negocios disponibles</h2>
          <p className="text-sm text-muted-foreground">Locales activos para comprar desde DomiU.</p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center">
            <h3 className="font-bold text-foreground">No hay negocios disponibles todavía</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando los negocios sean aprobados por el administrador aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <Link
                key={business.id}
                href={'/cliente/business/' + business.slug}
                className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="h-32 bg-muted bg-cover bg-center"
                  style={{
                    backgroundImage: business.banner_url || business.logo_url ? 'url(' + (business.banner_url || business.logo_url) + ')' : undefined,
                  }}
                />
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-foreground">{business.name}</h3>
                      <p className="text-xs text-muted-foreground">{business.category_name || 'Negocio'}</p>
                    </div>
                    <span className={business.is_open ? 'rounded-full bg-green-100 px-2 py-1 text-[11px] font-bold text-green-700' : 'rounded-full bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground'}>
                      {business.is_open ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>⭐ {business.rating || 0}</span>
                    <span>{business.delivery_time || '30-45 min'}</span>
                    <span>{business.delivery_fee || '$0'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
