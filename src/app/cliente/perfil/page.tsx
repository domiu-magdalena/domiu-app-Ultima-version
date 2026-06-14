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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
            <User size={20} className="text-[#10B981]" />
          </div>
          <h1 className="text-xl font-black text-[#F8FAFC]">Perfil</h1>
        </div>
        <button onClick={() => setShowSettings(!showSettings)}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${showSettings ? "bg-[#10B981]/20 border border-[#10B981]/30" : "bg-white/5 border border-white/10"}`}>
          <Settings size={18} className={showSettings ? "text-[#10B981]" : "text-slate-400"} />
        </button>
      </div>

      {/* PROFILE CARD */}
      <div className="rounded-3xl p-6 mb-4 bg-gradient-to-b from-[#10B981]/[0.08] to-transparent border border-white/10 text-center animate-fade-up">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#10B981]/30 to-[#059669]/10 flex items-center justify-center mx-auto mb-4 border-2 border-[#10B981]/30 shadow-lg shadow-[#10B981]/10">
          <User size={40} className="text-[#10B981]" />
        </div>
        <h2 className="text-xl font-black text-[#F8FAFC]">{displayName || "Cliente"}</h2>
        <p className="text-xs text-slate-400 mt-1">{displayEmail || "Sin correo registrado"}</p>
        {telefono && <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1"><Phone size={10} /> {telefono}</p>}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Pedidos", value: pedidosCount, color: "#10B981" },
            { label: "Favoritos", value: "8", color: "#f87171" },
            { label: "Puntos", value: "320", color: "#34d399" },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* === SETTINGS / AJUSTES === */}
      {showSettings && (
        <div className="rounded-3xl p-5 mb-4 bg-white/5 border border-white/10 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
              <Settings size={18} className="text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#F8FAFC]">Ajustes del perfil</h3>
              <p className="text-[10px] text-slate-400">Actualiza tu información personal</p>
            </div>
          </div>

          {editMsg && (
            <div className="p-3 mb-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center gap-2">
              <CheckCircle size={14} className="text-[#10B981] shrink-0" />
              <p className="text-xs text-[#10B981]">{editMsg}</p>
            </div>
          )}
          {editError && (
            <div className="p-3 mb-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{editError}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px] block mb-1.5">Nombre</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Tu nombre" className="w-full h-[44px] px-4 rounded-xl bg-[#1E293B] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px] block mb-1.5">Email</label>
              <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                placeholder="correo@ejemplo.com" className="w-full h-[44px] px-4 rounded-xl bg-[#1E293B] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px] block mb-1.5">Teléfono</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                placeholder="Número de teléfono" className="w-full h-[44px] px-4 rounded-xl bg-[#1E293B] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px] block mb-1.5">
                <Key size={10} className="inline mr-1" /> Contraseña
              </label>
              <div className="relative">
                <input type={editShowPassword ? "text" : "password"} value={editPassword} onChange={e => setEditPassword(e.target.value)}
                  placeholder="Nueva contraseña (dejar vacío para no cambiar)" className="w-full h-[44px] px-4 pr-10 rounded-xl bg-[#1E293B] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] transition-colors" />
                <button onClick={() => setEditShowPassword(!editShowPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  {editShowPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button onClick={handleEditProfile}
              className="w-full h-[46px] rounded-xl bg-[#10B981] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#059669] active:scale-[0.98] transition-all shadow-lg shadow-[#10B981]/20">
              <Save size={16} /> Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* === ACTIVE ORDERS (monitoreo en tiempo real) === */}
      {activeOrders.length > 0 && (
        <div className="mb-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-3 flex items-center gap-1.5">
            <Package size={12} className="text-[#10B981]" /> Pedido activo
          </h3>
          {activeOrders.map(p => (
            <button key={p.id} onClick={() => router.push(`/cliente/seguimiento/${p.codigo}`)}
              className="w-full rounded-3xl p-5 mb-2 text-left border border-[#10B981]/30 bg-gradient-to-r from-[#10B981]/[0.08] to-transparent active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-sm text-white">#{p.codigo}</span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                  {estadoLabel[p.estado] || p.estado}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bike size={14} className="text-[#10B981]" />
                  <span className="text-sm font-semibold text-white">{p.negocios?.nombre || "Negocio"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation size={12} className="text-[#10B981]" />
                  <span className="text-xs text-slate-400">Ver seguimiento</span>
                  <ChevronRight size={14} className="text-slate-500" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[#10B981] transition-all duration-700" style={{ width: `${Math.min(((estadoStep[p.estado] ?? 0) + 1) * 25, 100)}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* === DIRECCIONES === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/5 border border-white/10 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] flex items-center gap-1.5">
            <MapPin size={12} className="text-[#10B981]" /> Direcciones
          </h3>
          <button onClick={() => setShowAddDir(!showAddDir)} className="text-xs font-bold flex items-center gap-1 text-[#10B981]">
            <Plus size={14} /> {showAddDir ? "Cancelar" : "Agregar"}
          </button>
        </div>

        {showAddDir && (
          <div className="bg-[#1E293B] rounded-2xl p-4 mb-4 border border-white/10 space-y-3 animate-scale-in">
            <div className="flex gap-2">
              {["Casa", "Trabajo", "Otro"].map(n => (
                <button key={n} onClick={() => setNewDirNombre(n)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${newDirNombre === n ? "bg-[#10B981] text-white" : "bg-white/5 text-slate-400"}`}>
                  {n}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Dirección *" value={newDirDireccion} onChange={e => setNewDirDireccion(e.target.value)}
              className="w-full h-[44px] px-4 rounded-xl bg-[#0F172A] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] transition-colors" />
            <input type="text" placeholder="Barrio / Referencia" value={newDirBarrio} onChange={e => setNewDirBarrio(e.target.value)}
              className="w-full h-[44px] px-4 rounded-xl bg-[#0F172A] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981] transition-colors" />
            <button onClick={agregarDireccion} className="w-full h-[44px] rounded-xl bg-[#10B981] text-white font-bold text-sm active:scale-[0.98] transition-all">Guardar dirección</button>
          </div>
        )}

        {direcciones.length === 0 && !showAddDir && (
          <p className="text-xs text-slate-500 py-3 text-center opacity-50">No tienes direcciones guardadas</p>
        )}
        {direcciones.map(d => (
          <div key={d.id} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${d.principal ? "bg-[#10B981]/15" : "bg-white/5"}`}>
              <MapPin size={16} className={d.principal ? "text-[#10B981]" : "text-slate-500"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#F8FAFC]">{d.nombre}</p>
                {d.principal && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#10B981]/10 text-[#10B981]">Principal</span>}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{d.direccion}</p>
              {d.barrio && <p className="text-[10px] text-slate-500">{d.barrio}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!d.principal && (
                <button onClick={() => setPrincipalDir(d.id)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center active:scale-90 transition-all" title="Marcar como principal">
                  <Home size={12} className="text-slate-400" />
                </button>
              )}
              <button onClick={() => eliminarDireccion(d.id)} className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center active:scale-90 transition-all">
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* === BILLETERA DOMIPAY === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/5 border border-white/10 animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] flex items-center gap-1.5">
            <Wallet size={12} className="text-[#10B981]" /> Billetera DomiPay
          </h3>
          <button onClick={() => setShowDeposit(!showDeposit)} className="text-xs font-bold flex items-center gap-1 text-[#10B981]">
            <Plus size={14} /> {showDeposit ? "Cancelar" : "Recargar"}
          </button>
        </div>

        {wallet ? (
          <div className="p-5 rounded-2xl mb-3 bg-gradient-to-br from-[#10B981] to-[#059669] shadow-lg shadow-[#10B981]/20">
            <p className="text-xs text-white/70 font-medium mb-1">Saldo disponible</p>
            <p className="text-3xl font-black text-white">${wallet.saldo.toLocaleString()}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDeposit(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-all active:scale-95">
                <ArrowUpRight size={14} /> Recargar
              </button>
            </div>
          </div>
        ) : telefono && wallet === null ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-3 text-center opacity-50">Guarda tu teléfono para activar tu billetera</p>
        )}

        {showDeposit && telefono && (
          <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/10 animate-scale-in space-y-3">
            <p className="text-xs font-semibold text-slate-400">Solicitar recarga</p>
            <p className="text-[10px] text-slate-500">Transfiere a Nequi 3113748405 y sube el comprobante</p>
            <input type="number" placeholder="Monto a recargar" value={depositMonto} onChange={e => setDepositMonto(e.target.value)} className="w-full h-[44px] px-4 rounded-xl bg-[#0F172A] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981]" />
            <input type="text" placeholder="Referencia de la transferencia" value={depositRef} onChange={e => setDepositRef(e.target.value)} className="w-full h-[44px] px-4 rounded-xl bg-[#0F172A] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981]" />
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
              className="w-full h-[44px] rounded-xl bg-[#10B981] text-white font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all">
              {depositLoading ? "Enviando..." : "Solicitar recarga"}
            </button>
          </div>
        )}

        {wallet?.movimientos && wallet.movimientos.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px] mb-2">Últimos movimientos</p>
            {wallet.movimientos.slice(0, 10).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
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
      <div className="rounded-3xl p-5 mb-4 bg-white/5 border border-white/10 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] flex items-center gap-1.5">
            <CreditCard size={12} className="text-[#10B981]" /> Métodos de pago
          </h3>
          <button onClick={() => setShowAddMetodo(!showAddMetodo)} className="text-xs font-bold flex items-center gap-1 text-[#10B981]">
            <Plus size={14} /> {showAddMetodo ? "Cancelar" : "Agregar"}
          </button>
        </div>

        {showAddMetodo && (
          <div className="bg-[#1E293B] rounded-2xl p-4 mb-4 border border-white/10 space-y-3 animate-scale-in">
            <select value={newTipo} onChange={e => setNewTipo(e.target.value)} className="w-full h-[44px] px-4 rounded-xl bg-[#0F172A] border border-white/10 text-sm text-[#F8FAFC] outline-none focus:border-[#10B981]">
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">DaviPlata</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
            <input type="text" placeholder="Titular / Referencia" value={newTitular} onChange={e => setNewTitular(e.target.value)}
              className="w-full h-[44px] px-4 rounded-xl bg-[#0F172A] border border-white/10 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#10B981]" />
            <button onClick={agregarMetodo} className="w-full h-[44px] rounded-xl bg-[#10B981] text-white font-bold text-sm active:scale-[0.98]">Guardar</button>
          </div>
        )}

        {metodos.length === 0 && !showAddMetodo && (
          <p className="text-xs text-slate-500 py-3 text-center opacity-50">No tienes métodos de pago guardados</p>
        )}
        {metodos.map(m => {
          const Icon = metodoIcons[m.tipo] || CreditCard;
          return (
            <div key={m.id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#10B981]/10">
                <Icon size={18} className="text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#F8FAFC]">{metodoLabels[m.tipo] || m.tipo}</p>
                {m.titular && <p className="text-[10px] text-slate-400">{m.titular}</p>}
              </div>
              <button onClick={() => eliminarMetodo(m.id)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-red-500/10">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* === NOTIFICACIONES === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/5 border border-white/10 animate-fade-up">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-3 flex items-center gap-1.5">
          <Bell size={12} className="text-[#10B981]" /> Notificaciones
        </h3>
        <button onClick={solicitarPermiso} className="flex items-center gap-4 py-2 w-full text-left">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 ${permiso === "granted" ? "bg-[#10B981]/10" : "bg-white/5"}`}>
            {permiso === "granted" ? <BellRing size={20} className="text-[#10B981]" /> : <BellOff size={20} className="text-slate-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#F8FAFC]">Notificaciones push</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {permiso === "granted" ? "Activadas — recibirás alertas de tus pedidos" :
               permiso === "denied" ? "Bloqueadas — habilítalas desde tu navegador" : "Toca para activar notificaciones"}
            </p>
          </div>
          {noLeidas > 0 && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981]">{noLeidas} nuevas</span>}
        </button>
      </div>

      {/* === HISTORIAL DE PEDIDOS === */}
      <div className="rounded-3xl p-5 mb-4 bg-white/5 border border-white/10 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] flex items-center gap-1.5">
            <Package size={12} className="text-[#10B981]" /> Historial de pedidos
          </h3>
          {pedidos.length > 0 && (
            <button onClick={() => setShowAllOrders(!showAllOrders)} className="text-xs font-bold text-[#10B981] flex items-center gap-1">
              {showAllOrders ? "Mostrar menos" : `Ver todos (${pedidos.length})`} <ChevronRight size={10} />
            </button>
          )}
        </div>

        {pedidos.length === 0 ? (
          <div className="text-center py-6">
            <Package size={24} className="mx-auto text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">Aún no tienes pedidos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(showAllOrders ? pedidos : pedidos.slice(0, 3)).map((p, i) => (
              <button key={p.id} onClick={() => router.push(`/cliente/seguimiento/${p.codigo}`)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-[0.98] transition-all text-left">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.estado === "entregado" ? "bg-[#10B981]/10" : "bg-white/5"}`}>
                  {p.estado === "entregado" ? <CheckCircle size={18} className="text-[#10B981]" /> : <Clock size={18} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F8FAFC]">#{p.codigo}</p>
                  <p className="text-[10px] text-slate-400">{p.negocios?.nombre || "Negocio"} · {new Date(p.created_at).toLocaleDateString("es-CO")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-[#F8FAFC]">${p.total.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-500">{estadoLabel[p.estado] || p.estado}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* === CERRAR SESIÓN === */}
      <button onClick={() => logout()}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] border border-white/10 text-red-400 hover:bg-red-500/5">
        <LogOut size={16} /> Cerrar sesión
      </button>
      <p className="text-center text-[10px] mt-6 text-slate-600 opacity-30">DomiU Magdalena v2.0</p>
    </div>
  );
}
