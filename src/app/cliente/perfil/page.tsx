"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Bell, MapPin, CreditCard, HelpCircle, Plus, Trash2, Banknote, Smartphone, LogOut, BellRing, BellOff, Settings, Gift, Wallet, DollarSign, ArrowUpRight, Mail, Phone, Calendar, MapPin as MapPinIcon } from "lucide-react";
import { fetchData } from "@/lib/client-data";
import { useNotificaciones } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";

const metodoIcons: Record<string, any> = { efectivo: Banknote, transferencia: CreditCard, nequi: Smartphone, daviplata: Smartphone, tarjeta: CreditCard };
const metodoLabels: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", nequi: "Nequi", daviplata: "DaviPlata", tarjeta: "Tarjeta" };

const quickActions = [
  { icon: MapPin, label: "Direcciones", desc: "Gestiona tus direcciones", color: "#60a5fa" },
  { icon: Gift, label: "Promociones", desc: "Cupones y descuentos", color: "#facc15" },
  { icon: HelpCircle, label: "Ayuda", desc: "Preguntas frecuentes", color: "#34d399" },
  { icon: Settings, label: "Ajustes", desc: "Preferencias de la app", color: "#fb923c" },
];

export default function PerfilPage() {
  const router = useRouter();
  const { user, profile, initialized, logout } = useAuth();
  const [telefono, setTelefono] = useState("");
  const [metodos, setMetodos] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTipo, setNewTipo] = useState("transferencia");
  const [newTitular, setNewTitular] = useState("");
  const { noLeidas, permiso, solicitarPermiso } = useNotificaciones();
  const [wallet, setWallet] = useState<{ saldo: number; movimientos: any[] } | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositMonto, setDepositMonto] = useState("");
  const [depositRef, setDepositRef] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMsg, setDepositMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("cliente_telefono");
    if (saved) {
      setTelefono(saved);
      fetchData("metodos_pago", { filters: [{ method: "eq", column: "cliente_telefono", value: saved }] }).then((data: any) => {
        if (data) setMetodos(data);
      }).catch(() => {});
      fetchWallet(saved);
    }
  }, []);

  const fetchWallet = async (tel: string) => {
    try {
      const res = await fetch(`/api/wallet?telefono=${encodeURIComponent(tel)}`);
      const data = await res.json();
      if (data && !data.error) setWallet(data);
    } catch {}
  };

  const guardarTelefono = () => {
    if (!telefono.trim()) return;
    localStorage.setItem("cliente_telefono", telefono);
    fetchData("metodos_pago", { filters: [{ method: "eq", column: "cliente_telefono", value: telefono.trim() }] }).then((data: any) => {
      if (data) setMetodos(data);
    }).catch(() => {});
    fetchWallet(telefono.trim());
  };

  const agregarMetodo = async () => {
    if (!telefono) return;
    try {
      const res = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "metodos_pago", action: "insert", data: { cliente_telefono: telefono, tipo: newTipo, titular: newTitular || null } }),
      });
      const result = await res.json();
      if (result) { setMetodos(prev => [...prev, result]); setShowAdd(false); setNewTitular(""); }
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

  const pedidosCount = metodos.length > 0 ? "12" : "\u2014";

  return (
    <div className="min-h-screen px-5 pt-5 pb-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
          <User size={20} className="text-yellow-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Perfil</h1>
      </div>

      <div className="glass-card p-6 text-center mb-5 animate-fade-up" style={{ background: "linear-gradient(180deg, rgba(250,204,21,0.06) 0%, transparent 100%)" }}>
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-yellow-400/20 shadow-lg bg-yellow-400/10">
          <User size={42} className="text-yellow-400" />
        </div>
        <h2 className="text-xl font-black text-white">{profile?.nombre || "Cliente"}</h2>
        <p className="text-xs text-slate-400 mt-1">{profile?.email || user?.email || "Bienvenido a DomiU"}</p>
        <div className="mt-4 space-y-2 text-left">
          {profile?.email && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail size={12} className="text-yellow-400" /> {profile.email}
            </div>
          )}
          {telefono && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Phone size={12} className="text-yellow-400" /> {telefono}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[{ label: "Pedidos", value: pedidosCount, color: "var(--primary)" }, { label: "Favoritos", value: "8", color: "#f87171" }, { label: "Puntos", value: "320", color: "#34d399" }].map((s) => (
            <div key={s.label} className="text-center p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5 mb-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-3">Tu teléfono</h3>
        <div className="flex gap-2">
          <input type="tel" placeholder="Tu número de teléfono" value={telefono}
            onChange={e => setTelefono(e.target.value)}
            className="input-field flex-1" />
          <button onClick={guardarTelefono} className="btn-primary text-sm !py-0 shrink-0">
            Guardar
          </button>
        </div>
      </div>

      <div className="glass-card p-5 mb-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px]">Billetera DomiPay</h3>
          {telefono && (
            <button onClick={() => setShowDeposit(!showDeposit)} className="text-xs font-bold flex items-center gap-1 text-yellow-400">
              <Plus size={14} /> {showDeposit ? "Cancelar" : "Recargar"}
            </button>
          )}
        </div>

        {telefono && wallet ? (
          <div className="p-5 rounded-2xl mb-3" style={{ background: "linear-gradient(135deg, #facc15 0%, #e6b800 100%)" }}>
            <p className="text-xs text-yellow-900/70 font-medium mb-1">Saldo disponible</p>
            <p className="text-3xl font-black text-yellow-950">${wallet.saldo.toLocaleString()}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDeposit(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-950/20 text-yellow-950 text-xs font-bold hover:bg-yellow-950/30 transition-all active:scale-95">
                <ArrowUpRight size={14} /> Recargar
              </button>
            </div>
          </div>
        ) : telefono && wallet === null ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-3 text-center opacity-50">Guarda tu teléfono para activar tu billetera</p>
        )}

        {showDeposit && telefono && (
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 animate-fade-up space-y-3">
            <p className="text-xs font-semibold text-slate-400">Solicitar recarga</p>
            <p className="text-[10px] text-slate-500">Transfiere a Nequi 3113748405 y sube el comprobante</p>
            <input type="number" placeholder="Monto a recargar *" value={depositMonto} onChange={e => setDepositMonto(e.target.value)} className="input-field" />
            <input type="text" placeholder="Referencia de la transferencia" value={depositRef} onChange={e => setDepositRef(e.target.value)} className="input-field" />
            {depositMsg && (
              <p className={`text-xs font-medium ${depositMsg.includes("enviada") ? "text-green-400" : ""}`}>{depositMsg}</p>
            )}
            <button onClick={async () => {
              if (!depositMonto || Number(depositMonto) <= 0) return;
              setDepositLoading(true);
              setDepositMsg("");
              try {
                const res = await fetch("/api/wallet", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "depositar", cliente_telefono: telefono, monto: Number(depositMonto), referencia: depositRef }),
                });
                const data = await res.json();
                if (data.success) {
                  setDepositMsg("Solicitud enviada. Espera confirmación del administrador.");
                  setDepositMonto("");
                  setDepositRef("");
                  setShowDeposit(false);
                } else { setDepositMsg(data.error || "Error"); }
              } catch { setDepositMsg("Error de conexión"); }
              setDepositLoading(false);
            }} disabled={depositLoading || !depositMonto}
              className="btn-primary w-full text-sm disabled:opacity-40">
              {depositLoading ? "Enviando..." : "Solicitar recarga"}
            </button>
          </div>
        )}

        {wallet && wallet.movimientos && wallet.movimientos.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px] mb-2">Últimos movimientos</p>
            {wallet.movimientos.slice(0, 10).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                <div>
                  <p className="text-xs font-medium text-slate-300">{m.tipo === "deposito" ? "Recarga" : m.tipo === "pago" ? "Pago pedido" : m.tipo}</p>
                  <p className="text-[9px] text-slate-500">{m.referencia || new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${m.tipo === "pago" ? "text-red-400" : "text-green-400"}`}>
                    {m.tipo === "pago" ? "-" : "+"}${m.monto.toLocaleString()}
                  </p>
                  <p className={`text-[9px] ${m.estado === "confirmado" ? "text-green-400/60" : m.estado === "pendiente" ? "text-yellow-400/60" : "text-red-400/60"}`}>
                    {m.estado}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-5 mb-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-3">Notificaciones</h3>
        <button onClick={solicitarPermiso} className="flex items-center gap-4 py-2 w-full text-left">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-700 ${permiso === "granted" ? "bg-green-500/10" : "bg-slate-800/50"}`}>
            {permiso === "granted" ? <BellRing size={20} className="text-green-400" /> : <BellOff size={20} className="text-slate-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Notificaciones push</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {permiso === "granted" ? "Activadas — recibirás alertas de tus pedidos" :
               permiso === "denied" ? "Bloqueadas — habilítalas desde tu navegador" :
               "Toca para activar notificaciones"}
            </p>
          </div>
          {noLeidas > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400">{noLeidas} nuevas</span>
          )}
        </button>
      </div>

      <div className="glass-card p-5 mb-4 animate-fade-up" style={{ animationDelay: "140ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px]">Métodos de pago</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs font-bold flex items-center gap-1 text-yellow-400">
            <Plus size={14} /> {showAdd ? "Cancelar" : "Agregar"}
          </button>
        </div>

        {showAdd && (
          <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 space-y-3 border border-slate-700 animate-fade-up">
            <select value={newTipo} onChange={e => setNewTipo(e.target.value)}
              className="input-field">
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">DaviPlata</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
            <input type="text" placeholder="Titular / Referencia" value={newTitular} onChange={e => setNewTitular(e.target.value)}
              className="input-field" />
            <button onClick={agregarMetodo} className="btn-primary w-full text-sm active:scale-[0.98]">Guardar</button>
          </div>
        )}

        {metodos.length === 0 && !showAdd && (
          <p className="text-xs text-slate-500 py-3 text-center opacity-50">No tienes métodos de pago guardados</p>
        )}
        {metodos.map(m => {
          const Icon = metodoIcons[m.tipo] || CreditCard;
          return (
            <div key={m.id} className="flex items-center gap-4 py-3 border-b border-slate-700 last:border-0">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-yellow-400/10">
                <Icon size={18} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{metodoLabels[m.tipo] || m.tipo}</p>
                {m.titular && <p className="text-[10px] text-slate-400">{m.titular}</p>}
              </div>
              <button onClick={() => eliminarMetodo(m.id)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-red-500/10">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {quickActions.map((item, i) => {
          const Icon = item.icon;
          return (
            <button key={i} className="glass-card p-5 text-left active:scale-[0.97] transition-all animate-fade-up" style={{ animationDelay: `${180 + i * 40}ms` }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${item.color}15` }}>
                <Icon size={20} style={{ color: item.color }} />
              </div>
              <p className="font-bold text-sm text-white">{item.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
            </button>
          );
        })}
      </div>

      <button onClick={() => logout()} className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] border border-slate-700 text-red-400">
        <LogOut size={16} /> Cerrar sesión
      </button>
      <p className="text-center text-[10px] mt-6 text-slate-600 opacity-30">DomiU Magdalena v2.0</p>
    </div>
  );
}
