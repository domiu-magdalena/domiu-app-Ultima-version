"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, ClipboardList, Package, TrendingUp, DollarSign, Clock, ChevronRight, Bell, ArrowUpRight } from "lucide-react";
import { useNegocio } from "@/context/negocio/NegocioContext";
import { getSupabaseClient } from "@/lib/supabase";

export default function NegocioDashboard() {
  const router = useRouter();
  const { negocio } = useNegocio();
  const [stats, setStats] = useState({ pendientes: 0, preparacion: 0, listos: 0, ventasHoy: 0, productosActivos: 0 });

  useEffect(() => {
    if (!negocio?.id) return;
    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [pedidos, productos] = await Promise.all([
        getSupabaseClient().from("pedidos_cliente").select("estado_negocio, total, created_at").eq("negocio_id", negocio.id),
        getSupabaseClient().from("productos").select("id, disponible").eq("negocio_id", negocio.id),
      ]);
      const pendientes = (pedidos.data || []).filter((p) => p.estado_negocio === "recibido").length;
      const preparacion = (pedidos.data || []).filter((p) => p.estado_negocio === "en_preparacion").length;
      const listos = (pedidos.data || []).filter((p) => p.estado_negocio === "listo_para_recoger").length;
      const ventasHoy = (pedidos.data || []).filter((p) => new Date(p.created_at) >= today).reduce((s, p) => s + (p.total || 0), 0);
      const productosActivos = (productos.data || []).filter((p) => p.disponible).length;
      setStats({ pendientes, preparacion, listos, ventasHoy, productosActivos });
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [negocio?.id]);

  if (!negocio) return null;

  const cards = [
    { label: "Pendientes", value: stats.pendientes, icon: ClipboardList, color: "from-[#F59E0B]/15 to-[#F59E0B]/[0.02]", borderColor: "border-[#F59E0B]/20", iconColor: "text-[#F59E0B]", href: "/negocio/pedidos" },
    { label: "En preparacion", value: stats.preparacion, icon: Clock, color: "from-[#2563EB]/15 to-[#2563EB]/[0.02]", borderColor: "border-[#2563EB]/20", iconColor: "text-[#2563EB]", href: "/negocio/pedidos" },
    { label: "Listos", value: stats.listos, icon: Bell, color: "from-[#10B981]/15 to-[#10B981]/[0.02]", borderColor: "border-[#10B981]/20", iconColor: "text-[#10B981]", href: "/negocio/pedidos" },
    { label: "Ventas del dia", value: `$${stats.ventasHoy.toLocaleString()}`, icon: DollarSign, color: "from-purple-500/15 to-purple-500/[0.02]", borderColor: "border-purple-500/20", iconColor: "text-purple-400", href: "" },
    { label: "Productos activos", value: stats.productosActivos, icon: Package, color: "from-orange-500/15 to-orange-500/[0.02]", borderColor: "border-orange-500/20", iconColor: "text-orange-400", href: "/negocio/productos" },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center text-[#10B981] font-bold text-2xl border border-[#10B981]/20">
          {negocio.nombre[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white">{negocio.nombre}</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{negocio.categoria}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${negocio.abierto ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20" : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"}`}>
              {negocio.abierto ? "Abierto" : "Cerrado"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} onClick={() => card.href && router.push(card.href)} className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 text-left border ${card.borderColor} hover:border-white/[0.12] transition-all active:scale-[0.98] ${card.href ? "cursor-pointer" : "cursor-default"}`}>
              <div className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-3`}>
                <Icon size={20} className={card.iconColor} />
              </div>
              <p className="text-2xl font-black text-white mb-1">{card.value}</p>
              <p className="text-xs text-[#64748B] font-medium">{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-white">Pedidos recientes</h2>
          <button onClick={() => router.push("/negocio/pedidos")} className="text-xs text-[#10B981] font-semibold flex items-center gap-1 hover:text-[#34d399] transition-colors">
            Ver todos <ChevronRight size={14} />
          </button>
        </div>
        <RecentOrders negocioId={negocio.id} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => router.push("/negocio/productos")} className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5 text-left hover:border-[#10B981]/20 transition-all active:scale-[0.98] group">
          <Package size={24} className="text-[#10B981] mb-3 group-hover:scale-110 transition-transform" />
          <p className="font-bold text-sm text-white">Gestionar productos</p>
          <p className="text-xs text-[#64748B] mt-0.5">Agregar, editar o desactivar</p>
        </button>
        <button onClick={() => router.push("/negocio/perfil")} className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5 text-left hover:border-[#10B981]/20 transition-all active:scale-[0.98] group">
          <Store size={24} className="text-[#10B981] mb-3 group-hover:scale-110 transition-transform" />
          <p className="font-bold text-sm text-white">Mi perfil</p>
          <p className="text-xs text-[#64748B] mt-0.5">Editar info del negocio</p>
        </button>
      </div>
    </div>
  );
}

function RecentOrders({ negocioId }: { negocioId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!negocioId) return;
    const fetchOrders = async () => {
      const { data } = await getSupabaseClient()
        .from("pedidos_cliente")
        .select("id, codigo, cliente_nombre, total, estado_negocio, created_at")
        .eq("negocio_id", negocioId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setOrders(data);
    };
    fetchOrders();
    const sub = getSupabaseClient()
      .channel("negocio-pedidos")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos_cliente", filter: `negocio_id=eq.${negocioId}` }, () => fetchOrders())
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [negocioId]);

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList size={28} className="mx-auto text-[#64748B]/30 mb-2" />
        <p className="text-sm text-[#64748B]">No hay pedidos recientes</p>
      </div>
    );
  }

  const estadoMap: Record<string, { color: string; bg: string }> = {
    recibido: { color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
    en_preparacion: { color: "text-[#2563EB]", bg: "bg-[#2563EB]/10" },
    listo_para_recoger: { color: "text-[#10B981]", bg: "bg-[#10B981]/10" },
  };

  return (
    <div className="space-y-2">
      {orders.map((o) => {
        const est = estadoMap[o.estado_negocio] || { color: "text-[#64748B]", bg: "bg-white/[0.04]" };
        return (
          <button key={o.id} onClick={() => router.push(`/negocio/pedido/${o.id}`)} className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.05] transition-all group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col">
                <p className="text-sm font-bold text-white">#{o.codigo}</p>
                <p className="text-xs text-[#64748B] truncate">{o.cliente_nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${est.bg} ${est.color}`}>
                {o.estado_negocio?.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-white font-bold">${o.total.toLocaleString()}</span>
              <ArrowUpRight size={14} className="text-[#64748B] group-hover:text-[#10B981] transition-colors" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
