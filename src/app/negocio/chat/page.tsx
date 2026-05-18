"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, MessageCircle, Package, Phone, User } from "lucide-react";
import { useNegocio } from "@/context/negocio/NegocioContext";
import { getSupabaseClient } from "@/lib/supabase";

type Mensaje = {
  id: string;
  remitente_tipo: string;
  remitente_nombre: string;
  remitente_telefono: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
};

type PedidoChat = {
  id: string;
  codigo: string;
  cliente_nombre: string;
  cliente_telefono: string;
  estado: string;
};

export default function NegocioChatPage() {
  const { negocio } = useNegocio();
  const [pedidos, setPedidos] = useState<PedidoChat[]>([]);
  const [pedidoActivo, setPedidoActivo] = useState<PedidoChat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  useEffect(() => {
    if (!negocio?.id) return;
    getSupabaseClient()
      .from("pedidos_cliente")
      .select("id, codigo, cliente_nombre, cliente_telefono, estado")
      .eq("negocio_id", negocio.id)
      .neq("estado", "entregado")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPedidos(data);
        setLoading(false);
      });
  }, [negocio?.id]);

  useEffect(() => {
    if (!pedidoActivo) return;
    const sb = getSupabaseClient();

    sb.from("mensajes_chat")
      .select("*")
      .eq("pedido_cliente_id", pedidoActivo.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMensajes(data); });

    const channel = sb
      .channel(`chat_neg_${pedidoActivo.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mensajes_chat",
        filter: `pedido_cliente_id=eq.${pedidoActivo.id}`,
      }, (payload: any) => {
        setMensajes(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [pedidoActivo]);

  const enviarMensaje = async () => {
    if (!texto.trim() || !pedidoActivo || !negocio) return;
    const msg = texto.trim();
    setTexto("");

    await getSupabaseClient().from("mensajes_chat").insert({
      pedido_cliente_id: pedidoActivo.id,
      remitente_tipo: "negocio",
      remitente_nombre: negocio.nombre,
      mensaje: msg,
    });
  };

  if (pedidoActivo) {
    return (
      <div className="flex flex-col h-[calc(100vh-180px)] bg-domi-black text-white rounded-2xl overflow-hidden border border-white/5">
        <div className="flex items-center gap-3 px-4 py-3 bg-domi-dark border-b border-white/5">
          <button onClick={() => setPedidoActivo(null)} className="w-9 h-9 rounded-full bg-domi-black flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="font-bold text-sm">#{pedidoActivo.codigo}</p>
            <p className="text-xs text-white/50">{pedidoActivo.cliente_nombre}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mensajes.map(m => (
            <div key={m.id} className={`flex ${m.remitente_tipo === "negocio" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                m.remitente_tipo === "negocio"
                  ? "bg-domi-yellow text-domi-black rounded-br-md"
                  : "bg-domi-dark text-white rounded-bl-md"
              }`}>
                {m.remitente_tipo !== "negocio" && (
                  <p className="text-[10px] font-semibold text-domi-yellow mb-0.5">{m.remitente_nombre}</p>
                )}
                <p className="text-sm">{m.mensaje}</p>
                <p className={`text-[10px] mt-0.5 ${m.remitente_tipo === "negocio" ? "text-domi-black/50" : "text-white/30"}`}>
                  {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="bg-domi-dark border-t border-white/5 p-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && enviarMensaje()}
            className="flex-1 bg-domi-black border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/30 outline-none focus:border-domi-yellow/50"
          />
          <button onClick={enviarMensaje} disabled={!texto.trim()}
            className="w-11 h-11 rounded-xl bg-domi-yellow text-domi-black flex items-center justify-center disabled:opacity-30 shrink-0">
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
        <MessageCircle size={22} className="text-domi-yellow" /> Chat con clientes
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-domi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-domi-dark rounded-2xl p-12 text-center">
          <MessageCircle size={48} className="mx-auto text-white/20 mb-3" />
          <p className="text-white/50 text-sm font-medium">No hay chats activos</p>
          <p className="text-white/30 text-xs mt-1">Los chats aparecerán cuando tengas pedidos pendientes</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pedidos.map(p => (
            <button key={p.id} onClick={() => setPedidoActivo(p)}
              className="bg-domi-dark rounded-2xl p-4 text-left hover:bg-white/5 transition-all active:scale-[0.98] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-domi-yellow/20 flex items-center justify-center shrink-0">
                <Package size={18} className="text-domi-yellow" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">#{p.codigo}</p>
                <p className="text-xs text-white/50 truncate">{p.cliente_nombre}</p>
              </div>
              <span className="text-xs text-white/30">{p.estado}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
