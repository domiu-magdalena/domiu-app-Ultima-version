"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Star, Clock, Bike, ChevronRight, SlidersHorizontal } from "lucide-react";
import { fetchData } from "@/lib/client-data";

type Negocio = {
  id: string; nombre: string; categoria: string; descripcion: string;
  logo: string; rating: number; calificacion: number; tiempo_estimado: string;
  domicilio_cost: number; abierto: boolean;
};

const categoryEmojis: Record<string, string> = {
  "": "🔥",
  "Restaurantes": "🍽️",
  "Tiendas": "🛒",
  "Licoreras": "🍺",
  "Droguerias": "💊",
  "Promociones": "🏷️",
};

function NegociosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoria = searchParams.get("categoria") || "";
  const busqueda = searchParams.get("busqueda") || "";
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [filter, setFilter] = useState(categoria);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchData("negocios", {
      filters: [{ method: "eq", column: "activo", value: true }],
      order: [{ column: "destacado", ascending: false }],
    }).then((data: any) => {
      if (!data) return;
      let f = data;
      if (categoria) f = f.filter((n: any) => n.categoria === categoria);
      if (busqueda) { const q = busqueda.toLowerCase(); f = f.filter((n: any) => n.nombre.toLowerCase().includes(q) || n.descripcion.toLowerCase().includes(q)); }
      setNegocios(f);
      setFilter(categoria);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [categoria, busqueda]);

  const categories = ["", "Restaurantes", "Tiendas", "Licoreras", "Droguerias", "Promociones"];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-6 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/[0.06] px-4 py-3 bg-[#0F172A]/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center active:scale-90 transition-all duration-200 border border-white/[0.06]">
            <ArrowLeft size={18} className="text-[var(--text-primary)]" />
          </button>
          <div className="flex-1">
            <h1 className="font-extrabold text-xl tracking-tight text-white">Negocios</h1>
            {negocios.length > 0 && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                <span className="text-emerald-400 font-semibold">{negocios.length}</span> resultados
              </p>
            )}
          </div>
          <button className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center active:scale-90 transition-all duration-200 border border-white/[0.06]">
            <SlidersHorizontal size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Search query banner */}
      {busqueda && (
        <div className="mx-4 mt-4 p-4 rounded-2xl animate-fade-up relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(30,41,59,0.9) 100%)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5" />
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Search size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Resultados para</p>
              <p className="font-bold text-base text-emerald-400 mt-0.5">&quot;{busqueda}&quot;</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="h-scroll px-4 mt-4">
        {categories.map((cat) => (
          <button key={cat || "todas"} onClick={() => { setFilter(cat); router.push(cat ? `/cliente/negocios?categoria=${cat}` : "/cliente/negocios"); }}
            className={`shrink-0 transition-all duration-200 active:scale-95 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border ${
              filter === cat
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                : "bg-white/[0.04] border-white/[0.08] text-[var(--text-secondary)] hover:bg-white/[0.08] hover:border-white/[0.12]"
            }`}>
            <span className="text-base leading-none">{categoryEmojis[cat] || "📦"}</span>
            {cat || "Todas"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid gap-3 px-4 mt-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-2xl p-4 animate-fade-up bg-[var(--bg-card)] backdrop-blur-xl border border-white/[0.06]" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex gap-4">
                <div className="skeleton w-20 h-20 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="skeleton h-5 w-3/4 rounded-lg" />
                  <div className="skeleton h-3 w-1/2 rounded-lg" />
                  <div className="flex gap-3 mt-1">
                    <div className="skeleton h-3 w-16 rounded-lg" />
                    <div className="skeleton h-3 w-16 rounded-lg" />
                    <div className="skeleton h-3 w-14 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && negocios.length === 0 ? (
        <div className="text-center py-24 px-4 animate-fade-up">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center mx-auto mb-5 border border-white/[0.06]">
            <Search size={32} className="text-[var(--text-muted)]/40" />
          </div>
          <p className="text-[var(--text-primary)] font-bold text-lg">No hay negocios</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-[240px] mx-auto">No encontramos negocios en esta categoría. Prueba con otra.</p>
        </div>
      ) : !loading && (
        <div className="grid gap-3 px-4 mt-4">
          {negocios.map((n, idx) => (
            <button key={n.id} onClick={() => router.push(`/cliente/negocio/${n.id}`)}
              className="group relative rounded-2xl p-4 text-left w-full animate-fade-up flex items-start gap-4 transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_8px_32px_rgba(16,185,129,0.1)] active:scale-[0.98] bg-[var(--bg-card)] backdrop-blur-xl border border-white/[0.06] hover:border-emerald-500/20"
              style={{ animationDelay: `${idx * 60}ms` }}>
              {(n as any).destacado && (
                <div className="absolute -top-2 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)] z-10">
                  Destacado
                </div>
              )}
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden relative ring-1 ring-white/[0.08]" style={{ background: "rgba(16,185,129,0.08)" }}>
                {n.logo ? (
                  <img src={n.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: "var(--primary)" }}>{n.nombre[0]}</span>
                )}
                <div className={`absolute inset-0 rounded-2xl flex items-end justify-center pb-1.5 ${n.abierto ? "bg-gradient-to-t from-emerald-600/60 to-transparent" : "bg-gradient-to-t from-red-600/50 to-transparent"}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${n.abierto ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"}`}>
                    {n.abierto ? "Abierto" : "Cerrado"}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-[15px] truncate text-white group-hover:text-emerald-400 transition-colors duration-200">{n.nombre}</h4>
                </div>
                <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.06] text-[var(--text-secondary)] border border-white/[0.06]">
                  {n.categoria}
                </span>
                <div className="flex items-center gap-3 mt-2.5">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Star size={12} className="fill-amber-400" /> {n.rating || n.calificacion || "—"}
                  </span>
                  <span className="text-[var(--text-muted)] text-[10px]">•</span>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Clock size={11} /> {n.tiempo_estimado}
                  </span>
                  <span className="text-[var(--text-muted)] text-[10px]">•</span>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Bike size={11} /> ${n.domicilio_cost?.toLocaleString()}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0 mt-6 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all duration-200" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NegociosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} /></div>}>
      <NegociosContent />
    </Suspense>
  );
}
