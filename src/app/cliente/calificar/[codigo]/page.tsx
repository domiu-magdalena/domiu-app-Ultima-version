"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, MessageCircle, Bike, Store, ThumbsUp } from "lucide-react";
import { fetchData } from "@/lib/client-data";

type PedidoData = {
  id: string; codigo: string; repartidor_id: string; negocio_id: string;
  cliente_telefono: string; calificado_repartidor: boolean; calificado_negocio: boolean;
  negocios: { nombre: string } | null;
};

type Producto = { id: string; producto_id: string; producto_nombre: string; };

const emojis = ["😡", "😕", "😐", "😊", "🤩"];

export default function CalificarPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const router = useRouter();
  const [pedido, setPedido] = useState<PedidoData | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [step, setStep] = useState<"repartidor" | "negocio" | "productos" | "fin">("repartidor");
  const [puntRepartidor, setPuntRepartidor] = useState(0);
  const [puntNegocio, setPuntNegocio] = useState(0);
  const [puntProductos, setPuntProductos] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!codigo) return;
    (async () => {
      try {
        const data = await fetchData("pedidos_cliente", {
          select: "*, negocios(nombre)",
          filters: [{ method: "eq", column: "codigo", value: codigo }],
          single: true,
        });
        if (data) {
          setPedido(data);
          setStep(data.calificado_repartidor ? "negocio" : "repartidor");
          if (data.id) {
            const prods = await fetchData("detalle_pedido_cliente", {
              select: "id, producto_id, producto_nombre",
              filters: [{ method: "eq", column: "pedido_id", value: data.id }],
            });
            if (prods) setProductos(prods);
          }
        }
      } catch {}
    })();
  }, [codigo]);

  const apiOp = async (table: string, action: string, data: any, id?: string) => {
    await fetch("/api/data", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, action, data, ...(id ? { id } : {}) }),
    });
  };

  const guardarCalificacion = async (tipo: string, idRef: string | null, punt: number) => {
    if (!pedido || punt === 0) return;
    const payload: any = { tipo, cliente_telefono: pedido.cliente_telefono, puntuacion: punt, comentario: comentario || null, pedido_id: pedido.id };
    if (tipo === "repartidor") payload.repartidor_id = pedido.repartidor_id;
    if (tipo === "negocio") payload.negocio_id = pedido.negocio_id;
    if (tipo === "producto" && idRef) payload.producto_id = idRef;
    await apiOp("calificaciones", "insert", payload);
  };

  const siguiente = async () => {
    if (!pedido) return;
    setSaving(true);
    if (step === "repartidor" && puntRepartidor > 0) {
      await guardarCalificacion("repartidor", null, puntRepartidor);
      await apiOp("pedidos_cliente", "update", { calificado_repartidor: true }, pedido.id);
      setStep("negocio");
    } else if (step === "negocio" && puntNegocio > 0) {
      await guardarCalificacion("negocio", null, puntNegocio);
      await apiOp("pedidos_cliente", "update", { calificado_negocio: true }, pedido.id);
      setStep("productos");
    } else if (step === "productos") {
      for (const p of productos) { if (puntProductos[p.id]) await guardarCalificacion("producto", p.producto_id, puntProductos[p.id]); }
      setStep("fin");
    }
    setSaving(false);
  };

  const Stars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-3 justify-center">
      {[1, 2, 3, 4, 5].map(v => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className="p-1.5 transition-all duration-300 active:scale-125 hover:scale-115">
          <Star size={44} className={`transition-all duration-300 ${v <= value ? "drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]" : "text-[#64748B]"}`}
            style={v <= value ? { color: "#10B981", fill: "#10B981", filter: "drop-shadow(0 0 8px rgba(16,185,129,0.4))" } : { opacity: 0.25 }} />
        </button>
      ))}
    </div>
  );

  if (!pedido) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
      <div className="w-12 h-12 border-2 rounded-full animate-spin" style={{ borderColor: "#10B981", borderTopColor: "transparent" }} />
    </div>
  );

  if (step === "fin") {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="w-36 h-36 rounded-[2rem] bg-gradient-to-br from-[#10B981]/30 to-[#10B981]/5 flex items-center justify-center mb-8 shadow-2xl shadow-[#10B981]/20 border border-[#10B981]/20 backdrop-blur-xl">
          <ThumbsUp size={64} className="text-[#10B981] drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
        </div>
        <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-[#10B981] to-emerald-300 bg-clip-text text-transparent">¡Gracias!</h1>
        <p className="text-[#64748B] text-sm mb-10 text-center">Tu opinión nos ayuda a mejorar</p>
        <button onClick={() => router.push("/cliente")} className="w-full max-w-xs text-sm font-bold py-4 rounded-2xl text-white transition-all active:scale-[0.97] shadow-xl shadow-[#10B981]/25" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
          Volver al inicio
        </button>
      </div>
    );
  }

  const currentEmoji = step === "repartidor" ? puntRepartidor : step === "negocio" ? puntNegocio : 0;

  return (
    <div className="min-h-screen bg-[#0F172A] animate-fade-in">
      <div className="px-5 pt-5 pb-8">
        <div className="flex items-center gap-3 mb-8 backdrop-blur-xl">
          <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-[#1E293B]/70 flex items-center justify-center border border-white/[0.06] active:scale-90 transition-all backdrop-blur-xl">
            <ArrowLeft size={18} className="text-[#64748B]" />
          </button>
          <h1 className="text-xl font-bold text-[#F8FAFC]">Calificar</h1>
        </div>

        <div className="rounded-3xl p-8 text-center animate-fade-up bg-[#1E293B]/70 border border-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/20">
          {step === "repartidor" && (
            <>
              <div className="w-28 h-28 rounded-[1.5rem] bg-gradient-to-br from-[#10B981]/25 to-[#10B981]/5 flex items-center justify-center mx-auto mb-6 border border-[#10B981]/15 shadow-lg shadow-[#10B981]/10">
                <Bike size={52} className="text-[#10B981] drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-[#F8FAFC]">Califica al repartidor</h2>
              <p className="text-[#64748B] text-sm mb-6">¿Cómo fue el servicio?</p>
              {currentEmoji > 0 && <div className="text-6xl mb-5 animate-scale-in drop-shadow-lg">{emojis[currentEmoji - 1]}</div>}
              <Stars value={puntRepartidor} onChange={setPuntRepartidor} />
            </>
          )}

          {step === "negocio" && (
            <>
              <div className="w-28 h-28 rounded-[1.5rem] bg-gradient-to-br from-[#10B981]/25 to-[#10B981]/5 flex items-center justify-center mx-auto mb-6 border border-[#10B981]/15 shadow-lg shadow-[#10B981]/10">
                <Store size={52} className="text-[#10B981] drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-[#F8FAFC]">Califica al negocio</h2>
              <p className="text-[#64748B] text-sm mb-1">{pedido.negocios?.nombre || "Negocio"}</p>
              {currentEmoji > 0 && <div className="text-6xl mb-5 animate-scale-in drop-shadow-lg">{emojis[currentEmoji - 1]}</div>}
              <Stars value={puntNegocio} onChange={setPuntNegocio} />
            </>
          )}

          {step === "productos" && productos.length > 0 && (
            <>
              <div className="w-28 h-28 rounded-[1.5rem] bg-gradient-to-br from-[#10B981]/25 to-[#10B981]/5 flex items-center justify-center mx-auto mb-6 border border-[#10B981]/15 shadow-lg shadow-[#10B981]/10">
                <Star size={52} className="text-[#10B981] drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
              </div>
              <h2 className="text-2xl font-black mb-6 text-[#F8FAFC]">Califica los productos</h2>
              <div className="space-y-5">
                {productos.map(p => (
                  <div key={p.id} className="p-5 rounded-2xl bg-[#0F172A]/60 border border-white/[0.06] backdrop-blur-sm">
                    <p className="font-bold text-sm mb-3 text-[#F8FAFC]">{p.producto_nombre}</p>
                    <Stars value={puntProductos[p.id] || 0} onChange={v => setPuntProductos(prev => ({ ...prev, [p.id]: v }))} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 mb-6 animate-fade-up">
          <div className="rounded-2xl p-5 bg-[#1E293B]/70 border border-white/[0.06] backdrop-blur-xl">
            <MessageCircle size={16} className="text-[#64748B] mb-2" />
            <textarea placeholder="Escribe un comentario (opcional)..." value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
              className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder-[#64748B]/60 outline-none resize-none" />
          </div>
        </div>

        <button onClick={siguiente} disabled={saving || (step !== "productos" && ((step === "repartidor" && puntRepartidor === 0) || (step === "negocio" && puntNegocio === 0)))}
          className="w-full text-sm font-bold py-4 rounded-2xl text-white disabled:opacity-40 active:scale-[0.98] transition-all shadow-xl shadow-[#10B981]/20 backdrop-blur-xl" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </span>
          ) : step === "productos" ? "Finalizar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
