"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, Bell, MapPin, CreditCard, HelpCircle, Plus, Trash2, Banknote, Smartphone, LogOut, BellRing, BellOff, Settings, Gift, Wallet, DollarSign, ArrowUpRight, Mail, Phone, Calendar, MapPin as MapPinIcon, Edit3, ChevronRight, Save, X, Home, Package, Bike, Clock, Navigation, CheckCircle, AlertCircle, Eye, EyeOff, Key } from "lucide-react";
import { fetchData } from "@/lib/client-data";
import { useNotificaciones } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const metodoIcons: Record<string, any> = { efectivo: Banknote, transferencia: CreditCard, nequi: Smartphone, daviplata: Smartphone, tarjeta: CreditCard };
const metodoLabels: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", nequi: "Nequi", daviplata: "DaviPlata", tarjeta: "Tarjeta" };

type Direccion = { id: string; nombre: string; direccion: string; barrio: string; principal: boolean };
type Pedido = {
  id: string; codigo: string; total: number; estado: string; created_at: string;
  negocios: { nombre: string } | null;
};

const estadoLabel: Record<string, string> = {
  recibido: "Recibido", preparacion: "Preparación", asignado: "Asignado",
  camino: "En camino", entregado: "Entregado", cancelado: "Cancelado",
};
const estadoStep: Record<string, number> = { recibido: 0, preparacion: 1, asignado: 2, camino: 3, entregado: 4 };

const emerald = "#10B981";
const emeraldLight = "rgba(16,185,129,0.1)";

