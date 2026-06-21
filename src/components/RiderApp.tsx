"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Home, ListOrdered, MapPin, DollarSign, User, LogOut, Phone, MessageCircle, Copy, Loader2, Navigation, Clock, TrendingUp, ChevronRight, Trash2, Power, Package, Star, ArrowRight } from "lucide-react";

const ESTADOS_FLUJO = ["Pendiente", "Asignado", "Aceptado", "Recogido", "En camino", "Entregado"];

function formatMoney(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v || 0);
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type TabType = "inicio" | "pedidos" | "mapa" | "liquidacion" | "gps" | "perfil";

export default function RiderApp() {
  const { user, profile, logout } = useAuth();
  const sb = getSupabaseClient();
  const [tab, setTab] = useState<TabType>("inicio");
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [riderData, setRiderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [estadoRider, setEstadoRider] = useState("No disponible");
  const [gpsActivo, setGpsActivo] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"esperando" | "activo" | "detenido" | "error">("esperando");
  const gpsWatchRef = useRef<number | null>(null);
  const subRef = useRef<any>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: rider } = await sb.from("repartidores").select("*").eq("user_id", user.id).single();
      setRiderData(rider);
      if (rider) {
        setEstadoRider(rider.estado || "No disponible");
        
        // Obtener turno activo
        const { data: turnosActivos } = await sb.from("turnos").select("id").eq("activo", true).limit(1);
        const turnoId = turnosActivos?.[0]?.id || null;
        
        // Filtrar pedidos por turno activo
        let query = sb.from("pedidos").select("*").eq("repartidor_id", rider.id);
        if (turnoId) {
          query = query.eq("turno_id", turnoId);
        }
        const { data } = await query.order("created_at", { ascending: false });
        setPedidos(data || []);
      }
    } catch (e) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user || !riderData) return;
    if (subRef.current) sb.removeChannel(subRef.current);
    const channel = sb
      .channel("rider_pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos", filter: `repartidor_id=eq.${riderData.id}` }, () => loadData())
      .subscribe();
    subRef.current = channel;
    return () => { sb.removeChannel(channel); };
  }, [user, riderData, loadData]);

  useEffect(() => {
    if (!gpsActivo) return;
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta GPS");
      setGpsStatus("error");
      setGpsActivo(false);
      return;
    }
    setGpsStatus("esperando");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGpsStatus("activo");
        if (riderData?.id) {
          sb.from("ubicaciones_repartidores").upsert({
            repartidor_id: riderData.id,
            nombre_repartidor: riderData.nombre,
            latitud: lat,
            longitud: lng,
            estado: estadoRider === "Disponible" ? "disponible" : "ocupado",
            ultima_actualizacion: new Date().toISOString(),
          }).then(() => {});
        }
      },
      (error) => {
        console.error("GPS error:", error);
        setGpsStatus("error");
        toast.error("Error GPS: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    gpsWatchRef.current = watchId;
    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
    };
  }, [gpsActivo, riderData, estadoRider]);

  async function updateEstado(id: string, nuevo: string) {
    const { error } = await sb.from("pedidos").update({ estado: nuevo }).eq("id", id);
    if (!error) {
      toast.success(`Estado: ${nuevo}`);
      if (nuevo === "Entregado") {
        setEstadoRider("Disponible");
        await sb.from("repartidores").update({ estado: "Disponible" }).eq("id", riderData.id);
      }
      loadData();
    } else toast.error(error.message);
  }

  async function cambiarEstadoRider(estado: string) {
    if (!riderData) return;
    const { error } = await sb.from("repartidores").update({ estado }).eq("id", riderData.id);
    if (!error) {
      setEstadoRider(estado);
      toast.success(`Ahora estas: ${estado}`);
    } else toast.error(error.message);
  }

  async function cerrarTurno() {
    if (!riderData) return;
    if (!confirm("Cerrar turno? Se eliminaran todos los pedidos de hoy.")) return;
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const { error } = await sb
      .from("pedidos")
      .delete()
      .eq("repartidor_id", riderData.id)
      .gte("created_at", inicioDia.toISOString());
    if (!error) {
      toast.success("Turno cerrado. Pedidos eliminados.");
      setPedidos([]);
      await sb.from("repartidores").update({ estado: "No disponible" }).eq("id", riderData.id);
      setEstadoRider("No disponible");
    } else {
      toast.error("Error al cerrar turno: " + error.message);
    }
  }

  const entregados = pedidos.filter((p) => p.estado === "Entregado");
  const activos = pedidos.filter((p) => !["Entregado", "Cancelado"].includes(p.estado));
  const ganancia = entregados.reduce((a, b) => a + (b.pago_repartidor || 0), 0);

  function copyInfo(p: any) {
    const text = `Pedido: #${p.codigo}\nCliente: ${p.cliente}\nContacto: ${p.telefono}\nDireccion: ${p.direccion}\nBarrio: ${p.barrio}\nTarifa: ${formatMoney(p.precio)}\nTu pago: ${formatMoney(p.pago_repartidor)}\nFecha: ${formatearFecha(p.created_at)}`;
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  }

  function getEstadoColor(estado: string) {
    switch (estado) {
      case "Pendiente": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      case "Asignado": return "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20";
      case "Aceptado": return "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20";
      case "Recogido": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "En camino": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "Entregado": return "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20";
      case "Cancelado": return "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  }

  const estadoConfig: Record<string, { color: string; glow: string }> = {
    "Disponible": { color: "from-[#10B981] to-[#059669]", glow: "shadow-[#10B981]/30" },
    "Ocupado": { color: "from-[#F59E0B] to-[#D97706]", glow: "shadow-[#F59E0B]/30" },
    "No disponible": { color: "from-[#EF4444] to-[#DC2626]", glow: "shadow-[#EF4444]/30" },
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#10B981]/20">D</div>
        <Loader2 className="animate-spin text-[#10B981]" size={24} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-[#F8FAFC] overflow-hidden">
      <header className="bg-[#0F172A]/95 backdrop-blur-xl p-4 flex justify-between items-center border-b border-white/[0.06] z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black text-base shadow-lg shadow-[#10B981]/20">
            {(profile?.nombre || riderData?.nombre || "R")?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">{profile?.nombre || riderData?.nombre}</h1>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-gradient-to-r ${estadoConfig[estadoRider]?.color || "from-slate-600 to-slate-700"} text-white shadow-sm ${estadoConfig[estadoRider]?.glow || ""}`}>
              {estadoRider}
            </span>
          </div>
        </div>
        <button onClick={() => { logout(); }} className="w-9 h-9 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all">
          <LogOut size={16} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {tab === "inicio" && (
          <div className="space-y-4 animate-fade-up">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/[0.02] p-5 rounded-2xl border border-[#10B981]/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-[#10B981]" />
                  <p className="text-xs font-semibold text-[#10B981]/70">Ganancia Turno</p>
                </div>
                <p className="text-2xl font-black text-[#10B981]">{formatMoney(ganancia)}</p>
              </div>
              <div className="bg-gradient-to-br from-[#2563EB]/10 to-[#2563EB]/[0.02] p-5 rounded-2xl border border-[#2563EB]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={14} className="text-[#2563EB]" />
                  <p className="text-xs font-semibold text-[#2563EB]/70">Entregados</p>
                </div>
                <p className="text-2xl font-black text-[#2563EB]">{entregados.length}</p>
              </div>
            </div>

            <div className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Disponibilidad</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { estado: "Disponible", icon: Power, activeColor: "bg-[#10B981] text-white shadow-lg shadow-[#10B981]/20" },
                  { estado: "Ocupado", icon: Clock, activeColor: "bg-[#F59E0B] text-[#0F172A] shadow-lg shadow-[#F59E0B]/20" },
                  { estado: "No disponible", icon: LogOut, activeColor: "bg-[#EF4444] text-white shadow-lg shadow-[#EF4444]/20" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isActive = estadoRider === opt.estado;
                  return (
                    <button
                      key={opt.estado}
                      onClick={() => cambiarEstadoRider(opt.estado)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-all ${
                        isActive ? opt.activeColor : "bg-white/[0.04] text-[#64748B] border border-white/[0.06] hover:border-white/[0.12]"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-[10px]">{opt.estado === "No disponible" ? "No disp." : opt.estado}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-[#F8FAFC] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  Pedidos Activos
                </h3>
                <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-full">{activos.length}</span>
              </div>
              {activos.length === 0 ? (
                <div className="bg-[#1E293B]/50 rounded-2xl border border-white/[0.04] p-8 text-center">
                  <Package size={32} className="mx-auto text-[#64748B]/40 mb-2" />
                  <p className="text-[#64748B] text-sm">Sin pedidos pendientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activos.map((p) => (
                    <div key={p.id} className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-4 hover:border-[#10B981]/20 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[#10B981] font-black text-sm">#{p.codigo}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${getEstadoColor(p.estado)}`}>{p.estado}</span>
                      </div>
                      <h4 className="text-white font-semibold text-sm">{p.cliente}</h4>
                      <p className="text-xs text-[#64748B] mt-0.5">{p.direccion}</p>
                      {p.barrio && <p className="text-[10px] text-[#64748B]/60 mt-0.5">{p.barrio}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "pedidos" && (
          <div className="space-y-3 animate-fade-up">
            <h2 className="text-lg font-bold text-white mb-4">Mis Pedidos</h2>
            {pedidos.length === 0 ? (
              <div className="bg-[#1E293B]/50 rounded-2xl border border-white/[0.04] p-12 text-center">
                <ListOrdered size={36} className="mx-auto text-[#64748B]/40 mb-3" />
                <p className="text-[#64748B] text-sm">No hay pedidos</p>
              </div>
            ) : (
              pedidos.map((p) => (
                <div key={p.id} className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#10B981] font-black text-sm">#{p.codigo}</span>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${getEstadoColor(p.estado)}`}>{p.estado}</span>
                    </div>
                    <span className="text-[10px] text-[#64748B]">{formatearFecha(p.created_at)}</span>
                  </div>
                  <h3 className="text-white font-bold">{p.cliente}</h3>
                  <p className="text-sm text-[#94A3B8] mt-1">{p.direccion}</p>
                  {p.barrio && <p className="text-xs text-[#64748B] mt-0.5">Barrio: {p.barrio}</p>}
                  <p className="text-xs text-[#64748B] mt-1">Tel: {p.telefono || "N/A"}</p>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {p.telefono && <a href={`https://wa.me/57${p.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2.5 bg-[#10B981]/10 text-[#10B981] rounded-xl text-xs font-bold border border-[#10B981]/20 hover:bg-[#10B981]/15 transition-all"><MessageCircle size={14} /> WhatsApp</a>}
                    {p.telefono && <a href={`tel:${p.telefono}`} className="flex items-center justify-center gap-2 py-2.5 bg-white/[0.04] text-[#94A3B8] rounded-xl text-xs font-bold border border-white/[0.06] hover:bg-white/[0.08] transition-all"><Phone size={14} /> Llamar</a>}
                    <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(p.direccion)}`, "_blank")} className="flex items-center justify-center gap-2 py-2.5 bg-[#2563EB]/10 text-[#2563EB] rounded-xl text-xs font-bold border border-[#2563EB]/20 hover:bg-[#2563EB]/15 transition-all"><MapPin size={14} /> Mapa</button>
                    <button onClick={() => copyInfo(p)} className="flex items-center justify-center gap-2 py-2.5 bg-white/[0.04] text-[#94A3B8] rounded-xl text-xs font-bold border border-white/[0.06] hover:bg-white/[0.08] transition-all"><Copy size={14} /> Copiar</button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {(p.estado === "Pendiente" || p.estado === "Asignado") && <button onClick={() => updateEstado(p.id, "Aceptado")} className="w-full py-3.5 bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#10B981]/20 transition-all text-sm">Aceptar Pedido</button>}
                    {p.estado === "Aceptado" && <button onClick={() => updateEstado(p.id, "Recogido")} className="w-full py-3.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#2563EB]/20 transition-all text-sm">Recogido</button>}
                    {p.estado === "Recogido" && <button onClick={() => updateEstado(p.id, "En camino")} className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all text-sm">En Camino</button>}
                    {p.estado === "En camino" && <button onClick={() => updateEstado(p.id, "Entregado")} className="w-full py-3.5 bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#10B981]/20 transition-all text-sm flex items-center justify-center gap-2">Entregado <ArrowRight size={16} /></button>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "mapa" && (
          <div className="space-y-3 animate-fade-up">
            <h2 className="text-lg font-bold text-white mb-4">Ruta de Pedidos</h2>
            {activos.length === 0 ? (
              <div className="bg-[#1E293B]/50 rounded-2xl border border-white/[0.04] p-12 text-center">
                <MapPin size={36} className="mx-auto text-[#64748B]/40 mb-3" />
                <p className="text-[#64748B] text-sm">No hay direcciones para visitar</p>
              </div>
            ) : (
              activos.map((p) => (
                <div key={p.id} className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-4 flex justify-between items-center hover:border-[#2563EB]/20 transition-all">
                  <div>
                    <span className="text-[#10B981] text-xs font-black">#{p.codigo}</span>
                    <p className="text-white text-sm font-semibold">{p.direccion}</p>
                    {p.barrio && <p className="text-[10px] text-[#64748B]">{p.barrio}</p>}
                  </div>
                  <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(p.direccion)}`, "_blank")} className="px-4 py-2.5 bg-[#2563EB] text-white rounded-xl font-bold text-xs hover:bg-[#1D4ED8] transition-all shadow-lg shadow-[#2563EB]/20">Ir</button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "gps" && (
          <div className="space-y-4 animate-fade-up">
            <div className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-6 text-center">
              <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center ${gpsActivo ? "bg-[#10B981]/10 border border-[#10B981]/20" : "bg-[#F59E0B]/10 border border-[#F59E0B]/20"}`}>
                <Navigation size={32} className={gpsActivo ? "text-[#10B981]" : "text-[#F59E0B]"} />
              </div>
              <h2 className="text-xl font-black text-white mb-2">GPS {gpsActivo ? "Activo" : "Inactivo"}</h2>
              <p className="text-[#64748B] text-sm mb-6">
                {gpsStatus === "esperando" && "Presiona activar para comenzar"}
                {gpsStatus === "activo" && "Enviando ubicacion en tiempo real"}
                {gpsStatus === "detenido" && "GPS detenido"}
                {gpsStatus === "error" && "Error al obtener ubicacion"}
              </p>
              <button
                onClick={() => {
                  if (gpsActivo) {
                    if (gpsWatchRef.current !== null) {
                      navigator.geolocation.clearWatch(gpsWatchRef.current);
                      gpsWatchRef.current = null;
                    }
                    setGpsActivo(false);
                    setGpsStatus("detenido");
                    toast.success("GPS detenido");
                  } else {
                    setGpsActivo(true);
                    toast.success("GPS activando...");
                  }
                }}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
                  gpsActivo
                    ? "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 hover:bg-[#EF4444]/15"
                    : "bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/20 hover:-translate-y-0.5"
                }`}
              >
                {gpsActivo ? "DETENER GPS" : "ACTIVAR GPS"}
              </button>
              {gpsActivo && (
                <div className="mt-4 bg-[#10B981]/5 border border-[#10B981]/10 p-3 rounded-xl text-left">
                  <p className="text-[10px] text-[#10B981]/60 font-semibold uppercase">Estado</p>
                  <p className="text-xs text-[#10B981] font-semibold mt-0.5">Ubicacion enviada al servidor</p>
                </div>
              )}
            </div>
            <div className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5">
              <h3 className="text-white font-bold text-sm mb-3">Instrucciones</h3>
              <ul className="text-xs text-[#64748B] space-y-2">
                <li className="flex items-start gap-2"><span className="text-[#10B981] mt-0.5">1.</span> Activa el GPS cuando inicies tu turno</li>
                <li className="flex items-start gap-2"><span className="text-[#10B981] mt-0.5">2.</span> Manten el GPS activo durante entregas</li>
                <li className="flex items-start gap-2"><span className="text-[#10B981] mt-0.5">3.</span> El admin vera tu ubicacion en tiempo real</li>
                <li className="flex items-start gap-2"><span className="text-[#10B981] mt-0.5">4.</span> Asegurate de tener GPS del dispositivo activo</li>
              </ul>
            </div>
          </div>
        )}

        {tab === "liquidacion" && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-lg font-bold text-white mb-4">Mi Liquidacion</h2>
            <div className="bg-gradient-to-br from-[#10B981]/15 to-[#10B981]/[0.02] p-6 rounded-2xl border border-[#10B981]/20 text-center">
              <p className="text-[#10B981]/70 text-xs font-semibold uppercase tracking-wider">Total a Recibir</p>
              <h1 className="text-4xl font-black text-[#10B981] mt-2">{formatMoney(ganancia)}</h1>
              <p className="text-[#64748B] text-sm mt-2">{entregados.length} pedidos entregados</p>
            </div>
            {entregados.length > 0 ? (
              <div className="space-y-2">
                {entregados.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-4 bg-[#1E293B]/70 rounded-2xl border border-white/[0.06]">
                    <div>
                      <span className="text-[#10B981] text-xs font-black">#{p.codigo}</span>
                      <p className="text-[#64748B] text-xs mt-0.5">{p.cliente}</p>
                    </div>
                    <span className="text-[#10B981] font-black">{formatMoney(p.pago_repartidor)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1E293B]/50 rounded-2xl border border-white/[0.04] p-8 text-center">
                <DollarSign size={32} className="mx-auto text-[#64748B]/40 mb-2" />
                <p className="text-[#64748B] text-sm">Aun no hay entregas</p>
              </div>
            )}
            <button
              onClick={cerrarTurno}
              className="w-full py-3.5 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#EF4444]/15 transition-all text-sm"
            >
              <Trash2 size={16} />
              Cerrar Turno
            </button>
          </div>
        )}

        {tab === "perfil" && (
          <div className="bg-[#1E293B]/70 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-6 space-y-4 animate-fade-up">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-[#10B981]/20">
                {(profile?.nombre || riderData?.nombre || "R")?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{profile?.nombre || riderData?.nombre}</h2>
                <p className="text-xs text-[#64748B]">{profile?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Telefono", value: riderData?.telefono || "No registrado" },
                { label: "Documento", value: riderData?.documento || "No registrado" },
                { label: "Vehiculo", value: riderData?.vehiculo || "No registrado" },
                { label: "Placa", value: riderData?.placa || "No registrado" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-3 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{item.label}</span>
                  <span className="text-sm text-white font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="flex items-center justify-around h-[68px] mx-4 mb-4 bg-[#0F172A]/92 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/30 max-w-lg mx-auto">
          {[
            { id: "inicio" as TabType, icon: Home, label: "Inicio" },
            { id: "pedidos" as TabType, icon: ListOrdered, label: "Pedidos" },
            { id: "mapa" as TabType, icon: MapPin, label: "Mapa" },
            { id: "liquidacion" as TabType, icon: DollarSign, label: "Liquid." },
            { id: "gps" as TabType, icon: Navigation, label: "GPS" },
            { id: "perfil" as TabType, icon: User, label: "Perfil" }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 py-1.5 px-2.5 rounded-xl transition-all ${isActive ? "text-[#10B981]" : "text-[#64748B] hover:text-[#94A3B8]"}`}>
                <div className={`p-1 rounded-lg transition-all ${isActive ? "bg-[#10B981]/10" : ""}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[9px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
