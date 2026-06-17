'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown, Navigation } from 'lucide-react';

interface HeroSearchProps {
  onSearchFocus?: () => void;
}

export function HeroSearch({ onSearchFocus }: HeroSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if ('geolocation' in navigator) {
      setGeoLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=es`,
              { headers: { 'User-Agent': 'DomiU/1.0' } }
            );
            const data = await res.json();
            const parts = data.display_name?.split(',') ?? [];
            setAddress(parts.slice(0, 3).join(','));
          } catch {
            setAddress(null);
          }
          setGeoLoading(false);
        },
        () => { setGeoLoading(false); setAddress(null); },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/cliente/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-6 py-8 text-primary-foreground shadow-xl shadow-primary/20 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/[0.06]" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/[0.04]" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-20 w-20 rounded-full bg-white/[0.03]" />

      <div className="relative z-10">
        <button className="mb-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20">
          {geoLoading ? (
            <Navigation className="h-4 w-4 shrink-0 animate-pulse" />
          ) : (
            <MapPin className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate max-w-[200px]">
            {address || 'Selecciona tu dirección'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>

        <h2 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">
          ¿Qué se te antoja hoy?
        </h2>
        <p className="mb-6 text-sm text-primary-foreground/70">
          Comida, farmacia, supermercado y más — todo en un solo lugar
        </p>

        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={onSearchFocus}
            placeholder="Buscar productos, restaurantes, farmacias..."
            className="h-13 w-full rounded-2xl border-0 bg-white pl-12 pr-4 text-sm text-foreground shadow-xl shadow-black/5 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/40"
            style={{ height: '52px' }}
          />
        </form>
      </div>
    </div>
  );
}
