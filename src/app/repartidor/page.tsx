"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  Home, ListOrdered, MapPin, DollarSign, User, Phone,
  Copy, MessageCircle, AlertTriangle, LogOut, Check,
  Clock, Package, TrendingUp, Wallet, Navigation,
  ChevronRight, Shield, Truck, FileText, Store, Bike, Menu, X, Star,
  Settings, Camera, Save
} from "lucide-react";
import RiderMarketplace from "@/components/RiderMarketplace";
import ChatRepartidor from "@/components/ChatRepartidor";
import MapView from "@/components/repartidor/MapView";

/* ======================== UTILIDADES ======================== */
function fmt(v: number) { return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v || 0); }
function fechaCorta(f: string) { return new Date(f).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
const EMPRESA_PHONE = "3113748405";

type TabType = "inicio" | "pedidos" | "mapa" | "chat" | "perfil";
type PerfilSubtab = "info" | "liquidacion" | "gps";

/* ======================== COMPONENTE ======================== */
export default function RiderAppPage() {
  const { user, profile, initialized, logout } = useAuth();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#10B981]/20">D</div>
          <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user || profile?.rol !== "repartidor") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] gap-4 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center">
          <Shield size={32} className="text-[#EF4444]" />
        </div>
        <p className="text-[#EF4444] text-sm font-semibold">Acceso no autorizado</p>
        <p className="text-[#64748B] text-xs">Rol: {profile?.rol || "sin perfil"}</p>
        <a href="/login" className="text-[#10B981] text-sm font-semibold hover:text-[#34d399] transition-colors">Volver al login</a>
      </div>
    );
  }

  return <RiderAppContent user={user} profile={profile} logout={logout} />;
}

