"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Phone, User } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Mensaje = {
  id: string;
  remitente_tipo: string;
  remitente_nombre: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
};

export default function ChatPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [negocioNombre, setNegocioNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const iniciarChat = async () => {
    if (!telefono.trim() || !nombre.trim()) return;
    setLoading(true);

    const { data: pedido } = await getSupabaseClient()
      .from("pedidos_cliente")
      .select("id, negocios(nombre)")
      .eq("codigo", codigo)
      .single();

    if (pedido) {
      setPedidoId(pedido.id);
      setNegocioNombre((pedido.negocios as any)?.nombre || "Negocio");
    }
    setShowPrompt(false);
    setLoading(false);
  };

  useEffect(() => {
    if (!pedidoId) return;

    const sb = getSupabaseClient();

    const loadMensajes = async () => {
      const { data } = await sb
        .from("mensajes_chat")
        .select("*")
        .eq("pedido_cliente_id", pedidoId)
        .order("created_at", { ascending: true });
      if (data) setMensajes(data);
    };
    loadMensajes();

    const channel = sb
      .channel(`chat_${pedidoId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mensajes_chat",
        filter: `pedido_cliente_id=eq.${pedidoId}`,
      }, (payload: any) => {
        setMensajes(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [pedidoId]);

  const enviarMensaje = async () => {
    if (!texto.trim() || !pedidoId) return;
    const msg = texto.trim();
    setTexto("");

    await getSupabaseClient().from("mensajes_chat").insert({
      pedido_cliente_id: pedidoId,
      remitente_tipo: "cliente",
      remitente_nombre: nombre,
      remitente_telefono: telefono,
      mensaje: msg,
    });
  };

  if (showPrompt) {
    return (
      <div className="min-h-screen bg-domi-black text-white">
        <div className="px-4 pt-5 pb-8 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-domi-dark flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold">Chat del pedido</h1>
          </div>
          <p className="text-xs text-white/40 mb-6">Pedido #{codigo}</p>

          <div className="bg-domi-dark rounded-2xl p-6">
            <p className="text-sm font-semibold mb-4">Identifícate para chatear</p>
            <div className="space-y-3">
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-domi-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-domi-yellow/50" />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="tel" placeholder="Tu teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full bg-domi-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-domi-yellow/50" />
              </div>
              <button onClick={iniciarChat} disabled={loading || !nombre || !telefono} className="w-full py-3 rounded-xl bg-domi-yellow text-domi-black font-bold text-sm disabled:opacity-50">
                {loading ? "Cargando..." : "Iniciar chat"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-domi-black text-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-domi-dark border-b border-white/5">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-domi-black flex items-center justify-center shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-bold">{negocioNombre}</h1>
            <p className="text-[10px] text-white/40">#{codigo} - Chat en vivo</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        <div className="space-y-3">
          {mensajes.map(m => (
            <div key={m.id} className={`flex ${m.remitente_tipo === "cliente" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                m.remitente_tipo === "cliente"
                  ? "bg-domi-yellow text-domi-black rounded-br-md"
                  : "bg-domi-dark text-white rounded-bl-md"
              }`}>
                {m.remitente_tipo !== "cliente" && (
                  <p className="text-[10px] font-semibold text-domi-yellow mb-0.5">{m.remitente_nombre}</p>
                )}
                <p className="text-sm">{m.mensaje}</p>
                <p className={`text-[10px] mt-0.5 ${m.remitente_tipo === "cliente" ? "text-domi-black/50" : "text-white/30"}`}>
                  {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-domi-dark border-t border-white/5 p-3">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && enviarMensaje()}
            className="flex-1 bg-domi-black border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/30 outline-none focus:border-domi-yellow/50"
          />
          <button
            onClick={enviarMensaje}
            disabled={!texto.trim()}
            className="w-11 h-11 rounded-xl bg-domi-yellow text-domi-black flex items-center justify-center disabled:opacity-30 shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
