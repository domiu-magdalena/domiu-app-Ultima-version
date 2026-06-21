"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Package, Search, Clock, ChevronRight, Bike, Navigation, CheckCircle } from "lucide-react";
import { fetchData } from "@/lib/client-data";

type Pedido = {
  id: string; codigo: string; total: number; estado: string; created_at: string;
  negocios: { nombre: string } | null;
};

const estadoBadge: Record<string, { bg: string; text: string }> = {
  recibido: { bg: "bg-[#10B981]/15", text: "text-[#10B981]" },
  preparacion: { bg: "bg-blue-400/15", text: "text-blue-400" },
  asignado: { bg: "bg-purple-400/15", text: "text-purple-400" },
  camino: { bg: "bg-orange-400/15", text: "text-orange-400" },
  entregado: { bg: "bg-green-400/15", text: "text-green-400" },
  cancelado: { bg: "bg-red-400/15", text: "text-red-400" },
};

const estadoLabel: Record<string, string> = {
  recibido: "Recibido", preparacion: "Preparación", asignado: "Asignado",
  camino: "En camino", entregado: "Entregado", cancelado: "Cancelado",
};

const estadoStep: Record<string, number> = {
  recibido: 0, preparacion: 1, asignado: 2, camino: 3, entregado: 4, cancelado: -1,
};

