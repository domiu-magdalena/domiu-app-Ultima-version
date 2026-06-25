'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Mic, SlidersHorizontal, Map as MapIcon, X, Star, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [listening, setListening] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') ?? '',
    minRating: searchParams.get('minRating') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    distance: searchParams.get('distance') ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/cliente/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleVoice = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Tu navegador no soporta búsqueda por voz'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event: { results: [{ transcript: string }] }) => { setQuery(event.results[0].transcript); setListening(false); };
    recognition.onerror = () => { setListening(false); toast.error('No se pudo reconocer la voz'); };
    recognition.start();
  }, []);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    router.push(`/cliente/search?${params.toString()}`);
    setShowFilters(false);
  };

  return (
    <motion.div
      className="sticky top-16 z-20 bg-background/70 backdrop-blur-2xl pb-3 pt-2 supports-[backdrop-filter]:bg-background/60"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <div className={`relative flex flex-1 items-center rounded-2xl border bg-background/80 backdrop-blur-xl transition-all ${focused ? 'border-primary/30 shadow-lg shadow-primary/5 ring-2 ring-primary/10' : 'border-border/50 shadow-sm'}`}>
          <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Buscar productos, restaurantes..."
            className="h-11 w-full bg-transparent pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button type="button" onClick={handleVoice} className={`absolute right-3 flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${listening ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
            <Mic className={`h-4 w-4 ${listening ? 'animate-pulse' : ''}`} />
          </button>
        </div>
        <button type="button" onClick={() => setShowFilters(!showFilters)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-background/80 backdrop-blur-xl transition-all hover:shadow-sm ${showFilters ? 'border-primary text-primary shadow-sm' : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary'}`}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => router.push(query.trim() ? `/cliente/search?q=${encodeURIComponent(query.trim())}&view=map` : '/cliente/search?view=map')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/80 text-muted-foreground backdrop-blur-xl transition-all hover:border-primary/30 hover:text-primary hover:shadow-sm">
          <MapIcon className="h-4 w-4" />
        </button>
      </form>

      {showFilters && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-3 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Filtros</h4>
              <button onClick={() => setShowFilters(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Categoría</label>
                <select value={filters.category} onChange={(e) => setFilters(p => ({ ...p, category: e.target.value }))} className="h-9 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground">
                  <option value="">Todas</option>
                  <option value="restaurante">Restaurante</option>
                  <option value="cafeteria">Cafetería</option>
                  <option value="fast_food">Comida rápida</option>
                  <option value="saludable">Comida saludable</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Calificación mín.</label>
                <select value={filters.minRating} onChange={(e) => setFilters(p => ({ ...p, minRating: e.target.value }))} className="h-9 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground">
                  <option value="">Cualquiera</option>
                  <option value="3">3+ estrellas</option>
                  <option value="4">4+ estrellas</option>
                  <option value="4.5">4.5+ estrellas</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Precio máx.</label>
                <select value={filters.maxPrice} onChange={(e) => setFilters(p => ({ ...p, maxPrice: e.target.value }))} className="h-9 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground">
                  <option value="">Sin límite</option>
                  <option value="10000">$10,000</option>
                  <option value="20000">$20,000</option>
                  <option value="50000">$50,000</option>
                  <option value="100000">$100,000</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Distancia</label>
                <select value={filters.distance} onChange={(e) => setFilters(p => ({ ...p, distance: e.target.value }))} className="h-9 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground">
                  <option value="">Cualquiera</option>
                  <option value="1">1 km</option>
                  <option value="3">3 km</option>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setFilters({ category: '', minRating: '', maxPrice: '', distance: '' }); setShowFilters(false); }} className="rounded-xl bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">Limpiar</button>
              <button onClick={applyFilters} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Aplicar filtros</button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
