"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, CookingPot, UserCheck, Bike, Home, Star, MessageCircle, MapPin, Clock } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import MapaRepartidorCliente from "@/components/MapaRepartidorCliente";

type Pedido = {
  id: string;
  codigo: string;
  cliente_nombre: string;
  estado: string;
  total: number;
  created_at: string;
  repartidor_id: string | null;
  negocios: { nombre: string; logo: string; latitud?: number; longitud?: number } | null;
};

const steps = [
  { key: "recibido", label: "Pedido recibido", icon: Package, desc: "Hemos recibido tu pedido" },
  { key: "preparacion", label: "En preparación", icon: CookingPot, desc: "El negocio está preparando tu pedido" },
  { key: "asignado", label: "Repartidor asignado", icon: UserCheck, desc: "Un repartidor está yendo al negocio" },
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
    const fetchPedido = () => {
      getSupabaseClient()
        .from("pedidos_cliente")
        .select("*, negocios(nombre, logo, latitud, longitud)")
        .eq("codigo", id)
        .single()
        .then(({ data }) => {
          if (data) {
            setPedido(data);
            setCurrentStep(stepIndex[data.estado] ?? -1);
          }
        });
    };
    fetchPedido();
    const interval = setInterval(fetchPedido, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (!pedido) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--rappi-dark)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--rappi-yellow)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--rappi-text-muted)]">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  const isEntregado = pedido.estado === "entregado";

  return (
    <div className="min-h-screen bg-[var(--rappi-dark)] text-[var(--rappi-text)]">
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-[var(--rappi-gray)] flex items-center justify-center hover:bg-[var(--rappi-gray)]/80 transition-all">
            <ArrowLeft size={18} className="text-[var(--rappi-text)]" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Seguimiento</h1>
            <p className="text-xs text-[var(--rappi-text-muted)] font-medium">Pedido #{pedido.codigo}</p>
          </div>
        </div>

        {/* Status Hero */}
        <div className="rappi-card p-6 mb-5 text-center bg-gradient-to-b from-[var(--rappi-yellow)]/5 to-transparent">
          {isEntregado ? (
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3 animate-bounce-in">
              <Home size={28} className="text-green-400" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--rappi-yellow)]/15 flex items-center justify-center mx-auto mb-3 animate-pulse-dot">
              <Bike size={28} className="text-[var(--rappi-yellow)]" />
            </div>
          )}
          <h2 className="text-lg font-bold mb-1">
            {isEntregado ? "¡Pedido entregado!" : pedido.estado === "camino" ? "Tu pedido está en camino" : "Estamos procesando tu pedido"}
          </h2>
          <p className="text-sm text-[var(--rappi-text-muted)]">{pedido.negocios?.nombre}</p>
          {currentStep >= 0 && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-[var(--rappi-yellow)]/10 border border-[var(--rappi-yellow)]/20">
              <Clock size={14} className="text-[var(--rappi-yellow)]" />
              <span className="text-xs font-semibold text-[var(--rappi-yellow)]">{stepLabels[pedido.estado]}</span>
            </div>
          )}
        </div>

        {/* Live GPS Map */}
        {(currentStep >= 2 || pedido.repartidor_id) && !isEntregado && (
          <div className="mb-5 rounded-2xl overflow-hidden border border-white/5">
            <MapaRepartidorCliente repartidorId={pedido.repartidor_id || undefined} negocioLat={pedido.negocios?.latitud} negocioLng={pedido.negocios?.longitud} negocioNombre={pedido.negocios?.nombre} />
          </div>
        )}

        {/* Timeline */}
        <div className="rappi-card p-5 mb-5">
          <h3 className="text-xs font-semibold text-[var(--rappi-text-muted)] uppercase tracking-widest mb-5">Estado del pedido</h3>
          <div className="relative">
            {steps.map((step, i) => {
              const isComplete = i <= currentStep;
              const isCurrent = i === currentStep;
              const Icon = step.icon;
              return (
                <div key={step.key} className="timeline-step pb-6 last:pb-0 relative">
                  {i < steps.length - 1 && (
                    <div className={`timeline-line ml-[14px] ${i < currentStep ? "!bg-[var(--rappi-green)]" : ""}`} />
                  )}
                  <div className="relative z-10 flex items-center gap-4">
                    <div className={`timeline-dot ${isComplete ? "completed" : isCurrent ? "active" : ""}`}>
                      {(isComplete || isCurrent) && (
                        <div className={`w-full h-full rounded-full flex items-center justify-center ${isComplete ? "bg-[var(--rappi-green)]" : "bg-[var(--rappi-yellow)]"}`}>
                          {isComplete ? (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-[var(--rappi-black)]" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`transition-all duration-300 ${isComplete ? "opacity-100" : isCurrent ? "opacity-100" : "opacity-40"}`}>
                      <p className={`font-semibold text-sm ${isComplete ? "text-[var(--rappi-green)]" : isCurrent ? "text-[var(--rappi-yellow)]" : "text-[var(--rappi-text)]"}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isComplete || isCurrent ? "text-[var(--rappi-text-muted)]" : "text-[var(--rappi-text-muted)]/50"}`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => { window.open(`https://www.google.com/maps/search/?api=1&query=Magdalena`, "_blank"); }}
            className="flex-1 py-4 rounded-2xl bg-[var(--rappi-gray)] border border-white/5 text-[var(--rappi-text)] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-[var(--rappi-gray)]/80">
            <MapPin size={18} className="text-[var(--rappi-yellow)]" />
            Ver en mapa
          </button>
          <button onClick={() => router.push(`/cliente/chat/${pedido.codigo}`)}
            className="flex-1 py-4 rounded-2xl bg-[var(--rappi-gray)] border border-white/5 text-[var(--rappi-text)] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-[var(--rappi-gray)]/80">
            <MessageCircle size={18} className="text-[var(--rappi-yellow)]" />
            Chat
          </button>
        </div>

        {isEntregado && (
          <button onClick={() => router.push(`/cliente/calificar/${pedido.codigo}`)}
            className="rappi-btn w-full mt-3 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-all">
            <Star size={18} />
            Calificar pedido
          </button>
        )}

        <button onClick={() => router.push("/cliente")} className="w-full mt-4 py-3 text-xs text-[var(--rappi-text-muted)]/50 font-medium hover:text-[var(--rappi-text-muted)] transition-colors">
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
