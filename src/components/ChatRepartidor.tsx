"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Send, ArrowLeft, MessageCircle } from "lucide-react";

type Mensaje = {
  id: string;
  remitente_tipo: string;
  remitente_nombre: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
};

type PedidoChat = {
  id: string;
  codigo: string;
  cliente_nombre: string;
  cliente_telefono: string;
  negocios: { nombre: string } | null;
};

interface Props {
  riderId: string;
  riderNombre: string;
}

export default function ChatRepartidor({ riderId, riderNombre }: Props) {
  const sb = getSupabaseClient();
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
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    const { data: rep } = await sb.from("repartidores").select("id").eq("id", riderId).single();
    if (!rep) return;

    const { data } = await sb
      .from("pedidos_cliente")
      .select("*, negocios(nombre)")
      .eq("repartidor_id", riderId)
      .neq("estado", "entregado")
      .order("created_at", { ascending: false });

    if (data) setPedidos(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!pedidoActivo) return;

    const loadMensajes = async () => {
      const { data } = await sb
        .from("mensajes_chat")
        .select("*")
        .eq("pedido_cliente_id", pedidoActivo.id)
        .order("created_at", { ascending: true });
      if (data) setMensajes(data);
    };
    loadMensajes();

    const channel = sb
      .channel(`chat_rider_${pedidoActivo.id}`)
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
    if (!texto.trim() || !pedidoActivo) return;
    const msg = texto.trim();
    setTexto("");

    await sb.from("mensajes_chat").insert({
      pedido_cliente_id: pedidoActivo.id,
      remitente_tipo: "repartidor",
      remitente_nombre: riderNombre,
      mensaje: msg,
    });
  };

  if (pedidoActivo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
          <button onClick={() => setPedidoActivo(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <ArrowLeft size={20} color="#475569" />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>#{pedidoActivo.codigo}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{pedidoActivo.cliente_nombre}</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mensajes.map(m => (
              <div key={m.id} style={{
                display: "flex",
                justifyContent: m.remitente_tipo === "repartidor" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: 16,
                  background: m.remitente_tipo === "repartidor" ? "#facc15" : "#fff",
                  color: m.remitente_tipo === "repartidor" ? "#1e293b" : "#1e293b",
                  border: m.remitente_tipo !== "repartidor" ? "1px solid #e2e8f0" : "none",
                  borderBottomRightRadius: m.remitente_tipo === "repartidor" ? 4 : 16,
                  borderBottomLeftRadius: m.remitente_tipo !== "repartidor" ? 4 : 16,
                }}>
                  {m.remitente_tipo !== "repartidor" && (
                    <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#facc15" }}>{m.remitente_nombre}</p>
                  )}
                  <p style={{ margin: 0, fontSize: 13 }}>{m.mensaje}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: m.remitente_tipo === "repartidor" ? "#9ca3af" : "#9ca3af", textAlign: "right" }}>
                    {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: "#fff", borderTop: "1px solid #e2e8f0" }}>
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && enviarMensaje()}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0",
              fontSize: 13, outline: "none", background: "#f8fafc",
            }}
          />
          <button
            onClick={enviarMensaje}
            disabled={!texto.trim()}
            style={{
              padding: "10px 16px", borderRadius: 10, border: "none",
              background: !texto.trim() ? "#e2e8f0" : "#facc15",
              cursor: !texto.trim() ? "default" : "pointer",
            }}
          >
            <Send size={18} color={!texto.trim() ? "#94a3b8" : "#1e293b"} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
        <MessageCircle size={20} color="#facc15" /> Chat con clientes
      </h2>

      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Cargando pedidos...</p>
      ) : pedidos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" }}>
          <MessageCircle size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>No hay chats activos</p>
          <p style={{ color: "#cbd5e1", fontSize: 12 }}>Los chats aparecerán cuando tengas pedidos asignados</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pedidos.map(p => (
            <button
              key={p.id}
              onClick={() => setPedidoActivo(p)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: 14,
                background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
                cursor: "pointer", width: "100%", textAlign: "left",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessageCircle size={18} color="#f59e0b" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b" }}>#{p.codigo}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{p.cliente_nombre} - {p.negocios?.nombre}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
