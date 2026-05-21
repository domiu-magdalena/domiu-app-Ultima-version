"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Bell, MapPin, CreditCard, HelpCircle, ChevronRight, Plus, Trash2, CheckCircle, Banknote, Smartphone, LogOut, BellRing, BellOff, Settings, Gift } from "lucide-react";
import { fetchData } from "@/lib/client-data";
import { useNotificaciones } from "@/context/NotificationContext";

const metodoIcons: Record<string, any> = { efectivo: Banknote, transferencia: CreditCard, nequi: Smartphone, daviplata: Smartphone, tarjeta: CreditCard };
const metodoLabels: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", nequi: "Nequi", daviplata: "DaviPlata", tarjeta: "Tarjeta" };

const quickActions = [
  { icon: MapPin, label: "Direcciones", desc: "Gestiona tus direcciones", color: "#448AFF" },
  { icon: Gift, label: "Promociones", desc: "Cupones y descuentos", color: "#FF5252" },
  { icon: HelpCircle, label: "Ayuda", desc: "Preguntas frecuentes", color: "#00E676" },
  { icon: Settings, label: "Ajustes", desc: "Preferencias de la app", color: "#FF6B35" },
];

export default function PerfilPage() {
  const router = useRouter();
  const [telefono, setTelefono] = useState("");
  const [metodos, setMetodos] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTipo, setNewTipo] = useState("transferencia");
  const [newTitular, setNewTitular] = useState("");
  const { noLeidas, permiso, solicitarPermiso } = useNotificaciones();

  useEffect(() => {
    const saved = localStorage.getItem("cliente_telefono");
    if (saved) {
      setTelefono(saved);
      fetchData("metodos_pago", { filters: [{ method: "eq", column: "cliente_telefono", value: saved }] }).then((data: any) => {
        if (data) setMetodos(data);
      }).catch(() => {});
    }
  }, []);

  const guardarTelefono = () => {
    if (!telefono.trim()) return;
    localStorage.setItem("cliente_telefono", telefono);
    fetchData("metodos_pago", { filters: [{ method: "eq", column: "cliente_telefono", value: telefono.trim() }] }).then((data: any) => {
      if (data) setMetodos(data);
    }).catch(() => {});
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

  const pedidosCount = metodos.length > 0 ? "12" : "—";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-5 pt-5 pb-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-7">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary)10" }}>
          <User size={20} style={{ color: "var(--primary)" }} />
        </div>
        <h1 className="text-xl font-bold">Perfil</h1>
      </div>

      <div className="glass-card p-6 text-center mb-5 animate-fade-up" style={{ background: "linear-gradient(180deg, var(--primary)05 0%, transparent 100%)" }}>
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 shadow-lg" style={{ background: "var(--primary)15", borderColor: "var(--primary)20", boxShadow: "0 0 30px var(--primary)10" }}>
          <User size={42} style={{ color: "var(--primary)" }} />
        </div>
        <h2 className="text-xl font-black">Cliente</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Sin cuenta — pide sin registrarte</p>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[{ label: "Pedidos", value: pedidosCount, color: "var(--primary)" }, { label: "Favoritos", value: "8", color: "#FF5252" }, { label: "Puntos", value: "320", color: "#00E676" }].map((s) => (
            <div key={s.label} className="text-center p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5 mb-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[1.5px] mb-3">Tu teléfono</h3>
        <div className="flex gap-2">
          <input type="tel" placeholder="Tu número de teléfono" value={telefono}
            onChange={e => setTelefono(e.target.value)}
            className="input-field flex-1" />
          <button onClick={guardarTelefono} className="btn-primary text-sm !py-0 shrink-0">
            Guardar
          </button>
        </div>
      </div>

      <div className="glass-card p-5 mb-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[1.5px] mb-3">Notificaciones</h3>
        <button onClick={solicitarPermiso} className="flex items-center gap-4 py-2 w-full text-left">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-[var(--border-color)]`} style={permiso === "granted" ? { background: "var(--success)15" } : { background: "var(--bg-secondary)" }}>
            {permiso === "granted" ? <BellRing size={20} style={{ color: "var(--success)" }} /> : <BellOff size={20} className="text-[var(--text-secondary)]" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Notificaciones push</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {permiso === "granted" ? "Activadas — recibirás alertas de tus pedidos" :
               permiso === "denied" ? "Bloqueadas — habilítalas desde tu navegador" :
               "Toca para activar notificaciones"}
            </p>
          </div>
          {noLeidas > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "var(--error)15", color: "var(--error)" }}>{noLeidas} nuevas</span>
          )}
        </button>
      </div>

      <div className="glass-card p-5 mb-4 animate-fade-up" style={{ animationDelay: "140ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[1.5px]">Métodos de pago</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs font-bold flex items-center gap-1 hover:underline" style={{ color: "var(--primary)" }}>
            <Plus size={14} /> {showAdd ? "Cancelar" : "Agregar"}
          </button>
        </div>

        {showAdd && (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 mb-4 space-y-3 border border-[var(--border-color)] animate-fade-up">
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
          <p className="text-xs text-[var(--text-muted)] py-3 text-center" style={{ opacity: 0.5 }}>No tienes métodos de pago guardados</p>
        )}
        {metodos.map(m => {
          const Icon = metodoIcons[m.tipo] || CreditCard;
          return (
            <div key={m.id} className="flex items-center gap-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary)10" }}>
                <Icon size={18} style={{ color: "var(--primary)" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{metodoLabels[m.tipo] || m.tipo}</p>
                {m.titular && <p className="text-[10px] text-[var(--text-secondary)]">{m.titular}</p>}
              </div>
              <button onClick={() => eliminarMetodo(m.id)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: "var(--error)10" }}>
                <Trash2 size={14} style={{ color: "var(--error)" }} />
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
              <p className="font-bold text-sm">{item.label}</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{item.desc}</p>
            </button>
          );
        })}
      </div>

      <button onClick={() => router.push("/login")} className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97]" style={{ border: "1px solid var(--border-color)", color: "var(--error)" }}>
        <LogOut size={16} /> Ir a inicio de sesión
      </button>
      <p className="text-center text-[10px] mt-6" style={{ color: "var(--text-muted)", opacity: 0.3 }}>DomiU Magdalena v2.0</p>
    </div>
  );
}
