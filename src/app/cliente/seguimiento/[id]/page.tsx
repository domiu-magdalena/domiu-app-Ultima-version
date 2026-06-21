"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, CookingPot, UserCheck, Bike, Home, Star, MessageCircle, MapPin, Clock, Phone, Navigation } from "lucide-react";
import { fetchData } from "@/lib/client-data";
import MapaRepartidorCliente from "@/components/MapaRepartidorCliente";

type Pedido = {
  id: string; codigo: string; cliente_nombre: string; estado: string;
  total: number; created_at: string; repartidor_id: string | null;
  repartidores?: { nombre: string; telefono: string } | null;
  negocios: { nombre: string; logo: string; latitud?: number; longitud?: number } | null;
};

const steps = [
  { key: "recibido", label: "Pedido recibido", icon: Package, desc: "Hemos recibido tu pedido" },
  { key: "preparacion", label: "En preparación", icon: CookingPot, desc: "El negocio está preparando tu pedido" },
  { key: "asignado", label: "Repartidor asignado", icon: UserCheck, desc: "Un repartidor va al negocio" },
  { key: "camino", label: "En camino", icon: Bike, desc: "Tu pedido va en camino" },
  { key: "entregado", label: "Entregado", icon: Home, desc: "¡Pedido entregado!" },
];

const stepIndex: Record<string, number> = { recibido: 0, preparacion: 1, asignado: 2, camino: 3, entregado: 4 };
const stepLabels: Record<string, string> = { recibido: "RECIBIDO", preparacion: "PREPARACIÓN", asignado: "ASIGNADO", camino: "EN CAMINO", entregado: "ENTREGADO" };