function RiderAppContent({ user, profile, logout }: { user: any; profile: any; logout: () => void }) {
  const sb = getSupabaseClient();
  const [tab, setTab] = useState<TabType>("inicio");
  const [perfilSubtab, setPerfilSubtab] = useState<PerfilSubtab>("info");
  const [riderData, setRiderData] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pcPedidos, setPcPedidos] = useState<any[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [estadoRider, setEstadoRider] = useState("No disponible");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"ok" | "err">("ok");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [activeTurnoId, setActiveTurnoId] = useState<string | null>(null);
  const subRef = useRef<any>(null);

  // InDriver: domicilios disponibles
  const [domiciliosDisponibles, setDomiciliosDisponibles] = useState<any[]>([]);
  const [misDomicilios, setMisDomicilios] = useState<any[]>([]);
  const [domiLoading, setDomiLoading] = useState(false);
  const [aceptandoId, setAceptandoId] = useState<string | null>(null);
  const [alarmaActiva, setAlarmaActiva] = useState(false);
  const alarmaIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmaSilenciadaRef = useRef(false);
  const [rechazados, setRechazados] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("domi_rechazados") || "[]"); } catch { return []; }
  });
  const [domiNotif, setDomiNotif] = useState<any>(null);

  function getRechazados(): string[] {
    try { return JSON.parse(localStorage.getItem("domi_rechazados") || "[]"); } catch { return []; }
  }
  function guardarRechazados(lista: string[]) {
    localStorage.setItem("domi_rechazados", JSON.stringify(lista));
    setRechazados(lista);
  }
  function rechazarDomicilio(domicilioId: string) {
    const r = getRechazados();
    if (!r.includes(domicilioId)) {
      r.push(domicilioId);
      guardarRechazados(r);
    }
    detenerAlarma();
    setDomiNotif(null);
    loadDomicilios();
  }

  // GPS state
  const [gpsActivo, setGpsActivo] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"esperando" | "activo" | "detenido" | "error">("esperando");
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const gpsWatchRef = useRef<number | null>(null);

  // Edit profile
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNom, setEditNom] = useState("");
  const [editTel, setEditTel] = useState("");
  const [editDoc, setEditDoc] = useState("");
  const [editVeh, setEditVeh] = useState("");
  const [editPla, setEditPla] = useState("");
  const [editFoto, setEditFoto] = useState<string | null>(null);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Registrar Service Worker, suscribir push, solicitar permisos
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      if (Notification.permission !== "granted") return;
      reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BFh0n5qxJo1oA0MADsQEOODyEkNan-QvFB5UgfhzGu0GyjkR30Mb1lTGShcAPJCafjZHwEt4nirMCzeGr_pACMQ",
      }).then((sub) => {
        if (!sub) return;
        fetch("/api/push/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            repartidor_id: riderData?.id,
          }),
        }).catch(() => {});
      }).catch((e) => console.log("Push subscribe error:", e));
    }).catch((e) => console.log("SW error:", e));
  }, [riderData?.id]);

  function enviarNotificacion(titulo: string, cuerpo: string, domicilioId?: string) {
    setToast(cuerpo);
    setToastType("ok");
    setTimeout(() => setToast(""), 5000);
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification(titulo, {
          body: cuerpo,
          tag: "domi-alarma",
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: { domicilioId },
          actions: domicilioId ? [
            { action: "aceptar", title: "Aceptar" },
            { action: "rechazar", title: "Rechazar" },
          ] : [],
        });
        n.onclick = () => {
          if (domicilioId) {
            window.focus();
            const params = new URLSearchParams(window.location.search);
            if (!params.get("aceptar")) {
              window.location.href = "/repartidor?aceptar=" + domicilioId;
            }
          }
        };
      } catch (e) {}
    }
  }

  async function pitidoAlarma() {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      [880, 1100].forEach((freq, i) => {
        setTimeout(() => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.value = 0.4;
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } catch (e) {}
        }, i * 180);
      });
    } catch (e) {}
  }

  function iniciarAlarma() {
    if (alarmaIntervalRef.current) return;
    if (alarmaSilenciadaRef.current) return;
    pitidoAlarma();
    alarmaIntervalRef.current = setInterval(pitidoAlarma, 700);
    setAlarmaActiva(true);
  }

  function detenerAlarma() {
    if (alarmaIntervalRef.current) {
      clearInterval(alarmaIntervalRef.current);
      alarmaIntervalRef.current = null;
    }
    setAlarmaActiva(false);
  }

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setCurrentDate(p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear());
      setCurrentTime(p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()));
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const ok = (m: string) => { setToast(m); setToastType("ok"); setTimeout(() => setToast(""), 3000); };
  const fail = (m: string) => { setToast(m); setToastType("err"); setTimeout(() => setToast(""), 5000); };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      let { data: rider, error: riderError } = await sb.from("repartidores").select("*").eq("user_id", user.id).single();
      if (riderError) {
        const { data: newRider } = await sb.from("repartidores").insert({
          user_id: user.id, nombre: profile?.nombre || user.email || "Repartidor", estado: "No disponible",
        }).select().single();
        rider = newRider;
      }
      if (rider) {
        setRiderData(rider);
        setEstadoRider(rider.estado || "No disponible");

        // Obtener turno activo
        const { data: turnosActivos } = await sb.from("turnos").select("id").eq("activo", true).limit(1);
        const turnoId = turnosActivos?.[0]?.id || null;
        setActiveTurnoId(turnoId);

        // Filtrar pedidos por turno activo
        const pedsQuery = sb.from("pedidos").select("*").eq("repartidor_id", rider.id);
        const pedsFinal = turnoId ? pedsQuery.eq("turno_id", turnoId) : pedsQuery;
        const { data: peds } = await pedsFinal.order("created_at", { ascending: false });
        setPedidos(peds || []);

        // Cargar pedidos_cliente asignados (InDriver)
        const { data: pc } = await sb
          .from("pedidos_cliente")
          .select("id, codigo, cliente_nombre, cliente_telefono, cliente_direccion, total, domicilio, estado, created_at, nota")
          .eq("repartidor_id", rider.id)
          .order("created_at", { ascending: false });
        setPcPedidos(pc || []);
      }
      const { data: locs } = await sb.from("locales").select("*");
      setLocales(locs || []);
    } catch (e: any) { console.error(e); setLoadError(e?.message || "Error cargando datos"); }
    finally { setLoading(false); }
  }, [user]);

  const loadDomicilios = useCallback(async () => {
    try {
      const [dispRes, misRes] = await Promise.all([
        fetch("/api/domicilios/disponibles"),
        riderData?.id ? fetch(`/api/domicilios/disponibles?repartidor_id=${riderData.id}&mis_aceptados=true`) : Promise.resolve(null),
      ]);
      const disponibles = await dispRes.json();
      if (Array.isArray(disponibles)) {
        setDomiciliosDisponibles(disponibles);
        const rech = getRechazados();
        const noRechazados = disponibles.filter((d: any) => !rech.includes(d.id));
        if (noRechazados.length > 0) {
          setDomiNotif(noRechazados[0]);
          iniciarAlarma();
        } else {
          setDomiNotif(null);
          detenerAlarma();
        }
      }
      if (misRes) {
        const mis = await misRes.json();
        if (Array.isArray(mis)) setMisDomicilios(mis);
      }
    } catch (e) { console.error("Error cargando domicilios:", e); }
  }, [riderData?.id]);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 8000); return () => clearTimeout(t); }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Manejar apertura desde notificacion push (aceptar/rechazar domicilio)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aceptarId = params.get("aceptar");
    const rechazarId = params.get("rechazar");
    if (aceptarId && riderData) {
      setTab("domicilios");
      aceptarDomicilio(aceptarId);
      window.history.replaceState({}, "", "/repartidor");
    }
    if (rechazarId && riderData) {
      setTab("domicilios");
      rechazarDomicilio(rechazarId);
      window.history.replaceState({}, "", "/repartidor");
    }
  }, [riderData]);

  // Cargar domicilios disponibles al montar y cuando cambie riderData
  useEffect(() => { if (riderData) loadDomicilios(); }, [riderData, loadDomicilios]);

  // Realtime: alarmas domicilios disponibles
  useEffect(() => {
    if (!user) return;
    const ch = sb.channel("domicilios_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "domicilios_disponibles" }, (payload: any) => {
        const d = payload.new;
        alarmaSilenciadaRef.current = false;
        iniciarAlarma();
        enviarNotificacion("Nuevo domicilio disponible", `${d.pedido_codigo || ""} - $${d.valor_domicilio?.toLocaleString() || "0"} - ${d.direccion_destino?.substring(0, 40) || ""}`, d.id);
        loadDomicilios();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "domicilios_disponibles" }, async (payload: any) => {
        const old = payload.old;
        const updated = payload.new;
        if (old?.estado !== "aceptado" && updated?.estado === "aceptado" && updated.repartidor_id) {
          const { data: rep } = await sb.from("repartidores").select("nombre").eq("id", updated.repartidor_id).single();
          const nombre = rep?.nombre || "Un repartidor";
          const esYo = rep?.nombre === riderData?.nombre;
          detenerAlarma();
          setDomiNotif(null);
          enviarNotificacion("Domicilio aceptado", esYo ? `Tomaste el domicilio #${updated.pedido_codigo}` : `${nombre} tomó el domicilio #${updated.pedido_codigo}`);
        }
        loadDomicilios();
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [user, riderData?.nombre]);

  // Polling cada 60 segundos (respaldo del realtime)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Polling: refrescando datos...");
      loadData();
      loadDomicilios();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData, loadDomicilios]);

  // Realtime
  useEffect(() => {
    if (!user || !riderData) return;
    if (subRef.current) sb.removeChannel(subRef.current);
    const channel = sb.channel("rider_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos", filter: `repartidor_id=eq.${riderData.id}` }, (payload: any) => {
        const p = payload.new;
        enviarNotificacion("Nuevo pedido asignado", `${p.codigo} - ${p.cliente} - ${p.direccion}`);
        loadData();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos", filter: `repartidor_id=eq.${riderData.id}` }, (payload: any) => {
        const p = payload.new;
        if (p.estado && p.estado !== payload.old.estado) {
          enviarNotificacion("Pedido actualizado", `${p.codigo} - Estado: ${p.estado}`);
        }
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "turnos" }, () => {
        console.log("Turno cambiado, recargando...");
        loadData();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "repartidores", filter: `id=eq.${riderData.id}` }, (pl: any) => { setRiderData(pl.new); if (pl.new.estado) setEstadoRider(pl.new.estado); })
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos_cliente", filter: `repartidor_id=eq.${riderData.id}` }, () => { loadData(); })
      .subscribe();
    subRef.current = channel;
    return () => { sb.removeChannel(channel); };
  }, [user, riderData, loadData]);

  async function cambiarEstado(nuevo: string) {
    if (!riderData) return;
    const { error } = await sb.from("repartidores").update({ estado: nuevo }).eq("id", riderData.id);
    if (!error) { setEstadoRider(nuevo); ok(`Estado: ${nuevo}`); }
    else fail("Error: " + error.message);
  }

  async function cambiarEstadoPedido(id: string, nuevo: string, precio?: number) {
    const updates: any = { estado: nuevo };
    if (nuevo === "Entregado" && precio) updates.pago_repartidor = precio;
    const { error } = await sb.from("pedidos").update(updates).eq("id", id);
    if (error) { fail("Error: " + error.message); return; }
    ok(`Pedido: ${nuevo}`);
    if (nuevo === "Entregado" || nuevo === "Cancelado") {
      if (riderData) await sb.from("repartidores").update({ estado: "Disponible" }).eq("id", riderData.id);
    }
    loadData();
  }

  async function aceptarDomicilio(domicilioId: string) {
    if (!riderData) return;
    setAceptandoId(domicilioId);
    try {
      const res = await fetch("/api/domicilios/aceptar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domicilio_id: domicilioId, repartidor_id: riderData.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        fail(data.error || "No se pudo aceptar");
      } else {
        ok("Domicilio aceptado");
        loadDomicilios();
        loadData();
        enviarNotificacion("Domicilio asignado", "Te han asignado un domicilio");
      }
    } catch (e: any) {
      fail("Error: " + e.message);
    } finally { setAceptandoId(null); }
  }

  function copiarPedido(p: any) {
    const loc = locales.find((l: any) => l.id === p.local_id)?.nombre || "Sin local";
    const txt = `Pedido: #${p.codigo}\nCliente: ${p.cliente}\nContacto: ${p.telefono}\nDirección: ${p.direccion}\nLocal: ${loc}\nTarifa: $${p.precio}\nFecha y hora: ${fechaCorta(p.created_at)}`;
    navigator.clipboard.writeText(txt).then(() => ok("Pedido copiado")).catch(() => fail("Error al copiar"));
  }

  function waCliente(p: any) { if (p.telefono) window.open(`https://wa.me/57${p.telefono.replace(/\D/g, "")}`, "_blank"); else fail("Sin teléfono"); }
  function waEmpresa(p: any) { const msg = `Pedido ${p.codigo} - ${p.cliente} - ${p.direccion}`; window.open(`https://wa.me/57${EMPRESA_PHONE}?text=${encodeURIComponent(msg)}`, "_blank"); }
  function waProblema(p: any) { const msg = `PROBLEMA Pedido ${p.codigo} - ${p.cliente} - ${p.direccion}`; window.open(`https://wa.me/57${EMPRESA_PHONE}?text=${encodeURIComponent(msg)}`, "_blank"); }
  function abrirMapa(dir: string) { window.open(`https://maps.google.com/?q=${encodeURIComponent(dir)}`, "_blank"); }

  const activos = pedidos.filter((p) => !["Entregado", "Cancelado"].includes(p.estado));
  const entregados = pedidos.filter((p) => p.estado === "Entregado");
  const totalGenerado = entregados.reduce((s, p) => s + (p.precio || 0), 0);
  const totalEmpresa = entregados.reduce((s, p) => s + (p.empresa_recibe || 0), 0);
  const totalRepartidor = entregados.reduce((s, p) => s + (p.pago_repartidor || 0), 0);
  const ultimo = pedidos[0] || null;
  const todosLiquidados = entregados.length > 0 && entregados.every((p) => p.liquidado);

  /* ======================== ESTILOS ======================== */
  const colors = {
    bg: "#0F172A",
    card: "#1E293B",
    primary: "#10B981",
    primaryDark: "#059669",
    darkBlue: "#1E293B",
    darkerBlue: "#0F172A",
    white: "#F8FAFC",
    gray50: "#F8FAFC",
    gray100: "#F1F5F9",
    gray200: "#334155",
    gray300: "#475569",
    gray400: "#64748B",
    gray500: "#94A3B8",
    gray600: "#CBD5E1",
    green: "#10B981",
    greenLight: "rgba(16,185,129,0.12)",
    red: "#EF4444",
    redLight: "rgba(239,68,68,0.12)",
    blue: "#3B82F6",
    blueLight: "rgba(59,130,246,0.12)",
    purple: "#8B5CF6",
    purpleLight: "rgba(139,92,246,0.12)",
    amber: "#F59E0B",
    amberLight: "rgba(245,158,11,0.12)",
  };

  const card: React.CSSProperties = {
    background: colors.card,
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    marginBottom: 12,
    border: `1px solid rgba(255,255,255,0.06)`,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "14px 20px",
    borderRadius: 12,
    border: "none",
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
    boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
  };

  const btnOutline: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${colors.gray200}`,
    background: "transparent",
    color: colors.gray500,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  };

  const badgeEstado: Record<string, React.CSSProperties> = {
    Disponible: { padding: "6px 14px", borderRadius: 999, background: "rgba(16,185,129,0.15)", color: colors.green, fontSize: 12, fontWeight: 700, border: `1px solid rgba(16,185,129,0.3)` },
    Ocupado: { padding: "6px 14px", borderRadius: 999, background: "rgba(245,158,11,0.15)", color: colors.amber, fontSize: 12, fontWeight: 700, border: `1px solid rgba(245,158,11,0.3)` },
    "No disponible": { padding: "6px 14px", borderRadius: 999, background: "rgba(100,116,139,0.15)", color: colors.gray400, fontSize: 12, fontWeight: 700, border: `1px solid rgba(100,116,139,0.3)` },
  };

  const estPedido: Record<string, React.CSSProperties> = {
    Pendiente: { padding: "4px 10px", borderRadius: 999, background: "rgba(100,116,139,0.2)", color: colors.gray500, fontSize: 11, fontWeight: 700 },
    Asignado: { padding: "4px 10px", borderRadius: 999, background: "rgba(245,158,11,0.15)", color: colors.amber, fontSize: 11, fontWeight: 700 },
    Aceptado: { padding: "4px 10px", borderRadius: 999, background: "rgba(59,130,246,0.15)", color: colors.blue, fontSize: 11, fontWeight: 700 },
    Recogido: { padding: "4px 10px", borderRadius: 999, background: "rgba(139,92,246,0.15)", color: colors.purple, fontSize: 11, fontWeight: 700 },
    "En camino": { padding: "4px 10px", borderRadius: 999, background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: 11, fontWeight: 700 },
    Entregado: { padding: "4px 10px", borderRadius: 999, background: "rgba(16,185,129,0.15)", color: colors.green, fontSize: 11, fontWeight: 700 },
    Problema: { padding: "4px 10px", borderRadius: 999, background: "rgba(239,68,68,0.15)", color: colors.red, fontSize: 11, fontWeight: 700 },
    Cancelado: { padding: "4px 10px", borderRadius: 999, background: "rgba(71,85,105,0.2)", color: colors.gray300, fontSize: 11, fontWeight: 700 },
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg }}><p style={{ color: colors.gray400 }}>Cargando...</p></div>;
  if (!riderData) return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: colors.bg, gap: 16 }}><p style={{ color: colors.red, fontSize: 16 }}>Error: No se pudo cargar el perfil de repartidor</p><p style={{ color: colors.gray400, fontSize: 13 }}>{loadError}</p></div>;

  /* ======================== RENDER ======================== */
  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.white, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          padding: "12px 24px", borderRadius: 12,
          background: toastType === "ok" ? colors.green : colors.red,
          color: "#fff", fontWeight: 700, fontSize: 14,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {toast}
        </div>
      )}

      {/* NOTIFICACION PERSISTENTE DE DOMICILIO */}
      {domiNotif && (
        <div style={{
          position: "sticky", top: 0, zIndex: 9998,
          background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
          padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 6px #ef4444", marginTop: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: 0.5 }}>Nuevo domicilio disponible</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#fff" }}>#{domiNotif.pedido_codigo} — {domiNotif.cliente_nombre}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#a7f3d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {domiNotif.negocio_nombre} → {domiNotif.direccion_destino}
              </p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#fde68a" }}>{fmt(domiNotif.valor_domicilio)}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => aceptarDomicilio(domiNotif.id)}
                disabled={aceptandoId === domiNotif.id}
                style={{
                  padding: "8px 18px", borderRadius: 10, border: "none",
                  background: aceptandoId === domiNotif.id ? "#6b7280" : "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {aceptandoId === domiNotif.id ? "..." : "Aceptar"}
              </button>
              <button
                onClick={() => rechazarDomicilio(domiNotif.id)}
                style={{
                  padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent", color: "#fca5a5", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "inicio" && (<>
      {/* HEADER PREMIUM CON LOGO DOMIU */}
      <div style={{
        background: `linear-gradient(180deg, ${colors.darkerBlue} 0%, #0a0f1a 100%)`,
        padding: "20px 20px 24px",
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}>
        {/* DOMIU Logo */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: colors.primary, letterSpacing: 2 }}>DOMIU</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${colors.primary}, #059669)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff", position: "relative", flexShrink: 0 }}>
              {(riderData.nombre || "R").charAt(0).toUpperCase()}
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: estadoRider === "Disponible" ? colors.green : estadoRider === "Ocupado" ? colors.amber : colors.gray400, border: `3px solid ${colors.darkerBlue}`, position: "absolute", bottom: -2, right: -2, boxShadow: estadoRider === "Disponible" ? "0 0 8px rgba(16,185,129,0.6)" : "none" }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.white }}>{riderData.nombre}</h1>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: colors.gray500 }}>Repartidor</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.white, fontVariantNumeric: "tabular-nums" }}>{currentTime}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: colors.gray500 }}>{currentDate}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: colors.gray500 }}>Ganancias hoy</p>
            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: colors.primary }}>{fmt(totalRepartidor)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: colors.gray500 }}>Entregados</p>
            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: colors.white }}>{entregados.length}</p>
          </div>
        </div>
      </div>

      {/* SELECTOR DE ESTADO */}
      <div style={{ padding: "16px 16px 0", display: "flex", gap: 8 }}>
        {(["Disponible", "Ocupado", "No disponible"] as const).map((est) => (
          <button key={est} onClick={() => cambiarEstado(est)}
            style={{
              flex: 1, padding: "12px 8px", borderRadius: 30,
              border: estadoRider === est
                ? `2px solid ${est === "Disponible" ? colors.green : est === "Ocupado" ? colors.amber : colors.gray400}`
                : `1px solid ${colors.gray200}`,
              background: estadoRider === est
                ? (est === "Disponible" ? "rgba(16,185,129,0.1)" : est === "Ocupado" ? "rgba(245,158,11,0.1)" : "rgba(100,116,139,0.1)")
                : "transparent",
              color: estadoRider === est
                ? (est === "Disponible" ? colors.green : est === "Ocupado" ? colors.amber : colors.gray400)
                : colors.gray500,
              cursor: "pointer", fontWeight: 700, fontSize: 13,
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {estadoRider === est && est === "Disponible" && (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.green, animation: "pulse 1.5s infinite" }} />
            )}
            {est}
          </button>
        ))}
      </div>

      {/* DASHBOARD STATS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 16px 0" }}>
        <div style={card}>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: colors.gray500, fontWeight: 600 }}>Ganancias</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: colors.primary }}>{fmt(totalRepartidor)}</p>
        </div>
        <div style={card}>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: colors.gray500, fontWeight: 600 }}>Pedidos hoy</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: colors.white }}>{entregados.length}</p>
        </div>
        <div style={card}>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: colors.gray500, fontWeight: 600 }}>Horas conectado</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: colors.white }}>{activeTurnoId ? "—" : "—"}</p>
        </div>
        <div style={card}>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: colors.gray500, fontWeight: 600 }}>Calificación</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: colors.white }}>— <Star size={18} style={{ color: "#F59E0B", display: "inline" }} /></p>
        </div>
      </div>

      {/* MIS ENTREGAS ACTIVAS (unificado: pedidos + domicilios aceptados + marketplace) */}
      {(() => {
        const misActivos = [
          ...activos.map((p: any) => ({
            id: p.id, tipo: "pedido", codigo: p.codigo,
            nombre: p.cliente, telefono: p.telefono,
            direccion: p.direccion, valor: p.precio,
            estado: p.estado,
            origen: locales.find((l: any) => l.id === p.local_id)?.nombre || "Origen",
            origenDir: locales.find((l: any) => l.id === p.local_id)?.direccion || "",
          })),
          ...misDomicilios.filter((d: any) => d.estado === "aceptado").map((d: any) => ({
            id: d.id, tipo: "domicilio", codigo: d.pedido_codigo,
            nombre: d.cliente_nombre, telefono: d.cliente_telefono,
            direccion: d.direccion_destino, valor: d.valor_domicilio,
            estado: d.estado,
            origen: d.negocio_nombre || "Origen",
            origenDir: d.direccion_origen || "",
          })),
          ...pcPedidos.filter((p: any) => !["entregado", "cancelado"].includes(p.estado)).map((p: any) => ({
            id: p.id, tipo: "marketplace", codigo: p.codigo,
            nombre: p.cliente_nombre, telefono: p.cliente_telefono,
            direccion: p.cliente_direccion, valor: p.domicilio || p.total,
            estado: p.estado,
            origen: "Marketplace",
            origenDir: "",
          })),
        ];
        if (misActivos.length === 0) return null;
        return (
          <>
            <p style={{ margin: "16px 0 12px", fontSize: 14, fontWeight: 800, color: colors.white, display: "flex", alignItems: "center", gap: 8 }}>
              <Navigation size={18} color={colors.primary} /> Mis entregas ({misActivos.length})
            </p>
            {misActivos.map((p, idx) => (
              <div key={p.id} style={{ ...card, marginBottom: 12, borderLeft: `4px solid ${colors.primary}`, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingTop: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors.green, flexShrink: 0 }} />
                    <div style={{ width: 2, height: 28, background: `linear-gradient(to bottom, ${colors.green}, ${colors.primary})` }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors.primary, flexShrink: 0 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ margin: 0, fontSize: 11, color: colors.gray500 }}>{p.origen}</p>
                      <p style={{ margin: 0, fontSize: 13, color: colors.white, fontWeight: 600 }}>{p.origenDir || "—"}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: colors.gray500 }}>→ {p.nombre}</p>
                      <p style={{ margin: 0, fontSize: 13, color: colors.white, fontWeight: 600 }}>{p.direccion}</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: colors.primary }}>{p.codigo}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.gray500 }}>#{idx + 1} · {fmt(p.valor)}</p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 999, background: "rgba(16,185,129,0.15)", color: colors.green, fontSize: 11, fontWeight: 700 }}>
                    {p.estado}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button style={btnOutline} onClick={() => abrirMapa(p.direccion)}>
                    <Navigation size={14} /> Ver Ruta
                  </button>
                  <button style={btnOutline} onClick={() => p.telefono ? window.open(`https://wa.me/57${p.telefono.replace(/\D/g, "")}`) : fail("Sin teléfono")}>
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button style={btnOutline} onClick={() => p.telefono ? window.open(`tel:${p.telefono}`) : fail("Sin teléfono")}>
                    <Phone size={14} /> Llamar
                  </button>
                  {p.estado !== "Entregado" && p.estado !== "Cancelado" && p.estado !== "completado" && p.estado !== "entregado" && p.estado !== "cancelado" && (
                    <button onClick={async () => {
                      if (p.tipo === "pedido") {
                        await sb.from("pedidos").update({ estado: "Entregado", pago_repartidor: p.valor || 0 }).eq("id", p.id);
                      } else if (p.tipo === "marketplace") {
                        await sb.from("pedidos_cliente").update({ estado: "entregado", entregado_en: new Date().toISOString() }).eq("id", p.id);
                      } else {
                        await sb.from("domicilios_disponibles").update({ estado: "completado" }).eq("id", p.id);
                      }
                      ok(`${p.codigo} marcado como entregado — ${fmt(p.valor)}`);
                      loadData(); loadDomicilios();
                    }} style={{ ...btnOutline, color: colors.green, borderColor: colors.green }}>
                      <Check size={14} /> Entregado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        );
      })()}

      {/* Alarma */}
      {alarmaActiva && (
        <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#ef4444" }}>⚠️ Domicilio disponible — Alarma activa</p>
            <p style={{ margin: 0, fontSize: 11, color: "#fca5a5" }}>Presiona "Aceptar domicilio" para tomar el pedido</p>
          </div>
          <button onClick={() => { alarmaSilenciadaRef.current = true; detenerAlarma(); }} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            Silenciar
          </button>
        </div>
      )}

      {/* DOMICILIOS DISPONIBLES (unificado) */}
      {(() => {
        const noRech = domiciliosDisponibles.filter((d: any) => !rechazados.includes(d.id));
        return (
          <>
            <p style={{ margin: "16px 0 12px", fontSize: 13, fontWeight: 700, color: colors.gray500, display: "flex", alignItems: "center", gap: 6 }}>
              <Bike size={14} style={{ color: colors.amber }} /> Domicilios disponibles
              {noRech.length > 0 && (
                <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: colors.amberLight, color: colors.amber, fontSize: 11, fontWeight: 700 }}>{noRech.length}</span>
              )}
              {rechazados.length > 0 && (
                <button onClick={() => { guardarRechazados([]); loadDomicilios(); }} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 8, background: "transparent", border: "1px solid #64748b", color: "#94a3b8", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                  Mostrar rechazados
                </button>
              )}
            </p>
            {noRech.length === 0 ? (
              <div style={{ ...card, textAlign: "center", padding: 40, marginBottom: 12 }}>
                <Bike size={48} color={colors.gray300} style={{ marginBottom: 12 }} />
                <p style={{ color: colors.gray400, fontWeight: 600 }}>No hay domicilios disponibles</p>
                <p style={{ color: colors.gray300, fontSize: 13 }}>Los nuevos domicilios aparecerán aquí con una alerta</p>
              </div>
            ) : (
              noRech.map((d: any) => (
                <div key={d.id} style={{ ...card, borderLeft: `4px solid ${colors.amber}`, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: colors.amberLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Bike size={18} color={colors.amber} />
                      </div>
                      <strong style={{ color: colors.primaryDark, fontSize: 15 }}>#{d.pedido_codigo}</strong>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: colors.blueLight, color: colors.blue, fontSize: 11, fontWeight: 700 }}>
                      {d.distancia_km ? `${d.distancia_km} km` : "—"}
                    </span>
                  </div>
                  <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: colors.gray50 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, color: colors.gray500, fontWeight: 700 }}>📍 Origen</p>
                    <p style={{ margin: 0, fontSize: 13, color: colors.darkBlue, fontWeight: 600 }}>{d.negocio_nombre}</p>
                  </div>
                  <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: colors.gray50 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, color: colors.gray500, fontWeight: 700 }}>🏠 Destino</p>
                    <p style={{ margin: 0, fontSize: 13, color: colors.darkBlue, fontWeight: 600 }}>{d.direccion_destino}</p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: colors.gray500 }}>Cliente</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.darkBlue }}>{d.cliente_nombre}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: 11, color: colors.gray500 }}>Valor</p>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: colors.green }}>{fmt(d.valor_domicilio)}</p>
                    </div>
                  </div>
                  <button onClick={() => aceptarDomicilio(d.id)} disabled={aceptandoId === d.id}
                    style={{
                      ...btnPrimary,
                      background: aceptandoId === d.id ? colors.gray400 : `linear-gradient(135deg, ${colors.green} 0%, #059669 100%)`,
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {aceptandoId === d.id ? (
                      <><div className="spinner" style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> Aceptando...</>
                    ) : (
                      <><Check size={20} /> Aceptar domicilio</>
                    )}
                  </button>
                </div>
              ))
            )}
          </>
        );
      })()}

      {/* Marketplace */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${colors.gray200}` }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: colors.gray500, display: "flex", alignItems: "center", gap: 6 }}>
          <Store size={14} /> Marketplace
        </p>
        <RiderMarketplace riderId={riderData.id} riderName={riderData.nombre} />
      </div>
      </>)} 

      {/* PEDIDOS */}
      {tab === "pedidos" && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: colors.gray500 }}>Tus pedidos</p>
            <button onClick={() => { loadData(); loadDomicilios(); }} style={{ padding: "6px 12px", borderRadius: 8, background: colors.amberLight, color: colors.amber, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Refrescar
            </button>
          </div>
          {/* Pedidos InDriver (pedidos_cliente) con control de estado completo */}
          {(() => {
            const pcEstados: Record<string, { label: string; color: string; bg: string }> = {
              asignado: { label: "Asignado", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
              en_camino: { label: "En camino", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
              recogido: { label: "Recogido", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
              entregado: { label: "Entregado", color: colors.green, bg: colors.greenLight },
              cancelado: { label: "Cancelado", color: colors.red, bg: colors.redLight },
            };
            return pcPedidos.length > 0 ? (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: colors.gray500, display: "flex", alignItems: "center", gap: 6 }}>
                  <Package size={14} /> Marketplace ({pcPedidos.length})
                </p>
                {pcPedidos.map((p: any) => {
                  const ec = pcEstados[p.estado] || { label: p.estado, color: colors.gray500, bg: "rgba(100,116,139,0.15)" };
                  return (
                    <div key={p.id} style={{ ...card, borderLeft: `4px solid ${ec.color}`, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ color: colors.primaryDark, fontSize: 15 }}>#{p.codigo}</strong>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: ec.bg, color: ec.color, fontSize: 11, fontWeight: 700 }}>
                          {ec.label}
                        </span>
                      </div>
                      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                        {[
                          { label: "Cliente", val: p.cliente_nombre, icon: User },
                          { label: "Teléfono", val: p.cliente_telefono || "—", icon: Phone },
                          { label: "Dirección", val: p.cliente_direccion, icon: MapPin },
                          { label: "Valor", val: fmt(p.total), icon: DollarSign },
                        ].map((item) => (
                          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: colors.gray500, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                              <item.icon size={14} /> {item.label}
                            </span>
                            <span style={{ color: item.label === "Valor" ? colors.green : colors.darkBlue, fontWeight: 600, fontSize: 14 }}>
                              {item.val}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Acciones de estado */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                        {p.estado === "asignado" && (
                          <button style={{ ...btnPrimary, background: `linear-gradient(135deg, ${colors.blue}, #2563eb)`, color: "#fff" }} onClick={async () => {
                            await sb.from("pedidos_cliente").update({ estado: "recogido", recogido_en: new Date().toISOString() }).eq("id", p.id);
                            ok("Marcado como recogido"); loadData(); loadDomicilios();
                          }}>
                            <Package size={18} /> Marcar recogido
                          </button>
                        )}
                        {p.estado === "recogido" && (
                          <button style={{ ...btnPrimary, background: `linear-gradient(135deg, ${colors.purple}, #7c3aed)`, color: "#fff" }} onClick={async () => {
                            await sb.from("pedidos_cliente").update({ estado: "en_camino" }).eq("id", p.id);
                            ok("En camino"); loadData(); loadDomicilios();
                          }}>
                            <Navigation size={18} /> Marcar en camino
                          </button>
                        )}
                        {p.estado === "en_camino" && (
                          <button style={{ ...btnPrimary, background: `linear-gradient(135deg, ${colors.green}, #059669)`, color: "#fff" }} onClick={async () => {
                            await sb.from("pedidos_cliente").update({ estado: "entregado", entregado_en: new Date().toISOString() }).eq("id", p.id);
                            ok("Entregado"); loadData(); loadDomicilios();
                          }}>
                            <Check size={18} /> Marcar entregado
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={btnOutline} onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(p.cliente_direccion)}`, "_blank")}>
                          <MapPin size={14} /> Maps
                        </button>
                        {p.cliente_telefono && (
                          <button style={btnOutline} onClick={() => window.open(`https://wa.me/57${p.cliente_telefono.replace(/\D/g, "")}`, "_blank")}>
                            <MessageCircle size={14} /> WA
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : null;
          })()}

          {/* Pedidos del sistema anterior */}
          {pcPedidos.length === 0 && pedidos.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: 40 }}>
              <Package size={48} color={colors.gray300} style={{ marginBottom: 12 }} />
              <p style={{ color: colors.gray400, fontWeight: 600 }}>No tienes pedidos asignados</p>
              <p style={{ color: colors.gray300, fontSize: 13 }}>Los pedidos aparecerán aquí cuando te asignen uno</p>
            </div>
          ) : null}
          {pedidos.length > 0 && (
            <>{pedidos.map((p: any) => (
              <div key={p.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.amberLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package size={18} color={colors.amber} />
                    </div>
                    <strong style={{ color: colors.primaryDark, fontSize: 16 }}>{p.codigo}</strong>
                  </div>
                  <span style={estPedido[p.estado]}>{p.estado}</span>
                </div>
                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Cliente", val: p.cliente, icon: User },
                    { label: "Teléfono", val: p.telefono || "—", icon: Phone },
                    { label: "Dirección", val: p.direccion, icon: MapPin },
                    { label: "Local", val: locales.find((l: any) => l.id === p.local_id)?.nombre || "—", icon: Package },
                    { label: "Tarifa", val: fmt(p.precio), icon: DollarSign },
                    { label: "Pago", val: p.metodo_pago || "Efectivo", icon: Wallet },
                    { label: "Hora", val: fechaCorta(p.created_at), icon: Clock },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: colors.gray500, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <item.icon size={14} /> {item.label}
                      </span>
                      <span style={{
                        color: item.label === "Tarifa" ? colors.green : colors.darkBlue,
                        fontWeight: item.label === "Tarifa" ? 700 : 600,
                        fontSize: 14,
                      }}>
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {p.estado === "Pendiente" && (
                    <button style={btnPrimary} onClick={() => cambiarEstadoPedido(p.id, "Aceptado")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Check size={18} /> Aceptar pedido
                      </span>
                    </button>
                  )}
                  {p.estado === "Aceptado" && (
                    <button style={{ ...btnPrimary, background: `linear-gradient(135deg, ${colors.blue}, #2563eb)`, color: "#fff" }} onClick={() => cambiarEstadoPedido(p.id, "Recogido")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Package size={18} /> Marcar recogido
                      </span>
                    </button>
                  )}
                  {p.estado === "Recogido" && (
                    <button style={{ ...btnPrimary, background: `linear-gradient(135deg, ${colors.purple}, #7c3aed)`, color: "#fff" }} onClick={() => cambiarEstadoPedido(p.id, "En camino")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Navigation size={18} /> Marcar en camino
                      </span>
                    </button>
                  )}
                  {p.estado === "En camino" && (
                    <button style={{ ...btnPrimary, background: `linear-gradient(135deg, ${colors.green}, #059669)`, color: "#fff" }} onClick={() => cambiarEstadoPedido(p.id, "Entregado", p.precio)}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Check size={18} /> Marcar entregado
                      </span>
                    </button>
                  )}
                  {p.estado !== "Entregado" && p.estado !== "Cancelado" && (
                    <button style={{ ...btnOutline, color: colors.red, borderColor: colors.red }} onClick={() => cambiarEstadoPedido(p.id, "Problema")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <AlertTriangle size={14} /> Reportar problema
                      </span>
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <button style={btnOutline} onClick={() => abrirMapa(p.direccion)}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <MapPin size={14} /> Maps
                    </span>
                  </button>
                  <button style={btnOutline} onClick={() => waCliente(p)}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <MessageCircle size={14} /> WA
                    </span>
                  </button>
                  <button style={btnOutline} onClick={() => copiarPedido(p)}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Copy size={14} /> Copiar
                    </span>
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <button style={btnOutline} onClick={() => waEmpresa(p)}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <MessageCircle size={14} /> WA empresa
                    </span>
                  </button>
                  <button style={{ ...btnOutline, color: colors.red, borderColor: colors.red }} onClick={() => waProblema(p)}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <AlertTriangle size={14} /> Reportar
                    </span>
                  </button>
                </div>
              </div>
            ))}
            </>
          )}

          {/* RUTA ACTIVA */}
          {activos.length > 0 && (
            <>
              <div style={{ ...card, textAlign: "center", background: `linear-gradient(135deg, ${colors.darkerBlue}, ${colors.darkBlue})`, color: "#fff", border: "none" }}>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: colors.gray400 }}>{activos.length} pedidos en ruta</p>
                <p style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800 }}>Ruta activa</p>
                <button
                  style={{ ...btnPrimary, maxWidth: 220, margin: "0 auto" }}
                  onClick={() => {
                    const urls = activos.map((p: any) => encodeURIComponent(p.direccion)).join("/");
                    window.open(`https://www.google.com/maps/dir/${urls}`, "_blank");
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Navigation size={18} /> Iniciar ruta
                  </span>
                </button>
              </div>
              {activos.map((p: any, idx: number) => {
                const loc = locales.find((l: any) => l.id === p.local_id);
                return (
                  <div key={p.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: colors.primary,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 800, color: colors.darkerBlue,
                        }}>
                          {idx + 1}
                        </div>
                        <strong style={{ color: colors.primaryDark, fontSize: 15 }}>{p.codigo}</strong>
                      </div>
                      <span style={estPedido[p.estado]}>{p.estado}</span>
                    </div>
                    {loc && (
                      <div style={{ marginBottom: 10, padding: 12, borderRadius: 10, background: colors.gray50 }}>
                        <p style={{ margin: "0 0 4px", fontSize: 11, color: colors.gray500, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.green }} /> Origen
                        </p>
                        <p style={{ margin: "0 0 2px", fontSize: 14, color: colors.darkBlue, fontWeight: 600 }}>{loc.nombre}</p>
                        <p style={{ margin: 0, fontSize: 12, color: colors.gray500 }}>{loc.direccion}</p>
                      </div>
                    )}
                    <div style={{ padding: 12, borderRadius: 10, background: colors.gray50 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11, color: colors.gray500, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.red }} /> Destino
                      </p>
                      <p style={{ margin: "0 0 2px", fontSize: 14, color: colors.darkBlue, fontWeight: 600 }}>{p.cliente}</p>
                      <p style={{ margin: 0, fontSize: 12, color: colors.gray500 }}>{p.direccion}</p>
                    </div>
                    <button
                      style={{ ...btnPrimary, marginTop: 12, background: `linear-gradient(135deg, ${colors.blue}, #2563eb)`, color: "#fff" }}
                      onClick={() => abrirMapa(p.direccion)}
                    >
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Navigation size={16} /> Abrir en Google Maps
                      </span>
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* MAPA — Google Maps embebido */}
      {tab === "mapa" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: "#0F172A" }}>
          {(() => {
            const activeDeliveries = [
              ...activos.map((p: any) => {
                const loc = locales.find((l: any) => l.id === p.local_id);
                return {
                  id: p.id,
                  codigo: p.codigo,
                  tipo: "pedido" as const,
                  cliente: p.cliente,
                  cliente_telefono: p.telefono || "",
                  direccion: p.direccion,
                  direccion_origen: loc?.direccion || "",
                  negocio_nombre: loc?.nombre || "",
                  local_id: p.local_id,
                  estado: p.estado,
                };
              }),
              ...misDomicilios.filter((d: any) => d.estado === "aceptado").map((d: any) => ({
                id: d.id,
                codigo: d.pedido_codigo || d.id,
                tipo: "domicilio" as const,
                cliente: d.cliente_nombre,
                cliente_telefono: d.cliente_telefono || "",
                direccion: d.direccion_destino,
                direccion_origen: d.direccion_origen || "",
                negocio_nombre: d.negocio_nombre || "",
                estado: d.estado,
              })),
              ...pcPedidos.filter((p: any) => !["entregado", "cancelado"].includes(p.estado)).map((p: any) => ({
                id: p.id,
                codigo: p.codigo,
                tipo: "marketplace" as const,
                cliente: p.cliente_nombre,
                cliente_telefono: p.cliente_telefono || "",
                direccion: p.cliente_direccion,
                direccion_origen: "",
                negocio_nombre: "",
                estado: p.estado,
              })),
            ];

            return (
              <MapView
                rider={{
                  id: riderData?.id || "",
                  nombre: riderData?.nombre || "",
                }}
                deliveries={activeDeliveries}
              />
            );
          })()}
        </div>
      )}

      {/* CHAT */}
      {tab === "chat" && (
        <div style={{ padding: "16px 0 0" }}>
          <ChatRepartidor riderId={riderData.id} riderNombre={riderData.nombre} />
        </div>
      )}

      {/* PERFIL */}
      {tab === "perfil" && (
        <div style={{ padding: "16px 16px 0" }}>
          {/* Header con engranaje */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.gray500 }}>Mi Perfil</p>
            <button onClick={() => {
              setEditNom(riderData.nombre || "");
              setEditTel(riderData.telefono || "");
              setEditDoc(riderData.documento || "");
              setEditVeh(riderData.vehiculo || "");
              setEditPla(riderData.placa || "");
              setEditFoto(null);
              setShowEditModal(true);
            }} style={{ padding: 8, borderRadius: 10, background: "transparent", border: "none", color: colors.gray400, cursor: "pointer" }}>
              <Settings size={20} />
            </button>
          </div>
          {/* Sub-navegación */}
          <div style={{ ...card, display: "flex", gap: 8, padding: 12, marginBottom: 16 }}>
            {([
              { id: "info" as PerfilSubtab, label: "Información", icon: User },
              { id: "liquidacion" as PerfilSubtab, label: "Liquidación", icon: DollarSign },
              { id: "gps" as PerfilSubtab, label: "GPS", icon: Navigation },
            ]).map((s) => {
              const SIcon = s.icon;
              return (
                <button key={s.id} onClick={() => setPerfilSubtab(s.id)}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    background: perfilSubtab === s.id ? colors.primary : colors.gray100,
                    color: perfilSubtab === s.id ? colors.darkerBlue : colors.gray500,
                    fontWeight: 700, fontSize: 11, transition: "all 0.2s",
                  }}
                >
                  <SIcon size={16} />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* INFO */}
          {perfilSubtab === "info" && (
            <>
              <div style={{ ...card, textAlign: "center", marginBottom: 16 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.amber} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, fontWeight: 900, color: colors.darkerBlue,
                  margin: "0 auto 16px",
                }}>
                  {(riderData.nombre || "R").charAt(0).toUpperCase()}
                </div>
                <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: colors.darkBlue }}>
                  {riderData.nombre}
                </h2>
                <p style={{ margin: 0, color: colors.gray500, fontSize: 14 }}>{profile?.email}</p>
              </div>
              <div style={card}>
                {[
                  { label: "Teléfono", val: riderData.telefono || "No registrado", icon: Phone },
                  { label: "Documento", val: riderData.documento || "No registrado", icon: FileText },
                  { label: "Vehículo", val: riderData.vehiculo || "No registrado", icon: Truck },
                  { label: "Placa", val: riderData.placa || "No registrado", icon: Package },
                  { label: "Estado", val: estadoRider, icon: Shield },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    paddingBottom: i < arr.length - 1 ? 14 : 0,
                    borderBottom: i < arr.length - 1 ? `1px solid ${colors.gray100}` : "none",
                  }}>
                    <span style={{ color: colors.gray500, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <item.icon size={16} /> {item.label}
                    </span>
                    <span style={{ color: item.label === "Estado" ? (estadoRider === "Disponible" ? colors.green : estadoRider === "Ocupado" ? colors.amber : colors.red) : colors.darkBlue, fontWeight: 600, fontSize: 14 }}>
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: colors.gray500 }}>Estado del turno</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: activeTurnoId ? colors.green : colors.gray400 }}>
                      {activeTurnoId ? "Turno activo" : "Sin turno activo"}
                    </p>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: activeTurnoId ? colors.greenLight : colors.gray100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={20} color={activeTurnoId ? colors.green : colors.gray400} />
                  </div>
                </div>
              </div>
              <button
                style={{
                  ...btnOutline, width: "100%", color: colors.red, borderColor: colors.red,
                  padding: 16, fontSize: 15, marginTop: 8,
                }}
                onClick={() => { logout(); }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <LogOut size={18} /> Cerrar sesión
                </span>
              </button>
            </>
          )}

          {/* LIQUIDACIÓN */}
          {perfilSubtab === "liquidacion" && (
            <>
              <div style={{
                ...card,
                background: `linear-gradient(135deg, ${colors.darkerBlue} 0%, ${colors.darkBlue} 100%)`,
                textAlign: "center",
                border: "none",
                marginBottom: 16,
              }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: colors.gray400 }}>Total a recibir</p>
                <h1 style={{ margin: "0 0 4px", fontSize: 36, fontWeight: 900, color: colors.primary }}>
                  {fmt(totalRepartidor)}
                </h1>
                <p style={{ margin: 0, fontSize: 13, color: colors.gray400 }}>{entregados.length} pedidos entregados</p>
              </div>
              <div style={card}>
                <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: colors.darkBlue }}>Resumen del turno</p>
                <div style={{ display: "grid", gap: 0 }}>
                  {[
                    { label: "Domicilios realizados", val: `${entregados.length}`, color: colors.darkBlue },
                    { label: "Total generado", val: fmt(totalGenerado), color: colors.darkBlue },
                    { label: "Total en efectivo", val: fmt(entregados.filter((p: any) => p.metodo_pago === "Efectivo").reduce((s: number, p: any) => s + (p.precio || 0), 0)), color: colors.darkBlue },
                    { label: "Total en transferencia", val: fmt(entregados.filter((p: any) => p.metodo_pago === "Transferencia").reduce((s: number, p: any) => s + (p.precio || 0), 0)), color: colors.darkBlue },
                    { label: "Debe a empresa", val: fmt(totalEmpresa), color: colors.amber },
                    { label: "Tu ganancia", val: fmt(totalRepartidor), color: colors.green },
                  ].map((item, i, arr) => (
                    <div key={item.label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      paddingBottom: 14,
                      borderBottom: i < arr.length - 1 ? `1px solid ${colors.gray100}` : "none",
                    }}>
                      <span style={{ color: colors.gray500, fontSize: 13 }}>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: 700, fontSize: 14 }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: colors.gray500, fontSize: 14, fontWeight: 600 }}>Estado de liquidación</span>
                <span style={{
                  padding: "6px 16px", borderRadius: 999,
                  background: todosLiquidados ? colors.greenLight : colors.amberLight,
                  color: todosLiquidados ? colors.green : colors.amber,
                  fontSize: 13, fontWeight: 700,
                }}>
                  {todosLiquidados ? "Liquidado" : "Pendiente"}
                </span>
              </div>
              {entregados.map((p: any) => (
                <div key={p.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ color: colors.primaryDark, fontSize: 15 }}>{p.codigo}</strong>
                      <p style={{ margin: "2px 0 0", color: colors.gray500, fontSize: 13 }}>{p.cliente}</p>
                    </div>
                    <span style={{ color: colors.green, fontWeight: 700, fontSize: 15 }}>{fmt(p.pago_repartidor)}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* GPS */}
          {perfilSubtab === "gps" && (
            <>
              <div style={{ ...card, textAlign: "center", marginBottom: 16 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: gpsActivo ? `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)` : `linear-gradient(135deg, #facc15 0%, #eab308 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <Navigation size={32} color="white" />
                </div>
                <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: colors.darkBlue }}>
                  GPS {gpsActivo ? "Activo" : "Inactivo"}
                </h2>
                <p style={{ margin: 0, color: colors.gray500, fontSize: 14 }}>
                  {gpsStatus === "esperando" && "Presiona activar para comenzar"}
                  {gpsStatus === "activo" && `Lat: ${gpsLat?.toFixed(6)}, Lng: ${gpsLng?.toFixed(6)}`}
                  {gpsStatus === "detenido" && "GPS detenido"}
                  {gpsStatus === "error" && "Error al obtener ubicación"}
                </p>
              </div>
              <button
                onClick={() => {
                  if (gpsActivo) {
                    if (gpsWatchRef.current !== null) {
                      navigator.geolocation.clearWatch(gpsWatchRef.current);
                      gpsWatchRef.current = null;
                    }
                    setGpsActivo(false);
                    setGpsStatus("detenido");
                    ok("GPS detenido");
                  } else {
                    if (!navigator.geolocation) {
                      fail("Tu navegador no soporta GPS");
                      return;
                    }
                    setGpsStatus("esperando");
                    const watchId = navigator.geolocation.watchPosition(
                      (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        setGpsLat(lat);
                        setGpsLng(lng);
                        setGpsActivo(true);
                        setGpsStatus("activo");
                        if (riderData?.id) {
                          sb.from("ubicaciones_repartidores").upsert({
                            repartidor_id: riderData.id,
                            nombre_repartidor: riderData.nombre,
                            latitud: lat,
                            longitud: lng,
                            estado: estadoRider === "Disponible" ? "disponible" : "ocupado",
                            ultima_actualizacion: new Date().toISOString(),
                          }).then(() => console.log("GPS guardado"));
                        }
                      },
                      (error) => {
                        console.error("GPS error:", error);
                        setGpsStatus("error");
                        fail("Error GPS: " + error.message);
                      },
                      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                    gpsWatchRef.current = watchId;
                    ok("GPS activando...");
                  }
                }}
                style={{
                  ...btnPrimary,
                  width: "100%",
                  background: gpsActivo ? colors.red : colors.green,
                  marginBottom: 12,
                }}
              >
                {gpsActivo ? "DETENER GPS" : "ACTIVAR GPS"}
              </button>
              {gpsActivo && (
                <div style={card}>
                  <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: colors.gray500 }}>Ubicación actual:</p>
                  <p style={{ margin: 0, fontSize: 13, color: colors.darkBlue }}>
                    Latitud: {gpsLat?.toFixed(8)}<br/>
                    Longitud: {gpsLng?.toFixed(8)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: colors.card, borderRadius: 24, padding: 24,
            width: "100%", maxWidth: 400, maxHeight: "90vh", overflow: "auto",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.white }}>Editar Perfil</h2>
              <button onClick={() => setShowEditModal(false)} style={{ padding: 6, borderRadius: 10, background: "transparent", border: "none", color: colors.gray400, cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {/* Foto */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: editFoto ? `url(${editFoto}) center/cover` : `linear-gradient(135deg, ${colors.primary}, #059669)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px", cursor: "pointer", overflow: "hidden",
              }} onClick={() => fileInputRef.current?.click()}>
                {!editFoto && !riderData.foto_url && (
                  <Camera size={24} color="#fff" />
                )}
                {!editFoto && riderData.foto_url && (
                  <img src={riderData.foto_url} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setEditFoto(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <p style={{ margin: 0, fontSize: 12, color: colors.gray500 }}>Repartidor</p>
            </div>

            {[
              { label: "Nombre", val: editNom, set: setEditNom },
              { label: "Teléfono", val: editTel, set: setEditTel },
              { label: "Documento", val: editDoc, set: setEditDoc },
              { label: "Vehículo", val: editVeh, set: setEditVeh },
              { label: "Placa", val: editPla, set: setEditPla },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: colors.gray500, marginBottom: 4 }}>{f.label}</label>
                <input value={f.val} onChange={(e) => f.set(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.gray200}`,
                    background: colors.darkerBlue, color: colors.white, fontSize: 14, outline: "none",
                  }}
                />
              </div>
            ))}

            <button onClick={async () => {
              setGuardandoPerfil(true);
              const up: any = { nombre: editNom, telefono: editTel, documento: editDoc, vehiculo: editVeh, placa: editPla };
              if (editFoto) up.foto_url = editFoto;
              const { error } = await sb.from("repartidores").update(up).eq("id", riderData.id);
              if (error) { fail("Error: " + error.message); setGuardandoPerfil(false); return; }
              setRiderData((prev: any) => ({ ...prev, ...up }));
              setShowEditModal(false);
              ok("Perfil actualizado");
              setGuardandoPerfil(false);
            }} disabled={guardandoPerfil}
              style={{
                width: "100%", padding: 14, borderRadius: 14, border: "none",
                background: guardandoPerfil ? colors.gray400 : colors.primary, color: "#fff",
                fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {guardandoPerfil ? "Guardando..." : <><Save size={18} /> Guardar cambios</>}
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(15,23,42,0.92)", backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "6px 0", paddingBottom: "calc(env(safe-area-inset-bottom, 6px))",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        maxWidth: 480, margin: "0 auto",
      }}>
        {([
          { key: "inicio" as TabType, icon: Home, label: "Inicio" },
          { key: "pedidos" as TabType, icon: ListOrdered, label: "Pedidos" },
          { key: "mapa" as TabType, icon: MapPin, label: "Mapa" },
          { key: "chat" as TabType, icon: MessageCircle, label: "Chat" },
          { key: "perfil" as TabType, icon: User, label: "Perfil" },
        ]).map((item) => {
          const Ico = item.icon;
          const active = tab === item.key;
          return (
            <button key={item.key} onClick={() => setTab(item.key)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: "transparent", border: "none", cursor: "pointer",
                padding: "4px 12px", position: "relative",
                color: active ? colors.primary : colors.gray500,
                transition: "color 0.15s",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: active ? "rgba(16,185,129,0.12)" : "transparent",
                transition: "background 0.15s",
              }}>
                <Ico size={20} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.2 }}>
                {item.label}
              </span>
              {active && (
                <div style={{
                  position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
                  width: 20, height: 3, borderRadius: 2, background: colors.primary,
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
