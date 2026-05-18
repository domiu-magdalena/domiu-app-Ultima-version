"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, StarHalf, MessageCircle, Bike, Store, ThumbsUp } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type PedidoData = {
  id: string;
  codigo: string;
  repartidor_id: string;
  negocio_id: string;
  cliente_telefono: string;
  calificado_repartidor: boolean;
  calificado_negocio: boolean;
  negocios: { nombre: string } | null;
};

type Producto = {
  id: string;
  producto_id: string;
  producto_nombre: string;
};

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
    getSupabaseClient()
      .from("pedidos_cliente")
      .select("*, negocios(nombre)")
      .eq("codigo", codigo)
      .single()
      .then(({ data }) => {
        if (data) {
          setPedido(data);
          setStep(data.calificado_repartidor ? "negocio" : "repartidor");
        }
      });
    if (data?.id) {
      getSupabaseClient()
        .from("detalle_pedido_cliente")
        .select("id, producto_id, producto_nombre")
        .eq("pedido_id", data.id)
        .then(({ data: prods }) => { if (prods) setProductos(prods); });
    }
  }, [codigo]);

  const guardarCalificacion = async (tipo: string, idRef: string | null, punt: number) => {
    if (!pedido || punt === 0) return;
    const payload: any = {
      tipo,
      cliente_telefono: pedido.cliente_telefono,
      puntuacion: punt,
      comentario: comentario || null,
    };
    if (tipo === "repartidor") payload.repartidor_id = pedido.repartidor_id;
    if (tipo === "negocio") payload.negocio_id = pedido.negocio_id;
    if (tipo === "producto" && idRef) payload.producto_id = idRef;
    payload.pedido_id = pedido.id;

    await getSupabaseClient().from("calificaciones").insert(payload);
  };

  const siguiente = async () => {
    if (!pedido) return;
    setSaving(true);

    if (step === "repartidor" && puntRepartidor > 0) {
      await guardarCalificacion("repartidor", null, puntRepartidor);
      await getSupabaseClient().from("pedidos_cliente").update({ calificado_repartidor: true }).eq("id", pedido.id);
      setStep("negocio");
    } else if (step === "negocio" && puntNegocio > 0) {
      await guardarCalificacion("negocio", null, puntNegocio);
      await getSupabaseClient().from("pedidos_cliente").update({ calificado_negocio: true }).eq("id", pedido.id);
      setStep("productos");
    } else if (step === "productos") {
      for (const p of productos) {
        if (puntProductos[p.id]) {
          await guardarCalificacion("producto", p.producto_id, puntProductos[p.id]);
        }
      }
      setStep("fin");
    }

    setSaving(false);
  };

  const Stars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(v => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className="p-1 transition-transform active:scale-110">
          <Star size={36} className={v <= value ? "text-domi-yellow fill-domi-yellow" : "text-white/20"} />
        </button>
      ))}
    </div>
  );

  if (!pedido) {
    return (
      <div className="flex items-center justify-center h-screen bg-domi-black">
        <div className="w-8 h-8 border-2 border-domi-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (step === "fin") {
    return (
      <div className="min-h-screen bg-domi-black text-white flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-full bg-domi-yellow/20 flex items-center justify-center mb-6">
          <ThumbsUp size={48} className="text-domi-yellow" />
        </div>
        <h1 className="text-2xl font-black mb-2">¡Gracias por calificar!</h1>
        <p className="text-white/50 text-sm mb-8 text-center">Tu opinión nos ayuda a mejorar</p>
        <button onClick={() => router.push("/cliente")} className="w-full max-w-xs py-4 rounded-2xl bg-domi-yellow text-domi-black font-bold">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-domi-black text-white">
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-domi-dark flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Calificar</h1>
        </div>

        {step === "repartidor" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-domi-yellow/20 flex items-center justify-center mx-auto mb-4">
              <Bike size={40} className="text-domi-yellow" />
            </div>
            <h2 className="text-xl font-bold mb-2">Califica al repartidor</h2>
            <p className="text-white/50 text-sm mb-6">¿Cómo fue el servicio de domicilio?</p>
            <Stars value={puntRepartidor} onChange={setPuntRepartidor} />
          </div>
        )}

        {step === "negocio" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-domi-yellow/20 flex items-center justify-center mx-auto mb-4">
              <Store size={40} className="text-domi-yellow" />
            </div>
            <h2 className="text-xl font-bold mb-2">Califica al negocio</h2>
            <p className="text-white/50 text-sm mb-6">{pedido.negocios?.nombre || "Negocio"}</p>
            <Stars value={puntNegocio} onChange={setPuntNegocio} />
          </div>
        )}

        {step === "productos" && productos.length > 0 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-domi-yellow/20 flex items-center justify-center mx-auto mb-4">
                <Star size={40} className="text-domi-yellow" />
              </div>
              <h2 className="text-xl font-bold mb-2">Califica los productos</h2>
            </div>
            <div className="space-y-4">
              {productos.map(p => (
                <div key={p.id} className="bg-domi-dark rounded-2xl p-4">
                  <p className="font-semibold text-sm mb-3">{p.producto_nombre}</p>
                  <Stars value={puntProductos[p.id] || 0} onChange={v => setPuntProductos(prev => ({ ...prev, [p.id]: v }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        <div className="mt-6 mb-6">
          <textarea
            placeholder="Escribe un comentario (opcional)..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            rows={3}
            className="w-full bg-domi-dark border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-white/30 outline-none focus:border-domi-yellow/50 resize-none"
          />
        </div>

        <button
          onClick={siguiente}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-domi-yellow text-domi-black font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {saving ? "Guardando..." : step === "productos" ? "Finalizar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
