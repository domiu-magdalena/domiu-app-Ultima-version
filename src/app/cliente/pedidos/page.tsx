"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Package, Search, Clock, ChevronRight } from "lucide-react";
import { fetchData } from "@/lib/client-data";

type Pedido = {
  id: string; codigo: string; total: number; estado: string; created_at: string;
  negocios: { nombre: string } | null;
};

const estadoBadge: Record<string, { bg: string; text: string }> = {
  recibido: { bg: "bg-yellow-400/10", text: "text-yellow-400" },
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

export default function PedidosPage() {
  const router = useRouter();
  const [telefono, setTelefono] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const data = await fetchData("pedidos_cliente", {
        select: "*, negocios(nombre)",
        filters: [{ method: "eq", column: "cliente_telefono", value: telefono.trim() }],
        order: [{ column: "created_at", ascending: false }],
      });
      if (data) setPedidos(data);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen px-5 pt-5 pb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Mis pedidos</h1>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="tel" placeholder="Buscar por tu teléfono..." value={telefono} onChange={(e) => setTelefono(e.target.value)}
          className="search-bar pl-10" />
      </form>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-20 animate-fade-up">
          <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Search size={36} className="text-slate-600" />
          </div>
          <p className="text-slate-300 font-medium">Busca tus pedidos</p>
          <p className="text-xs text-slate-500 mt-1">Ingresa tu número de teléfono</p>
        </div>
      )}

      {searched && !loading && pedidos.length === 0 && (
        <div className="text-center py-20 animate-fade-up">
          <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Package size={36} className="text-slate-600" />
          </div>
          <p className="text-slate-300 font-medium">No encontramos pedidos</p>
          <p className="text-xs text-slate-500 mt-1">Verifica el número de teléfono</p>
        </div>
      )}

      {pedidos.length > 0 && (
        <div className="grid gap-3">
          {pedidos.map((p, idx) => (
            <button key={p.id} onClick={() => router.push(`/cliente/seguimiento/${p.codigo}`)}
              className="glass-card p-5 text-left w-full active:scale-[0.98] transition-all animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-white">#{p.codigo}</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${estadoBadge[p.estado]?.bg || "bg-slate-800"} ${estadoBadge[p.estado]?.text || "text-slate-400"}`}>
                  {estadoLabel[p.estado] || p.estado}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{p.negocios?.nombre || "Negocio"}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock size={11} />
                    {new Date(p.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-yellow-400">${p.total.toLocaleString()}</span>
                  <ChevronRight size={16} className="text-slate-500" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
