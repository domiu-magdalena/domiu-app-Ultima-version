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
      <div className="sticky top-0 bg-[var(--bg-primary)] z-10 border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft size={18} className="text-[var(--text-primary)]" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Negocios</h1>
            {negocios.length > 0 && <p className="text-xs text-[var(--text-secondary)]">{negocios.length} resultados</p>}
          </div>
          <button className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center active:scale-90 transition-all">
            <SlidersHorizontal size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Search query */}
      {busqueda && (
        <div className="mx-4 mt-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg" style={{ background: "var(--primary)15" }}>
              <Search size={16} className="m-3" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Resultados para</p>
              <p className="font-bold gradient-text">&quot;{busqueda}&quot;</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="h-scroll px-4 mt-4">
        {categories.map((cat) => (
          <button key={cat || "todas"} onClick={() => { setFilter(cat); router.push(cat ? `/cliente/negocios?categoria=${cat}` : "/cliente/negocios"); }}
            className={`chip shrink-0 transition-all active:scale-95 ${filter === cat ? "chip-active" : "chip-inactive"}`}>
            {cat || "Todas"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid gap-3 px-4 mt-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="card-modern p-4 animate-fade-up">
              <div className="flex gap-3">
                <div className="skeleton w-14 h-14 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && negocios.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-[var(--text-muted)]/50" />
          </div>
          <p className="text-[var(--text-secondary)] font-medium">No hay negocios en esta categoría</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Prueba con otra categoría</p>
        </div>
      ) : !loading && (
        <div className="grid gap-3 px-4 mt-4">
          {negocios.map((n, idx) => (
            <button key={n.id} onClick={() => router.push(`/cliente/negocio/${n.id}`)}
              className="biz-card p-4 text-left w-full animate-fade-up flex items-start gap-4" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden" style={{ background: "var(--primary)10", color: "var(--primary)" }}>
                {n.logo ? <img src={n.logo} alt="" className="w-full h-full object-cover" /> : n.nombre[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-[15px] truncate">{n.nombre}</h4>
                  <span className={`badge shrink-0 ${n.abierto ? "badge-success" : "badge-error"}`}>
                    {n.abierto ? "Abierto" : "Cerrado"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{n.descripcion}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--primary)" }}>
                    <Star size={12} /> {n.rating || n.calificacion || "—"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Clock size={12} /> {n.tiempo_estimado}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Bike size={12} /> ${n.domicilio_cost?.toLocaleString()}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0 mt-3" />
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
