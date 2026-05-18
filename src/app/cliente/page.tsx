"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, UtensilsCrossed, Store, Wine, Pill, Percent, Bell, ShoppingCart } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotificaciones } from "@/context/NotificationContext";

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
  destacado: boolean;
};

const categories = [
  { label: "Restaurantes", icon: UtensilsCrossed, color: "#FF6B35", bg: "#FF6B3515" },
  { label: "Tiendas", icon: Store, color: "#00C853", bg: "#00C85315" },
  { label: "Licoreras", icon: Wine, color: "#A855F7", bg: "#A855F715" },
  { label: "Droguerías", icon: Pill, color: "#2979FF", bg: "#2979FF15" },
  { label: "Promociones", icon: Percent, color: "#FF3D3D", bg: "#FF3D3D15" },
];

export default function ClienteHome() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const { noLeidas, solicitarPermiso } = useNotificaciones();

  useEffect(() => {
    getSupabaseClient()
      .from("negocios")
      .select("*")
      .eq("activo", true)
      .order("destacado", { ascending: false })
      .then(({ data }) => {
        if (data) setNegocios(data);
      });
  }, []);

  const destacados = negocios.filter((n) => n.destacado);
  const filtered = search
    ? negocios.filter((n) => n.nombre.toLowerCase().includes(search.toLowerCase()) || n.categoria.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="px-4 pt-5 pb-4 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--rappi-yellow)] flex items-center justify-center text-[var(--rappi-black)] font-black text-base shadow-lg shadow-[var(--rappi-yellow)]/20">
            D
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight">
              Domi<span className="text-[var(--rappi-yellow)]">U</span>
            </h1>
            <p className="text-[10px] text-[var(--rappi-text-muted)] font-medium -mt-0.5">Magdalena</p>
          </div>
        </div>
        <button onClick={() => { solicitarPermiso(); router.push("/cliente/perfil"); }} className="relative p-2 rounded-xl bg-[var(--rappi-gray)] hover:bg-[var(--rappi-gray)]/80 transition-all">
          <Bell size={20} className="text-[var(--rappi-text-muted)]" />
          {noLeidas > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--rappi-red)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce-in shadow-lg shadow-red-500/30">
              {noLeidas}
            </span>
          )}
        </button>
      </div>

      {/* Hero */}
      <div className="rappi-card p-5 mb-6 bg-gradient-to-br from-[var(--rappi-yellow)]/5 to-transparent">
        <h2 className="text-xl font-bold mb-1">Hola, ¿qué deseas pedir hoy?</h2>
        <p className="text-sm text-[var(--rappi-text-muted)] mb-4">Encuentra todo lo que necesitas cerca de ti</p>
        <form onSubmit={(e) => { e.preventDefault(); if (search.trim()) router.push(`/cliente/negocios?busqueda=${encodeURIComponent(search.trim())}`); }} className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--rappi-text-muted)]" />
          <input type="text" placeholder="Buscar negocios o productos..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--rappi-dark)] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-[var(--rappi-text)] placeholder-[var(--rappi-text-muted)]/50 outline-none focus:border-[var(--rappi-yellow)]/50 transition-all" />
        </form>
      </div>

      {/* Search Results */}
      {search && (
        <div className="mb-6 animate-fade-in">
          <p className="text-xs text-[var(--rappi-text-muted)] mb-3">Resultados para &quot;{search}&quot;</p>
          {filtered.length === 0 ? (
            <div className="text-center py-8 rappi-card">
              <Search size={32} className="mx-auto text-[var(--rappi-text-muted)]/30 mb-2" />
              <p className="text-sm text-[var(--rappi-text-muted)]">No encontramos resultados</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((n) => (
                <button key={n.id} onClick={() => router.push(`/cliente/negocio/${n.id}`)}
                  className="rappi-card flex items-center gap-3 p-3 text-left active:scale-[0.98] transition-all">
                  <div className="w-12 h-12 rounded-xl bg-[var(--rappi-yellow)]/15 flex items-center justify-center text-[var(--rappi-yellow)] font-bold text-lg shrink-0">{n.nombre[0]}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{n.nombre}</p>
                    <p className="text-xs text-[var(--rappi-text-muted)]">{n.categoria}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      {!search && (
        <>
          <div className="mb-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-[var(--rappi-text-muted)] uppercase tracking-widest">Categorías</h3>
            </div>
            <div className="category-grid">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const catKey = cat.label === "Droguerías" ? "Droguerias" : cat.label;
                return (
                  <button key={cat.label} onClick={() => router.push(`/cliente/negocios?categoria=${catKey}`)}
                    className="category-item active:scale-95 transition-all">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: cat.bg }}>
                      <Icon size={24} style={{ color: cat.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--rappi-text)]/80 text-center leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Featured */}
          {destacados.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-[var(--rappi-text-muted)] uppercase tracking-widest">Destacados</h3>
                <button onClick={() => router.push("/cliente/negocios")} className="text-xs text-[var(--rappi-yellow)] font-semibold hover:underline">Ver todos</button>
              </div>
              <div className="grid gap-3">
                {destacados.map((n) => (
                  <button key={n.id} onClick={() => router.push(`/cliente/negocio/${n.id}`)}
                    className="rappi-card p-4 text-left active:scale-[0.98] transition-all animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--rappi-yellow)]/20 to-[var(--rappi-yellow)]/5 flex items-center justify-center text-[var(--rappi-yellow)] font-bold text-xl shrink-0 shadow-inner">
                        {n.nombre[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-base truncate">{n.nombre}</h4>
                          <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${n.abierto ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                            {n.abierto ? "Abierto" : "Cerrado"}
                          </div>
                        </div>
                        <p className="text-xs text-[var(--rappi-text-muted)] mt-0.5 line-clamp-1">{n.descripcion}</p>
                        <div className="flex items-center gap-4 mt-2.5">
                          <span className="text-xs text-[var(--rappi-yellow)] font-semibold">★ {n.rating}</span>
                          <span className="text-xs text-[var(--rappi-text-muted)]">🕐 {n.tiempo_estimado}</span>
                          <span className="text-xs text-[var(--rappi-text-muted)]">🏍 ${n.domicilio_cost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => router.push("/cliente/negocios")}
            className="rappi-btn w-full mt-5 text-center text-sm active:scale-[0.98] transition-all">
            Explorar todos los negocios
          </button>
        </>
      )}
    </div>
  );
}