export default function SeguimientoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);

  useEffect(() => {
    if (!id) return;
    const fetchPedido = async () => {
      try {
        const data = await fetchData("pedidos_cliente", {
          select: "*, negocios(nombre, logo, latitud, longitud), repartidores(nombre, telefono)",
          filters: [{ method: "eq", column: "codigo", value: id }],
          single: true,
        });
        if (data) { setPedido(data); setCurrentStep(stepIndex[data.estado] ?? -1); }
      } catch {}
    };
    fetchPedido();
    const interval = setInterval(fetchPedido, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (!pedido) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="w-12 h-12 border-[3px] rounded-full animate-spin" style={{ borderColor: "#10B98130", borderTopColor: "#10B981" }} />
          <div className="absolute inset-0 w-12 h-12 rounded-full animate-ping opacity-20" style={{ borderColor: "#10B981", border: "2px solid #10B981" }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white/80">Cargando pedido</p>
          <p className="text-xs text-white/40 mt-1">Obteniendo información...</p>
        </div>
      </div>
    </div>
  );

  const isEntregado = pedido.estado === "entregado";
  const eta = pedido.estado === "camino" ? "5-10 min" : pedido.estado === "asignado" ? "15-20 min" : "—";
  const currentCat = Math.min(currentStep, 3);

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <div className="px-5 pt-5 pb-8 animate-fade-in">

        <div className="relative flex items-center gap-3 mb-7">
          <div className="absolute inset-0 -m-3 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.4))", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />
          <button onClick={() => router.back()} className="relative w-11 h-11 rounded-2xl flex items-center justify-center active:scale-90 transition-all duration-200" style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <div className="relative">
            <h1 className="text-xl font-bold text-white tracking-tight">Seguimiento</h1>
            <p className="text-xs text-white/40 font-medium">Pedido #{pedido.codigo}</p>
          </div>
        </div>

        <div className="relative mb-6 rounded-3xl overflow-hidden animate-fade-up" style={{ background: "linear-gradient(160deg, rgba(30,41,59,0.7), rgba(15,23,42,0.9))", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)" }} />
          <div className="p-7 text-center">
            {isEntregado ? (
              <div className="relative mx-auto mb-5 w-24 h-24">
                <div className="absolute inset-0 rounded-[28px] animate-pulse" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.25), transparent 70%)" }} />
                <div className="relative w-24 h-24 rounded-[28px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))", border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 0 40px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                  <Home size={38} className="text-emerald-400" />
                </div>
              </div>
            ) : (
              <div className="relative mx-auto mb-5 w-24 h-24">
                <div className="absolute inset-0 rounded-[28px] animate-pulse" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)" }} />
                <div className="relative w-24 h-24 rounded-[28px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.03))", border: "1px solid rgba(16,185,129,0.15)", boxShadow: "0 0 40px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                  <Bike size={38} className="text-emerald-400" />
                </div>
              </div>
            )}
            <h2 className={`text-2xl font-black mb-1.5 tracking-tight ${isEntregado ? "" : "text-white"}`} style={isEntregado ? { background: "linear-gradient(135deg, #10B981, #34D399, #6EE7B7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } : {}}>
              {isEntregado ? "¡Pedido entregado!" : pedido.estado === "camino" ? "Tu pedido está en camino" : "Estamos procesando tu pedido"}
            </h2>
            <p className="text-sm text-white/40 font-medium">{pedido.negocios?.nombre}</p>

            <div className="flex items-center justify-center gap-2.5 mt-5 flex-wrap">
              {currentStep >= 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)", boxShadow: "0 2px 12px rgba(16,185,129,0.08)" }}>
                  <Clock size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 tracking-wide">{stepLabels[pedido.estado]}</span>
                </div>
              )}
              {!isEntregado && currentStep >= 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Navigation size={13} className="text-emerald-400" />
                  <span className="text-xs text-white/50 font-semibold">ETA:</span>
                  <span className="text-xs text-white/80 font-bold">{eta}</span>
                </div>
              )}
            </div>

            {!isEntregado && currentStep >= 0 && (
              <div className="mt-6">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,0.8)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)" }}>
                  <div className="h-full rounded-full transition-all duration-700 ease-out relative" style={{ width: `${currentStep >= 4 ? 100 : (currentStep + 1) * 25}%`, background: "linear-gradient(90deg, #10B981, #34D399)", boxShadow: "0 0 16px rgba(16,185,129,0.4), 0 0 4px rgba(16,185,129,0.6)" }}>
                    <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
                  </div>
                </div>
                <p className="text-[10px] text-white/25 mt-2 font-medium tracking-wide uppercase">Progreso del pedido</p>
              </div>
            )}
          </div>
        </div>

        {(currentStep >= 2 || pedido.repartidor_id) && !isEntregado && (
          <div className="mb-6 animate-fade-up">
            <div className="rounded-[24px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.05)" }}>
              <MapaRepartidorCliente repartidorId={pedido.repartidor_id || undefined} negocioLat={pedido.negocios?.latitud} negocioLng={pedido.negocios?.longitud} negocioNombre={pedido.negocios?.nombre} />
            </div>
          </div>
        )}

        {pedido.repartidores && !isEntregado && (
          <div className="relative mb-6 rounded-3xl overflow-hidden animate-fade-up" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(30,41,59,0.7))", border: "1px solid rgba(16,185,129,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent)" }} />
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))", border: "1px solid rgba(16,185,129,0.15)", boxShadow: "0 4px 16px rgba(16,185,129,0.1)" }}>
                    🏍️
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400" style={{ border: "2px solid #1E293B", boxShadow: "0 0 8px rgba(16,185,129,0.5)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-[15px]">{pedido.repartidores.nombre}</p>
                  <p className="text-xs text-white/40 mt-0.5 font-medium">Tu repartidor</p>
                </div>
                <a href={`tel:${pedido.repartidores.telefono}`}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90" style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "white", boxShadow: "0 4px 20px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.2)" }}>
                  <Phone size={18} />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="relative mb-6 rounded-3xl overflow-hidden animate-fade-up" style={{ background: "linear-gradient(160deg, rgba(30,41,59,0.7), rgba(15,23,42,0.9))", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
          <div className="p-6">
            <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px] mb-7">Estado del pedido</h3>
            <div className="relative">
              {steps.map((step, i) => {
                const isComplete = i <= currentStep;
                const isCurrent = i === currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="timeline-step pb-7 last:pb-0 relative">
                    {i < steps.length - 1 && (
                      <div className="timeline-line" style={i < currentStep ? { background: "linear-gradient(180deg, #10B981, #059669)", width: "2px" } : { background: "rgba(255,255,255,0.06)", width: "2px" }} />
                    )}
                    <div className="relative z-10 flex items-center gap-5">
                      <div className="relative">
                        <div className={`timeline-dot ${isComplete ? "completed" : isCurrent ? "active" : ""}`} style={{ width: "20px", height: "20px" }}>
                          {(isComplete || isCurrent) && (
                            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981, #059669)", boxShadow: isCurrent ? "0 0 16px rgba(16,185,129,0.5)" : "0 0 8px rgba(16,185,129,0.2)" }}>
                              {isComplete ? (
                                <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-white" style={{ boxShadow: "0 0 6px rgba(255,255,255,0.5)" }} />
                              )}
                            </div>
                          )}
                        </div>
                        {isCurrent && <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(16,185,129,0.15)" }} />}
                      </div>
                      <div className={`transition-all duration-300 ${isComplete ? "opacity-100" : isCurrent ? "opacity-100" : "opacity-30"}`}>
                        <p className={`font-bold text-[14px] ${isComplete || isCurrent ? "" : "text-white/40"}`} style={(isComplete || isCurrent) ? { background: "linear-gradient(135deg, #10B981, #34D399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } : {}}>
                          {step.label}
                        </p>
                        <p className={`text-xs mt-1 ${isComplete || isCurrent ? "text-white/40" : "text-white/20"}`}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 animate-fade-up">
          <button onClick={() => { window.open(`https://www.google.com/maps/search/?api=1&query=Magdalena`, "_blank"); }}
            className="relative py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-200 overflow-hidden group" style={{ background: "rgba(30,41,59,0.7)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), transparent)" }} />
            <MapPin size={16} className="text-emerald-400 relative" />
            <span className="text-white/70 relative">Ver en mapa</span>
          </button>
          <button onClick={() => router.push(`/cliente/chat/${pedido.codigo}`)}
            className="relative py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-200 overflow-hidden group" style={{ background: "rgba(30,41,59,0.7)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), transparent)" }} />
            <MessageCircle size={16} className="text-emerald-400 relative" />
            <span className="text-white/70 relative">Chat</span>
          </button>
        </div>

        {isEntregado && (
          <button onClick={() => router.push(`/cliente/calificar/${pedido.codigo}`)}
            className="relative w-full mt-6 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all duration-200 overflow-hidden animate-fade-up group" style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "white", boxShadow: "0 8px 32px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.2)" }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(135deg, #34D399, #10B981)" }} />
            <Star size={18} className="relative" />
            <span className="relative">Calificar pedido</span>
          </button>
        )}

        <button onClick={() => router.push("/cliente")} className="w-full mt-7 py-3 text-xs font-medium transition-all duration-200 hover:text-white/40" style={{ color: "rgba(255,255,255,0.2)" }}>
          Volver al inicio
        </button>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}