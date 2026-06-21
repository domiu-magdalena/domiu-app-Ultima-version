"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type Mensaje = {
  id: string; remitente_tipo: string; remitente_nombre: string;
  mensaje: string; leido: boolean; created_at: string;
};

export default function ChatPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const router = useRouter();
  const { user, initialized } = useAuth();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [negocioNombre, setNegocioNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes]);

  useEffect(() => {
    if (!initialized || !user) return;
    getSupabaseClient()
      .from("profiles")
      .select("nombre, telefono")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nombre && data?.telefono) {
          setNombre(data.nombre);
          setTelefono(data.telefono);
          iniciarChat(data.nombre, data.telefono);
        }
      });
  }, [initialized, user]);

  const iniciarChat = async (nom?: string, tel?: string) => {
    const n = nom || nombre;
    const t = tel || telefono;
    if (!t.trim() || !n.trim()) return;
    setLoading(true);
    const { data: pedido } = await getSupabaseClient()
      .from("pedidos_cliente")
      .select("id, negocios(nombre)")
      .eq("codigo", codigo)
      .single();
    if (pedido) { setPedidoId(pedido.id); setNegocioNombre((pedido.negocios as any)?.nombre || "Negocio"); }
    setShowPrompt(false);
    setLoading(false);
  };

  useEffect(() => {
    if (!pedidoId) return;
    const sb = getSupabaseClient();
    const loadMensajes = async () => {
      const { data } = await sb.from("mensajes_chat").select("*").eq("pedido_cliente_id", pedidoId).order("created_at", { ascending: true });
      if (data) setMensajes(data);
    };
    loadMensajes();
    const channel = sb.channel(`chat_${pedidoId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes_chat", filter: `pedido_cliente_id=eq.${pedidoId}` },
        (payload: any) => { setMensajes(prev => [...prev, payload.new]); })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [pedidoId]);

  const enviarMensaje = async () => {
    if (!texto.trim() || !pedidoId) return;
    const msg = texto.trim();
    setTexto("");
    await getSupabaseClient().from("mensajes_chat").insert({
      pedido_cliente_id: pedidoId, remitente_tipo: "cliente", remitente_nombre: nombre, remitente_telefono: telefono, mensaje: msg,
    });
  };

  if (showPrompt) {
    return (
      <div className="min-h-screen bg-[#0F172A] animate-fade-in">
        <div className="px-5 pt-5 pb-8">
          <div className="flex items-center gap-3 mb-6 backdrop-blur-xl">
            <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-[#1E293B]/70 flex items-center justify-center border border-white/[0.06] active:scale-90 transition-all backdrop-blur-xl">
              <ArrowLeft size={18} className="text-[#64748B]" />
            </button>
            <h1 className="text-xl font-bold text-[#F8FAFC]">Chat del pedido</h1>
          </div>
          <p className="text-xs text-[#64748B] mb-6">Pedido #{codigo}</p>
          <div className="rounded-3xl p-7 animate-fade-up bg-[#1E293B]/70 border border-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10B981]/25 to-[#10B981]/5 flex items-center justify-center border border-[#10B981]/15 shadow-lg shadow-[#10B981]/10">
                <MessageCircle size={24} className="text-[#10B981] drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#F8FAFC]">Identifícate para chatear</p>
                <p className="text-xs text-[#64748B]">Con el negocio y repartidor</p>
              </div>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="input-field" />
              <input type="tel" placeholder="Tu teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} className="input-field" />
              <button onClick={() => iniciarChat()} disabled={loading || !nombre || !telefono}
                className="w-full text-sm font-bold py-4 rounded-2xl text-white disabled:opacity-40 active:scale-[0.98] transition-all shadow-xl shadow-[#10B981]/20" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                {loading ? "Cargando..." : "Iniciar chat"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col animate-fade-in">
      <div className="px-5 pt-4 pb-3 border-b border-white/[0.06] backdrop-blur-xl bg-[#0F172A]/80">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-[#1E293B]/70 flex items-center justify-center shrink-0 border border-white/[0.06] active:scale-90 transition-all backdrop-blur-xl">
            <ArrowLeft size={18} className="text-[#64748B]" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10B981]/25 to-[#10B981]/5 flex items-center justify-center font-bold shrink-0 border border-[#10B981]/15 text-[#10B981] text-sm">
            {negocioNombre[0] || "?"}
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#F8FAFC]">{negocioNombre}</h1>
            <p className="text-[10px] text-[#64748B]">#{codigo} — Chat en vivo</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-3 max-w-lg mx-auto">
          {mensajes.map(m => (
            <div key={m.id} className={`flex ${m.remitente_tipo === "cliente" ? "justify-end" : "justify-start"} animate-fade-up`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.remitente_tipo === "cliente"
                  ? "text-white rounded-br-md shadow-lg shadow-[#10B981]/15"
                  : "rounded-bl-md bg-[#1E293B]/70 border border-white/[0.06] backdrop-blur-xl text-[#F8FAFC]"
              }`} style={m.remitente_tipo === "cliente" ? { background: "linear-gradient(135deg, #10B981, #059669)" } : {}}>
                {m.remitente_tipo !== "cliente" && (
                  <p className="text-[10px] font-bold mb-0.5 text-[#10B981]">{m.remitente_nombre}</p>
                )}
                <p className="text-sm">{m.mensaje}</p>
                <p className={`text-[9px] mt-1 text-right ${m.remitente_tipo === "cliente" ? "text-white/50" : "text-[#64748B]/60"}`}>
                  {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {mensajes.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#1E293B]/50 border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={28} className="text-[#64748B]/30" />
              </div>
              <p className="text-sm text-[#64748B]">No hay mensajes aún</p>
              <p className="text-xs text-[#64748B]/50 mt-1">Escribe algo para iniciar la conversación</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-white/[0.06] p-4 backdrop-blur-xl bg-[#0F172A]/80">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <input type="text" placeholder="Escribe un mensaje..." value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && enviarMensaje()}
            className="flex-1 h-12 rounded-2xl bg-[#1E293B]/70 border border-white/[0.06] px-4 text-sm text-[#F8FAFC] placeholder-[#64748B]/50 outline-none focus:border-[#10B981]/30 transition-colors backdrop-blur-xl" />
          <button onClick={enviarMensaje} disabled={!texto.trim()}
            className="w-12 h-12 rounded-2xl text-white flex items-center justify-center disabled:opacity-30 shrink-0 transition-all active:scale-90 shadow-xl shadow-[#10B981]/25" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
