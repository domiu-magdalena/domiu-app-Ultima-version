"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Star, Clock, Bike } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Negocio = {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  logo: string;
  rating: number;
  tiempo_estimado: string;
  domicilio_cost: number;
  abierto: boolean;
};

function NegociosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoria = searchParams.get("categoria") || "";
  const busqueda = searchParams.get("busqueda") || "";
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [filter, setFilter] = useState(categoria);

  useEffect(() => {
    getSupabaseClient()
      .from("negocios")
      .select("*")
      .eq("activo", true)
      .order("destacado", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        let filtered = data;
        if (categoria) filtered = filtered.filter((n) => n.categoria === categoria);
        if (busqueda) {
          const q = busqueda.toLowerCase();
          filtered = filtered.filter((n) => n.nombre.toLowerCase().includes(q) || n.descripcion.toLowerCase().includes(q));
        }
        setNegocios(filtered);
        setFilter(categoria);
      });
  }, [categoria, busqueda]);

  const categories = ["", "Restaurantes", "Tiendas", "Licoreras", "Droguerias", "Promociones"];

  return (
    <div className="px-4 pt-5 pb-4 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-[var(--rappi-gray)] flex items-center justify-center hover:bg-[var(--rappi-gray)]/80 transition-all">
          <ArrowLeft size={18} className="text-[var(--rappi-text)]" />
        </button>
        <h1 className="text-lg font-bold">Negocios</h1>
      </div>

      {busqueda && (
        <div className="rappi-card p-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Search size={16} className="text-[var(--rappi-yellow)]" />
            <span className="text-[var(--rappi-text-muted)]">Resultados para <strong className="text-[var(--rappi-text)]">&quot;{busqueda}&quot;</strong></span>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {categories.map((cat) => (
          <button key={cat || "todas"} onClick={() => { setFilter(cat); router.push(cat ? `/cliente/negocios?categoria=${cat}` : "/cliente/negocios"); }}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              filter === cat ? "bg-[var(--rappi-yellow)] text-[var(--rappi-black)]" : "bg-[var(--rappi-gray)] text-[var(--rappi-text-muted)] hover:bg-[var(--rappi-gray)]/80"
            }`}>
            {cat || "Todas"}
          </button>
        ))}
      </div>

      {negocios.length === 0 ? (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto text-[var(--rappi-text-muted)]/20 mb-3" />
          <p className="text-[var(--rappi-text-muted)] text-sm">No hay negocios en esta categoría</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {negocios.map((n) => (
            <button key={n.id} onClick={() => router.push(`/cliente/negocio/${n.id}`)}
              className="rappi-card p-4 text-left active:scale-[0.98] transition-all animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--rappi-yellow)]/20 to-[var(--rappi-yellow)]/5 flex items-center justify-center text-[var(--rappi-yellow)] font-bold text-xl shrink-0">
                  {n.nombre[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm truncate">{n.nombre}</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${n.abierto ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {n.abierto ? "Abierto" : "Cerrado"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--rappi-text-muted)] mt-0.5 line-clamp-1">{n.descripcion}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-[var(--rappi-yellow)] font-semibold"><Star size={12} /> {n.rating}</span>
                    <span className="flex items-center gap-1 text-xs text-[var(--rappi-text-muted)]"><Clock size={12} /> {n.tiempo_estimado}</span>
                    <span className="flex items-center gap-1 text-xs text-[var(--rappi-text-muted)]"><Bike size={12} /> ${n.domicilio_cost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NegociosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[var(--rappi-dark)]"><div className="w-8 h-8 border-2 border-[var(--rappi-yellow)] border-t-transparent rounded-full animate-spin" /></div>}>
      <NegociosContent />
    </Suspense>
  );
}