export default function PedidosPage() {
  const router = useRouter();
  const [telefono, setTelefono] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");

  // Auto-load by saved phone
  useEffect(() => {
    const saved = localStorage.getItem("cliente_telefono");
    const savedName = localStorage.getItem("cliente_nombre") || "";
    if (saved) {
      setTelefono(saved);
      handleSearch(saved);
    }
  }, []);

  // Polling cada 10s para pedidos activos
  useEffect(() => {
    if (!telefono) return;
    const interval = setInterval(() => {
      searchPedidos(telefono);
    }, 10000);
    return () => clearInterval(interval);
  }, [telefono]);

  const handleSearch = async (tel?: string) => {
    const t = tel || telefono;
    if (!t.trim()) return;
    setLoading(true);
    setSearched(true);
    await searchPedidos(t);
    setLoading(false);
    if (!tel) localStorage.setItem("cliente_telefono", t);
  };

  const searchPedidos = async (tel: string) => {
    try {
      const data = await fetchData("pedidos_cliente", {
        select: "*, negocios(nombre)",
        filters: [{ method: "eq", column: "cliente_telefono", value: tel }],
        order: [{ column: "created_at", ascending: false }],
      });
      if (data) setPedidos(data);
    } catch {}
  };

  const filteredPedidos = pedidos.filter(p => {
    if (filter === "active") return p.estado !== "entregado" && p.estado !== "cancelado";
    if (filter === "delivered") return p.estado === "entregado" || p.estado === "cancelado";
    return true;
  });

  const activeCount = pedidos.filter(p => p.estado !== "entregado" && p.estado !== "cancelado").length;

  return (
    <div className="min-h-screen px-5 pt-6 pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/25">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#F8FAFC] tracking-tight">Mis pedidos</h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Seguimiento en tiempo real</p>
          </div>
        </div>
        {activeCount > 0 && (
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#10B981]/30 animate-ping" />
            <span className="relative px-3.5 py-1.5 rounded-full text-[10px] font-black bg-gradient-to-r from-[#10B981]/20 to-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 backdrop-blur-sm">
              {activeCount} activo{activeCount > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative mb-5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="tel"
          placeholder="Buscar por tu teléfono..."
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="w-full h-[54px] pl-12 pr-5 rounded-2xl bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none transition-all duration-300 focus:border-[#10B981]/60 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12),0_0_20px_rgba(16,185,129,0.08)] focus:bg-[#1E293B]"
        />
      </form>

      {/* Filter tabs */}
      {searched && pedidos.length > 0 && (
        <div className="flex gap-2 mb-5">
          {[
            { key: "all" as const, label: "Todos", count: pedidos.length },
            { key: "active" as const, label: "Activos", count: activeCount },
            { key: "delivered" as const, label: "Entregados", count: pedidos.length - activeCount },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${filter === f.key ? "bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/25 scale-[1.02]" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-300 backdrop-blur-sm"}`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-[3px] border-[#10B981]/20" />
            <div className="absolute inset-0 rounded-full border-[3px] border-[#10B981] border-t-transparent animate-spin" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Buscando pedidos...</p>
        </div>
      )}

      {/* Empty states */}
      {!searched && !loading && (
        <div className="text-center py-20 animate-fade-up">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1E293B]/80 to-[#1E293B]/40 flex items-center justify-center mx-auto mb-5 border border-white/10 backdrop-blur-xl shadow-xl shadow-black/20">
            <Search size={40} className="text-slate-500" />
          </div>
          <p className="text-slate-300 font-bold text-base">Busca tus pedidos</p>
          <p className="text-xs text-slate-500 mt-2 max-w-[200px] mx-auto">Ingresa tu número de teléfono para ver el estado</p>
        </div>
      )}

      {searched && !loading && filteredPedidos.length === 0 && (
        <div className="text-center py-20 animate-fade-up">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1E293B]/80 to-[#1E293B]/40 flex items-center justify-center mx-auto mb-5 border border-white/10 backdrop-blur-xl shadow-xl shadow-black/20">
            <Package size={40} className="text-slate-500" />
          </div>
          <p className="text-slate-300 font-bold text-base">
            {filter === "active" ? "No tienes pedidos activos" : filter === "delivered" ? "No hay pedidos entregados" : "No encontramos pedidos"}
          </p>
          <p className="text-xs text-slate-500 mt-2 max-w-[220px] mx-auto">Los pedidos aparecerán aquí automáticamente</p>
        </div>
      )}

      {/* Order list */}
      {filteredPedidos.length > 0 && (
        <div className="grid gap-3.5">
          {filteredPedidos.map((p, idx) => {
            const isActive = p.estado !== "entregado" && p.estado !== "cancelado";
            return (
              <button key={p.id} onClick={() => router.push(`/cliente/seguimiento/${p.codigo}`)}
                className={`group rounded-3xl p-5 text-left w-full transition-all duration-300 animate-fade-up ${isActive ? "bg-gradient-to-br from-[#10B981]/[0.12] via-[#10B981]/[0.06] to-transparent border border-[#10B981]/25 hover:border-[#10B981]/40 hover:shadow-lg hover:shadow-[#10B981]/10 hover:scale-[1.01] active:scale-[0.98]" : "bg-[#1E293B]/60 backdrop-blur-sm border border-white/10 hover:bg-[#1E293B]/80 hover:border-white/15 hover:scale-[1.01] active:scale-[0.98]"}`}
                style={{ animationDelay: `${idx * 70}ms` }}>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-[15px] text-[#F8FAFC] tracking-tight">#{p.codigo}</span>
                    {isActive && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        <span className="text-[9px] font-bold text-[#10B981] uppercase tracking-wider">En vivo</span>
                      </span>
                    )}
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${estadoBadge[p.estado]?.bg || "bg-white/5"} ${estadoBadge[p.estado]?.text || "text-slate-400"} border border-white/10 backdrop-blur-sm`}>
                    {estadoLabel[p.estado] || p.estado}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-[#F8FAFC] leading-tight">{p.negocios?.nombre || "Negocio"}</p>
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-500" />
                      {new Date(p.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    <span className={`font-black text-base ${isActive ? "text-[#F8FAFC]" : "text-[#F8FAFC]"}`}>${p.total.toLocaleString()}</span>
                    {isActive ? (
                      <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/25 text-[10px] font-bold text-[#10B981] group-hover:bg-[#10B981]/25 transition-all duration-300">
                        <Navigation size={10} /> Ver seguimiento
                      </span>
                    ) : (
                      <ChevronRight size={18} className="text-slate-500 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-300" />
                    )}
                  </div>
                </div>
                {/* Progress bar for active orders */}
                {isActive && estadoStep[p.estado] !== undefined && estadoStep[p.estado] >= 0 && (
                  <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${Math.min((estadoStep[p.estado] + 1) * 25, 100)}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      {searched && pedidos.length > 0 && (
        <p className="text-[10px] text-slate-500 text-center mt-5 opacity-50">
          Los pedidos activos se actualizan automáticamente
        </p>
      )}
    </div>
  );
}