export default function PerfilPage() {
  const router = useRouter();
  const { user, initialized, logout } = useAuth();
  const [telefono, setTelefono] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayEmail, setDisplayEmail] = useState("");
  const { noLeidas, permiso, solicitarPermiso } = useNotificaciones();

  // Settings / Ajustes
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [editError, setEditError] = useState("");

  // Direcciones
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [showAddDir, setShowAddDir] = useState(false);
  const [newDirNombre, setNewDirNombre] = useState("Casa");
  const [newDirDireccion, setNewDirDireccion] = useState("");
  const [newDirBarrio, setNewDirBarrio] = useState("");

  // Wallet
  const [wallet, setWallet] = useState<{ saldo: number; movimientos: any[] } | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositMonto, setDepositMonto] = useState("");
  const [depositRef, setDepositRef] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMsg, setDepositMsg] = useState("");

  // Métodos de pago
  const [metodos, setMetodos] = useState<any[]>([]);
  const [showAddMetodo, setShowAddMetodo] = useState(false);
  const [newTipo, setNewTipo] = useState("transferencia");
  const [newTitular, setNewTitular] = useState("");

  // Pedidos activos + historial
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [showAllOrders, setShowAllOrders] = useState(false);

  // Cargar datos
  useEffect(() => {
    const saved = localStorage.getItem("cliente_telefono");
    const savedName = localStorage.getItem("cliente_nombre") || "";
    const savedEmail = localStorage.getItem("cliente_email") || "";
    if (saved) {
      setTelefono(saved);
      setEditPhone(saved);
      loadWallet(saved);
      loadMetodos(saved);
      loadPedidos(saved);
    }
    if (savedName) { setDisplayName(savedName); setEditName(savedName); }
    if (savedEmail) { setDisplayEmail(savedEmail); setEditEmail(savedEmail); }
    loadDirecciones();
  }, []);

  // Refresh active orders every 10s
  useEffect(() => {
    if (!telefono) return;
    const interval = setInterval(() => loadPedidos(telefono), 10000);
    return () => clearInterval(interval);
  }, [telefono]);

  const loadWallet = async (tel: string) => {
    try {
      const res = await fetch(`/api/wallet?telefono=${encodeURIComponent(tel)}`);
      const data = await res.json();
      if (data && !data.error) setWallet(data);
    } catch {}
  };

  const loadMetodos = async (tel: string) => {
    try {
      const data = await fetchData("metodos_pago", {
        filters: [{ method: "eq", column: "cliente_telefono", value: tel }],
      });
      if (data) setMetodos(data);
    } catch {}
  };

  const loadPedidos = async (tel: string) => {
    try {
      const data = await fetchData("pedidos_cliente", {
        select: "*, negocios(nombre)",
        filters: [{ method: "eq", column: "cliente_telefono", value: tel }],
        order: [{ column: "created_at", ascending: false }],
      });
      if (data) setPedidos(data);
    } catch {}
  };

  const loadDirecciones = () => {
    try {
      const saved = localStorage.getItem("cliente_direcciones");
      if (saved) setDirecciones(JSON.parse(saved));
    } catch {}
  };

  const saveDirecciones = (dirs: Direccion[]) => {
    setDirecciones(dirs);
    localStorage.setItem("cliente_direcciones", JSON.stringify(dirs));
  };

  const handleEditProfile = async () => {
    setEditError(""); setEditMsg("");
    let changed = false;

    if (editName !== displayName) {
      localStorage.setItem("cliente_nombre", editName);
      setDisplayName(editName);
      changed = true;
    }
    if (editEmail !== displayEmail) {
      localStorage.setItem("cliente_email", editEmail);
      setDisplayEmail(editEmail);
      changed = true;
    }
    if (editPhone !== telefono) {
      localStorage.setItem("cliente_telefono", editPhone);
      setTelefono(editPhone);
      loadMetodos(editPhone);
      loadWallet(editPhone);
      loadPedidos(editPhone);
      changed = true;
    }
    if (editPassword && editPassword.length >= 6) {
      if (user) {
        try {
          const { error } = await supabase.auth.updateUser({ password: editPassword });
          if (error) { setEditError(error.message); return; }
          setEditMsg("Contraseña actualizada.");
          setEditPassword("");
          changed = true;
        } catch { setEditError("Error al cambiar contraseña"); return; }
      } else {
        setEditMsg("Configura una cuenta con email/contraseña desde el registro para cambiar tu clave.");
      }
    }
    if (editPassword && editPassword.length > 0 && editPassword.length < 6) {
      setEditError("La contraseña debe tener al menos 6 caracteres"); return;
    }
    if (changed) setEditMsg("Perfil actualizado correctamente.");
    else setEditError("No hay cambios para guardar.");
  };

  const agregarDireccion = () => {
    if (!newDirDireccion.trim()) return;
    const nueva: Direccion = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      nombre: newDirNombre.trim() || "Casa",
      direccion: newDirDireccion.trim(),
      barrio: newDirBarrio.trim(),
      principal: direcciones.length === 0,
    };
    saveDirecciones([...direcciones, nueva]);
    setNewDirNombre("Casa"); setNewDirDireccion(""); setNewDirBarrio("");
    setShowAddDir(false);
  };

  const eliminarDireccion = (id: string) => {
    saveDirecciones(direcciones.filter(d => d.id !== id));
  };

  const setPrincipalDir = (id: string) => {
    saveDirecciones(direcciones.map(d => ({ ...d, principal: d.id === id })));
  };

  const agregarMetodo = async () => {
    if (!telefono) return;
    try {
      const res = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "metodos_pago", action: "insert", data: { cliente_telefono: telefono, tipo: newTipo, titular: newTitular || null } }),
      });
      const result = await res.json();
      if (result) { setMetodos(prev => [...prev, result]); setShowAddMetodo(false); setNewTitular(""); }
    } catch {}
  };

  const eliminarMetodo = async (id: string) => {
    try {
      await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "metodos_pago", action: "delete", id }),
      });
      setMetodos(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  const pedidosCount = pedidos.length > 0 ? pedidos.length.toString() : "—";
  const activeOrders = pedidos.filter(p => p.estado !== "entregado" && p.estado !== "cancelado").slice(0, 2);
  const completedOrders = pedidos.filter(p => p.estado === "entregado" || p.estado === "cancelado");

  return (
    <div className="min-h-screen px-5 pt-5 pb-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/25">
            <User size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#F8FAFC]">Perfil</h1>
            <p className="text-[10px] text-slate-500 font-medium">Gestiona tu cuenta</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(!showSettings)}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 ${showSettings ? "bg-[#10B981]/20 border border-[#10B981]/40 shadow-lg shadow-[#10B981]/10" : "bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10"}`}>
          <Settings size={19} className={`transition-all duration-300 ${showSettings ? "text-[#10B981] rotate-90" : "text-slate-400"}`} />
        </button>
      </div>

      {/* PROFILE CARD */}
      <div className="rounded-3xl mb-5 overflow-hidden border border-white/10 bg-gradient-to-br from-[#10B981]/[0.12] via-[#0F172A] to-[#059669]/[0.06] backdrop-blur-xl animate-fade-up">
        <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-[#10B981]/10 to-transparent pointer-events-none" />
        <div className="relative pt-8 pb-6 px-6 text-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#10B981]/40 via-[#10B981]/20 to-[#059669]/10 flex items-center justify-center mx-auto mb-4 border-[3px] border-[#10B981]/40 shadow-2xl shadow-[#10B981]/20 ring-4 ring-[#10B981]/5">
            <User size={48} className="text-[#10B981]" />
          </div>
          <h2 className="text-2xl font-black text-[#F8FAFC] tracking-tight">{displayName || "Cliente"}</h2>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">{displayEmail || "Sin correo registrado"}</p>
          {telefono && <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5"><Phone size={11} className="text-[#10B981]/60" /> <span className="text-slate-400/70">{telefono}</span></p>}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: "Pedidos", value: pedidosCount, color: "#10B981", icon: Package },
              { label: "Favoritos", value: "8", color: "#f87171", icon: Gift },
              { label: "Puntos", value: "320", color: "#34d399", icon: DollarSign },
            ].map((s) => {
              const SIcon = s.icon;
              return (
                <div key={s.label} className="text-center p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.07] transition-all duration-300 group">
                  <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: `${s.color}15` }}>
                    <SIcon size={14} style={{ color: s.color }} />
                  </div>
                  <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* === SETTINGS / AJUSTES === */}
      {showSettings && (
        <div className="rounded-3xl p-5 mb-5 bg-white/[0.04] border border-white/10 backdrop-blur-2xl animate-scale-in shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/20">
              <Settings size={19} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#F8FAFC]">Ajustes del perfil</h3>
              <p className="text-[10px] text-slate-400">Actualiza tu información personal</p>
            </div>
          </div>

          {editMsg && (
            <div className="p-3.5 mb-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/25 flex items-center gap-2.5 backdrop-blur-sm">
              <CheckCircle size={15} className="text-[#10B981] shrink-0" />
              <p className="text-xs text-[#10B981] font-medium">{editMsg}</p>
            </div>
          )}
          {editError && (
            <div className="p-3.5 mb-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center gap-2.5 backdrop-blur-sm">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400 font-medium">{editError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1.5px] block mb-2">Nombre</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Tu nombre" className="w-full h-[46px] px-4 rounded-2xl bg-[#1E293B]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 backdrop-blur-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1.5px] block mb-2">Email</label>
              <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                placeholder="correo@ejemplo.com" className="w-full h-[46px] px-4 rounded-2xl bg-[#1E293B]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 backdrop-blur-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1.5px] block mb-2">Teléfono</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                placeholder="Número de teléfono" className="w-full h-[46px] px-4 rounded-2xl bg-[#1E293B]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 backdrop-blur-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1.5px] block mb-2">
                <Key size={10} className="inline mr-1" /> Contraseña
              </label>
              <div className="relative">
                <input type={editShowPassword ? "text" : "password"} value={editPassword} onChange={e => setEditPassword(e.target.value)}
                  placeholder="Nueva contraseña (dejar vacío para no cambiar)" className="w-full h-[46px] px-4 pr-11 rounded-2xl bg-[#1E293B]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 backdrop-blur-sm" />
                <button onClick={() => setEditShowPassword(!editShowPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {editShowPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button onClick={handleEditProfile}
              className="w-full h-[48px] rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#10B981]/30 active:scale-[0.98] transition-all duration-300">
              <Save size={16} /> Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* === ACTIVE ORDERS (monitoreo en tiempo real) === */}
      {activeOrders.length > 0 && (
        <div className="mb-5 animate-fade-up">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#10B981]/15 flex items-center justify-center">
              <Package size={11} className="text-[#10B981]" />
            </div>
            Pedido activo
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">En vivo</span>
            </span>
          </h3>
          {activeOrders.map(p => (
            <button key={p.id} onClick={() => router.push(`/cliente/seguimiento/${p.codigo}`)}
              className="w-full rounded-3xl p-5 mb-2.5 text-left border border-[#10B981]/25 bg-gradient-to-r from-[#10B981]/[0.1] via-[#10B981]/[0.05] to-transparent backdrop-blur-xl active:scale-[0.98] transition-all duration-300 hover:border-[#10B981]/40 hover:shadow-lg hover:shadow-[#10B981]/10 group">
              <div className="flex items-center justify-between mb-3.5">
                <span className="font-black text-sm text-white">#{p.codigo}</span>
                <span className="px-3.5 py-1.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 backdrop-blur-sm">
                  {estadoLabel[p.estado] || p.estado}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 flex items-center justify-center">
                    <Bike size={15} className="text-[#10B981]" />
                  </div>
                  <span className="text-sm font-semibold text-white">{p.negocios?.nombre || "Negocio"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#10B981] group-hover:translate-x-1 transition-transform duration-300">
                  <Navigation size={12} />
                  <span className="text-xs font-medium">Ver seguimiento</span>
                  <ChevronRight size={15} />
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden backdrop-blur-sm">
                <div className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#34d399] transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.4)]" style={{ width: `${Math.min(((estadoStep[p.estado] ?? 0) + 1) * 25, 100)}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* === DIRECCIONES === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/[0.04] border border-white/10 backdrop-blur-xl animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#10B981]/15 flex items-center justify-center">
              <MapPin size={11} className="text-[#10B981]" />
            </div>
            Direcciones
          </h3>
          <button onClick={() => setShowAddDir(!showAddDir)} className="text-xs font-bold flex items-center gap-1 text-[#10B981] hover:text-[#34d399] transition-colors px-3 py-1.5 rounded-xl bg-[#10B981]/10 hover:bg-[#10B981]/15 transition-all duration-300">
            <Plus size={14} /> {showAddDir ? "Cancelar" : "Agregar"}
          </button>
        </div>

        {showAddDir && (
          <div className="bg-[#1E293B]/80 rounded-2xl p-4 mb-4 border border-white/10 backdrop-blur-xl space-y-3 animate-scale-in">
            <div className="flex gap-2">
              {["Casa", "Trabajo", "Otro"].map(n => (
                <button key={n} onClick={() => setNewDirNombre(n)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 ${newDirNombre === n ? "bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/20" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                  {n}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Dirección *" value={newDirDireccion} onChange={e => setNewDirDireccion(e.target.value)}
              className="w-full h-[46px] px-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all duration-300" />
            <input type="text" placeholder="Barrio / Referencia" value={newDirBarrio} onChange={e => setNewDirBarrio(e.target.value)}
              className="w-full h-[46px] px-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all duration-300" />
            <button onClick={agregarDireccion} className="w-full h-[46px] rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm active:scale-[0.98] transition-all duration-300 shadow-lg shadow-[#10B981]/20">Guardar dirección</button>
          </div>
        )}

        {direcciones.length === 0 && !showAddDir && (
          <p className="text-xs text-slate-500 py-4 text-center opacity-50">No tienes direcciones guardadas</p>
        )}
        {direcciones.map(d => (
          <div key={d.id} className="flex items-start gap-3 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] rounded-xl px-1 -mx-1 transition-all duration-300 group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-105 ${d.principal ? "bg-gradient-to-br from-[#10B981]/20 to-[#059669]/10 border border-[#10B981]/20" : "bg-white/5 border border-white/[0.06]"}`}>
              <MapPin size={16} className={d.principal ? "text-[#10B981]" : "text-slate-500"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#F8FAFC]">{d.nombre}</p>
                {d.principal && <span className="px-2 py-0.5 rounded-lg text-[8px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/20">Principal</span>}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{d.direccion}</p>
              {d.barrio && <p className="text-[10px] text-slate-500">{d.barrio}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!d.principal && (
                <button onClick={() => setPrincipalDir(d.id)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center active:scale-90 transition-all duration-300 hover:bg-white/10" title="Marcar como principal">
                  <Home size={13} className="text-slate-400" />
                </button>
              )}
              <button onClick={() => eliminarDireccion(d.id)} className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center active:scale-90 transition-all duration-300 hover:bg-red-500/15">
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* === BILLETERA DOMIPAY === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/[0.04] border border-white/10 backdrop-blur-xl animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#10B981]/15 flex items-center justify-center">
              <Wallet size={11} className="text-[#10B981]" />
            </div>
            Billetera DomiPay
          </h3>
          <button onClick={() => setShowDeposit(!showDeposit)} className="text-xs font-bold flex items-center gap-1 text-[#10B981] hover:text-[#34d399] transition-colors px-3 py-1.5 rounded-xl bg-[#10B981]/10 hover:bg-[#10B981]/15 transition-all duration-300">
            <Plus size={14} /> {showDeposit ? "Cancelar" : "Recargar"}
          </button>
        </div>

        {wallet ? (
          <div className="p-6 rounded-3xl mb-4 bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857] shadow-2xl shadow-[#10B981]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.08] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/[0.05] rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <p className="text-xs text-white/70 font-semibold mb-1.5 uppercase tracking-wider">Saldo disponible</p>
              <p className="text-4xl font-black text-white tracking-tight">${wallet.saldo.toLocaleString()}</p>
              <div className="flex gap-2.5 mt-5">
                <button onClick={() => setShowDeposit(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-bold hover:bg-white/30 transition-all duration-300 active:scale-95 border border-white/10">
                  <ArrowUpRight size={15} /> Recargar
                </button>
              </div>
            </div>
          </div>
        ) : telefono && wallet === null ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center opacity-50">Guarda tu teléfono para activar tu billetera</p>
        )}

        {showDeposit && telefono && (
          <div className="bg-[#1E293B]/80 rounded-2xl p-4 border border-white/10 backdrop-blur-xl animate-scale-in space-y-3">
            <p className="text-xs font-semibold text-slate-300">Solicitar recarga</p>
            <p className="text-[10px] text-slate-500">Transfiere a Nequi 3113748405 y sube el comprobante</p>
            <input type="number" placeholder="Monto a recargar" value={depositMonto} onChange={e => setDepositMonto(e.target.value)} className="w-full h-[46px] px-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all duration-300" />
            <input type="text" placeholder="Referencia de la transferencia" value={depositRef} onChange={e => setDepositRef(e.target.value)} className="w-full h-[46px] px-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all duration-300" />
            {depositMsg && <p className={`text-xs font-medium ${depositMsg.includes("enviada") ? "text-[#10B981]" : ""}`}>{depositMsg}</p>}
            <button onClick={async () => {
              if (!depositMonto || Number(depositMonto) <= 0) return;
              setDepositLoading(true); setDepositMsg("");
              try {
                const res = await fetch("/api/wallet", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "depositar", cliente_telefono: telefono, monto: Number(depositMonto), referencia: depositRef }),
                });
                const data = await res.json();
                if (data.success) { setDepositMsg("Solicitud enviada."); setDepositMonto(""); setDepositRef(""); setShowDeposit(false); }
                else setDepositMsg(data.error || "Error");
              } catch { setDepositMsg("Error de conexión"); }
              setDepositLoading(false);
            }} disabled={depositLoading || !depositMonto}
              className="w-full h-[46px] rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-[#10B981]/20">
              {depositLoading ? "Enviando..." : "Solicitar recarga"}
            </button>
          </div>
        )}

        {wallet?.movimientos && wallet.movimientos.length > 0 && (
          <div className="mt-4 max-h-44 overflow-y-auto rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1.5px] mb-2.5">Últimos movimientos</p>
            {wallet.movimientos.slice(0, 10).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-all duration-300">
                <div>
                  <p className="text-xs font-medium text-slate-300">{m.tipo === "deposito" ? "Recarga" : m.tipo === "pago" ? "Pago pedido" : m.tipo}</p>
                  <p className="text-[9px] text-slate-500">{m.referencia || new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${m.tipo === "pago" ? "text-red-400" : "text-[#10B981]"}`}>
                    {m.tipo === "pago" ? "-" : "+"}${m.monto.toLocaleString()}
                  </p>
                  <p className={`text-[9px] ${m.estado === "confirmado" ? "text-[#10B981]/60" : m.estado === "pendiente" ? "text-yellow-400/60" : "text-red-400/60"}`}>{m.estado}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === MÉTODOS DE PAGO === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/[0.04] border border-white/10 backdrop-blur-xl animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#10B981]/15 flex items-center justify-center">
              <CreditCard size={11} className="text-[#10B981]" />
            </div>
            Métodos de pago
          </h3>
          <button onClick={() => setShowAddMetodo(!showAddMetodo)} className="text-xs font-bold flex items-center gap-1 text-[#10B981] hover:text-[#34d399] transition-colors px-3 py-1.5 rounded-xl bg-[#10B981]/10 hover:bg-[#10B981]/15 transition-all duration-300">
            <Plus size={14} /> {showAddMetodo ? "Cancelar" : "Agregar"}
          </button>
        </div>

        {showAddMetodo && (
          <div className="bg-[#1E293B]/80 rounded-2xl p-4 mb-4 border border-white/10 backdrop-blur-xl space-y-3 animate-scale-in">
            <select value={newTipo} onChange={e => setNewTipo(e.target.value)} className="w-full h-[46px] px-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 text-sm text-[#F8FAFC] outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all duration-300">
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">DaviPlata</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
            <input type="text" placeholder="Titular / Referencia" value={newTitular} onChange={e => setNewTitular(e.target.value)}
              className="w-full h-[46px] px-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all duration-300" />
            <button onClick={agregarMetodo} className="w-full h-[46px] rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm active:scale-[0.98] transition-all duration-300 shadow-lg shadow-[#10B981]/20">Guardar</button>
          </div>
        )}

        {metodos.length === 0 && !showAddMetodo && (
          <p className="text-xs text-slate-500 py-4 text-center opacity-50">No tienes métodos de pago guardados</p>
        )}
        {metodos.map(m => {
          const Icon = metodoIcons[m.tipo] || CreditCard;
          return (
            <div key={m.id} className="flex items-center gap-4 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] rounded-xl px-1 -mx-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#10B981]/15 to-[#059669]/5 border border-[#10B981]/15 transition-all duration-300 group-hover:scale-105 group-hover:border-[#10B981]/25">
                <Icon size={19} className="text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#F8FAFC]">{metodoLabels[m.tipo] || m.tipo}</p>
                {m.titular && <p className="text-[10px] text-slate-400">{m.titular}</p>}
              </div>
              <button onClick={() => eliminarMetodo(m.id)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 bg-red-500/10 border border-red-500/15 hover:bg-red-500/20">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* === NOTIFICACIONES === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/[0.04] border border-white/10 backdrop-blur-xl animate-fade-up">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-4 flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-[#10B981]/15 flex items-center justify-center">
            <Bell size={11} className="text-[#10B981]" />
          </div>
          Notificaciones
        </h3>
        <button onClick={solicitarPermiso} className="flex items-center gap-4 py-3 w-full text-left rounded-2xl px-2 -mx-2 hover:bg-white/[0.03] transition-all duration-300 group">
          <div className={`w-13 h-13 p-0.5 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${permiso === "granted" ? "bg-gradient-to-br from-[#10B981]/20 to-[#059669]/10 border border-[#10B981]/25 shadow-lg shadow-[#10B981]/10" : "bg-white/5 border border-white/10"}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${permiso === "granted" ? "bg-[#10B981]/15" : "bg-transparent"}`}>
              {permiso === "granted" ? <BellRing size={22} className="text-[#10B981]" /> : <BellOff size={22} className="text-slate-400" />}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#F8FAFC]">Notificaciones push</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {permiso === "granted" ? "Activadas — recibirás alertas de tus pedidos" :
               permiso === "denied" ? "Bloqueadas — habilítalas desde tu navegador" : "Toca para activar notificaciones"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {noLeidas > 0 && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25">{noLeidas} nuevas</span>}
            <div className={`w-11 h-6 rounded-full flex items-center transition-all duration-300 ${permiso === "granted" ? "bg-[#10B981] justify-end" : "bg-white/10 justify-start"}`}>
              <div className={`w-5 h-5 rounded-full mx-0.5 transition-all duration-300 ${permiso === "granted" ? "bg-white shadow-md" : "bg-slate-500"}`} />
            </div>
          </div>
        </button>
      </div>

      {/* === HISTORIAL DE PEDIDOS === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/[0.04] border border-white/10 backdrop-blur-xl animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#10B981]/15 flex items-center justify-center">
              <Package size={11} className="text-[#10B981]" />
            </div>
            Historial de pedidos
          </h3>
          {pedidos.length > 0 && (
            <button onClick={() => setShowAllOrders(!showAllOrders)} className="text-xs font-bold text-[#10B981] flex items-center gap-1 hover:text-[#34d399] transition-colors px-3 py-1.5 rounded-xl bg-[#10B981]/10 hover:bg-[#10B981]/15 transition-all duration-300">
              {showAllOrders ? "Menos" : `Todos (${pedidos.length})`} <ChevronRight size={10} />
            </button>
          )}
        </div>

        {pedidos.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
              <Package size={26} className="text-slate-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Aún no tienes pedidos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(showAllOrders ? pedidos : pedidos.slice(0, 3)).map((p, i) => (
              <button key={p.id} onClick={() => router.push(`/cliente/seguimiento/${p.codigo}`)}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] active:scale-[0.98] transition-all duration-300 text-left hover:bg-white/[0.06] hover:border-white/10 group">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 ${p.estado === "entregado" ? "bg-gradient-to-br from-[#10B981]/20 to-[#059669]/10 border border-[#10B981]/20" : "bg-white/5 border border-white/[0.08]"}`}>
                  {p.estado === "entregado" ? <CheckCircle size={19} className="text-[#10B981]" /> : <Clock size={19} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F8FAFC]">#{p.codigo}</p>
                  <p className="text-[10px] text-slate-400">{p.negocios?.nombre || "Negocio"} · {new Date(p.created_at).toLocaleDateString("es-CO")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-[#F8FAFC]">${p.total.toLocaleString()}</p>
                  <p className={`text-[9px] font-medium ${p.estado === "entregado" ? "text-[#10B981]/70" : p.estado === "cancelado" ? "text-red-400/70" : "text-yellow-400/70"}`}>{estadoLabel[p.estado] || p.estado}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* === CERRAR SESIÓN === */}
      <button onClick={() => logout()}
        className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 active:scale-[0.97] bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/20 text-red-400 hover:from-red-500/15 hover:to-red-600/10 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 backdrop-blur-xl">
        <LogOut size={17} /> Cerrar sesión
      </button>
      <p className="text-center text-[10px] mt-6 text-slate-600 opacity-30">DomiU Magdalena v2.0</p>
    </div>
  );
}
