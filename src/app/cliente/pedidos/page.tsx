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
  recibido: { bg: "bg-[#10B981]/10", text: "text-[#10B981]" },
  preparacion: { bg: "bg-blue-400/10", text: "text-blue-400" },
  asignado: { bg: "bg-purple-400/10", text: "text-purple-400" },
  camino: { bg: "bg-orange-400/10", text: "text-orange-400" },
  entregado: { bg: "bg-green-400/10", text: "text-green-400" },
  cancelado: { bg: "bg-red-400/10", text: "text-red-400" },
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
    <div className="min-h-screen px-5 pt-5 pb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-[#10B981]" />
          </div>
          <h1 className="text-xl font-black text-[#F8FAFC]">Mis pedidos</h1>
        </div>
        {activeCount > 0 && (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 animate-pulse">
            {activeCount} activo{activeCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="tel"
          placeholder="Buscar por tu teléfono..."
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="w-full h-[48px] pl-11 pr-4 rounded-2xl bg-[#1E293B] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#10B981] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
        />
      </form>

      {/* Filter tabs */}
      {searched && pedidos.length > 0 && (
        <div className="flex gap-2 mb-4">
          {[
            { key: "all" as const, label: "Todos", count: pedidos.length },
            { key: "active" as const, label: "Activos", count: activeCount },
            { key: "delivered" as const, label: "Entregados", count: pedidos.length - activeCount },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${filter === f.key ? "bg-[#10B981] text-white shadow-lg shadow-[#10B981]/20" : "bg-white/5 text-slate-400 border border-white/10"}`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty states */}
      {!searched && !loading && (
        <div className="text-center py-20 animate-fade-up">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Search size={36} className="text-slate-600" />
          </div>
          <p className="text-slate-300 font-medium">Busca tus pedidos</p>
          <p className="text-xs text-slate-500 mt-1">Ingresa tu número de teléfono</p>
        </div>
      )}

      {searched && !loading && filteredPedidos.length === 0 && (
        <div className="text-center py-20 animate-fade-up">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Package size={36} className="text-slate-600" />
          </div>
          <p className="text-slate-300 font-medium">
            {filter === "active" ? "No tienes pedidos activos" : filter === "delivered" ? "No hay pedidos entregados" : "No encontramos pedidos"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Los pedidos aparecerán aquí automáticamente</p>
        </div>
      )}

      {/* Order list */}
      {filteredPedidos.length > 0 && (
        <div className="grid gap-3">
          {filteredPedidos.map((p, idx) => {
            const isActive = p.estado !== "entregado" && p.estado !== "cancelado";
            return (
              <button key={p.id} onClick={() => router.push(`/cliente/seguimiento/${p.codigo}`)}
                className={`rounded-3xl p-5 text-left w-full active:scale-[0.98] transition-all animate-fade-up ${isActive ? "bg-gradient-to-r from-[#10B981]/[0.08] to-transparent border border-[#10B981]/20" : "bg-white/5 border border-white/10"}`}
                style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-sm text-[#F8FAFC]">#{p.codigo}</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${estadoBadge[p.estado]?.bg || "bg-white/5"} ${estadoBadge[p.estado]?.text || "text-slate-400"} border border-white/10`}>
                    {estadoLabel[p.estado] || p.estado}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#F8FAFC]">{p.negocios?.nombre || "Negocio"}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock size={11} />
                      {new Date(p.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="font-bold text-sm text-[#F8FAFC]">${p.total.toLocaleString()}</span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#10B981]">
                        <Navigation size={10} /> Ver
                      </span>
                    ) : (
                      <ChevronRight size={16} className="text-slate-500" />
                    )}
                  </div>
                </div>
                {/* Progress bar for active orders */}
                {isActive && estadoStep[p.estado] !== undefined && estadoStep[p.estado] >= 0 && (
                  <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-[#10B981] transition-all duration-700" style={{ width: `${Math.min((estadoStep[p.estado] + 1) * 25, 100)}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      {searched && pedidos.length > 0 && (
        <p className="text-[10px] text-slate-500 text-center mt-4 opacity-50">
          Los pedidos activos se actualizan automáticamente
        </p>
      )}
    </div>
  );
}
