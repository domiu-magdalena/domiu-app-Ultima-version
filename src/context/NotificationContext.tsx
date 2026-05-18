"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

type Notificacion = {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  referencia_id: string;
  leida: boolean;
  created_at: string;
};

type NotificationContextType = {
  notificaciones: Notificacion[];
  noLeidas: number;
  marcarLeida: (id: string) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  permiso: NotificationPermission | null;
  solicitarPermiso: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType>({
  notificaciones: [],
  noLeidas: 0,
  marcarLeida: async () => {},
  marcarTodasLeidas: async () => {},
  permiso: null,
  solicitarPermiso: async () => {},
});

export function NotificationProvider({ children, usuarioId }: { children: ReactNode; usuarioId?: string }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [permiso, setPermiso] = useState<NotificationPermission | null>(
    typeof Notification !== "undefined" ? Notification.permission : null
  );

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const cargarNotificaciones = useCallback(async () => {
    if (!usuarioId) return;
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("notificaciones_push")
        .select("*")
        .eq("usuario_id", usuarioId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setNotificaciones(data);
    } catch {}
  }, [usuarioId]);

  useEffect(() => {
    cargarNotificaciones();
    if (!usuarioId) return;

    const supabase = getSupabaseClient();
    const canal = supabase
      .channel("notificaciones-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones_push", filter: `usuario_id=eq.${usuarioId}` },
        (payload) => {
          const nueva = payload.new as Notificacion;
          setNotificaciones((prev) => [nueva, ...prev]);
          toast(nueva.titulo, { description: nueva.cuerpo });
          if (permiso === "granted") {
            new Notification(nueva.titulo, { body: nueva.cuerpo });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [usuarioId, cargarNotificaciones, permiso]);

  const marcarLeida = async (id: string) => {
    try {
      const supabase = getSupabaseClient();
      await supabase.from("notificaciones_push").update({ leida: true }).eq("id", id);
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    } catch {}
  };

  const marcarTodasLeidas = async () => {
    if (!usuarioId) return;
    try {
      const supabase = getSupabaseClient();
      await supabase.from("notificaciones_push").update({ leida: true }).eq("usuario_id", usuarioId).eq("leida", false);
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch {}
  };

  const solicitarPermiso = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermiso(result);
  };

  return (
    <NotificationContext.Provider value={{ notificaciones, noLeidas, marcarLeida, marcarTodasLeidas, permiso, solicitarPermiso }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificaciones = () => useContext(NotificationContext);
