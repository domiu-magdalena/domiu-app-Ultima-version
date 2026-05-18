"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Bell, MapPin, CreditCard, HelpCircle, ChevronRight, Plus, Trash2, CheckCircle, Banknote, Smartphone, LogOut, BellRing, BellOff } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotificaciones } from "@/context/NotificationContext";

const metodoIcons: Record<string, any> = { efectivo: Banknote, transferencia: CreditCard, nequi: Smartphone, daviplata: Smartphone, tarjeta: CreditCard };
const metodoLabels: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", nequi: "Nequi", daviplata: "DaviPlata", tarjeta: "Tarjeta" };

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
      getSupabaseClient().from("metodos_pago").select("*").eq("cliente_telefono", saved).then(({ data }) => {
        if (data) setMetodos(data);
      });
    }
  }, []);

  const guardarTelefono = () => {
    if (!telefono.trim()) return;
    localStorage.setItem("cliente_telefono", telefono);
    getSupabaseClient().from("metodos_pago").select("*").eq("cliente_telefono", telefono.trim()).then(({ data }) => {
      if (data) setMetodos(data);
    });
  };

  const agregarMetodo = async () => {
    if (!telefono) return;
    const { data } = await getSupabaseClient().from("metodos_pago").insert({ cliente_telefono: telefono, tipo: newTipo, titular: newTitular || null }).select().single();
    if (data) { setMetodos(prev => [...prev, data]); setShowAdd(false); setNewTitular(""); }
  };

  const eliminarMetodo = async (id: string) => {
    await getSupabaseClient().from("metodos_pago").delete().eq("id", id);
    setMetodos(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="px-4 pt-5 pb-4 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[var(--rappi-yellow)]/15 flex items-center justify-center">
          <User size={20} className="text-[var(--rappi-yellow)]" />
        </div>
        <h1 className="text-lg font-bold">Perfil</h1>
      </div>

      {/* Avatar */}
      <div className="rappi-card p-6 text-center mb-5 bg-gradient-to-b from-[var(--rappi-yellow)]/5 to-transparent">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--rappi-yellow)]/30 to-[var(--rappi-yellow)]/5 flex items-center justify-center mx-auto mb-3 border-2 border-[var(--rappi-yellow)]/30 shadow-lg shadow-[var(--rappi-yellow)]/10">
          <User size={36} className="text-[var(--rappi-yellow)]" />
        </div>
        <p className="font-bold text-lg">Cliente</p>
        <p className="text-xs text-[var(--rappi-text-muted)] mt-1">Sin cuenta — pide sin registrarte</p>
      </div>

      {/* Phone */}
      <div className="rappi-card p-4 mb-4">
        <h3 className="text-xs text-[var(--rappi-text-muted)] uppercase tracking-widest font-semibold mb-3">Tu teléfono</h3>
        <div className="flex gap-2">
          <input type="tel" placeholder="Tu número de teléfono" value={telefono}
            onChange={e => setTelefono(e.target.value)}
            className="flex-1 bg-[var(--rappi-gray)]/50 border border-white/5 rounded-xl py-3 px-4 text-sm text-[var(--rappi-text)] placeholder-[var(--rappi-text-muted)]/40 outline-none focus:border-[var(--rappi-yellow)]/50 transition-all" />
          <button onClick={guardarTelefono} className="px-4 rounded-xl bg-[var(--rappi-yellow)] text-[var(--rappi-black)] font-bold text-sm hover:brightness-110 transition-all">
            Guardar
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="rappi-card p-4 mb-4">
        <h3 className="text-xs text-[var(--rappi-text-muted)] uppercase tracking-widest font-semibold mb-3">Notificaciones</h3>
        <button onClick={solicitarPermiso} className="flex items-center gap-3 py-2 w-full text-left">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${permiso === "granted" ? "bg-green-500/15" : "bg-[var(--rappi-gray)]"}`}>
            {permiso === "granted" ? <BellRing size={18} className="text-green-400" /> : <BellOff size={18} className="text-[var(--rappi-text-muted)]" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Notificaciones push</p>
            <p className="text-xs text-[var(--rappi-text-muted)]">
              {permiso === "granted" ? "Activadas — recibirás alertas de tus pedidos" :
               permiso === "denied" ? "Bloqueadas — habilítalas desde tu navegador" :
               "Toca para activar notificaciones"}
            </p>
          </div>
          {noLeidas > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--rappi-red)]/15 text-[var(--rappi-red)] text-[10px] font-bold">{noLeidas} nuevas</span>
          )}
        </button>
      </div>

      {/* Payment methods */}
      <div className="rappi-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-[var(--rappi-text-muted)] uppercase tracking-widest font-semibold">Métodos de pago</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="text-[var(--rappi-yellow)] text-xs font-semibold flex items-center gap-1 hover:underline">
            <Plus size={14} /> {showAdd ? "Cancelar" : "Agregar"}
          </button>
        </div>

        {showAdd && (
          <div className="bg-[var(--rappi-gray)]/50 rounded-xl p-3 mb-3 space-y-2 animate-fade-in">
            <select value={newTipo} onChange={e => setNewTipo(e.target.value)}
              className="w-full bg-[var(--rappi-gray)] border border-white/5 rounded-xl py-2.5 px-3 text-sm text-[var(--rappi-text)] outline-none focus:border-[var(--rappi-yellow)]/50">
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">DaviPlata</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
            <input type="text" placeholder="Titular / Referencia" value={newTitular} onChange={e => setNewTitular(e.target.value)}
              className="w-full bg-[var(--rappi-gray)] border border-white/5 rounded-xl py-2.5 px-3 text-sm text-[var(--rappi-text)] placeholder-[var(--rappi-text-muted)]/40 outline-none focus:border-[var(--rappi-yellow)]/50" />
            <button onClick={agregarMetodo} className="rappi-btn w-full text-sm active:scale-[0.98]">Guardar</button>
          </div>
        )}

        {metodos.length === 0 && !showAdd && (
          <p className="text-xs text-[var(--rappi-text-muted)]/50 py-2 text-center">No tienes métodos de pago guardados</p>
        )}
        {metodos.map(m => {
          const Icon = metodoIcons[m.tipo] || CreditCard;
          return (
            <div key={m.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
              <div className="w-10 h-10 rounded-2xl bg-[var(--rappi-yellow)]/10 flex items-center justify-center">
                <Icon size={16} className="text-[var(--rappi-yellow)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{metodoLabels[m.tipo] || m.tipo}</p>
                {m.titular && <p className="text-[10px] text-[var(--rappi-text-muted)]">{m.titular}</p>}
              </div>
              <button onClick={() => eliminarMetodo(m.id)} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-all active:scale-90">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Menu items */}
      <div className="rappi-card overflow-hidden mb-5">
        {[
          { icon: MapPin, label: "Direcciones", desc: "Gestiona tus direcciones guardadas", href: "#" },
          { icon: HelpCircle, label: "Ayuda", desc: "Preguntas frecuentes y soporte", href: "#" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <button key={i} className={`w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors ${i < 1 ? "border-b border-white/5" : ""}`}>
              <div className="w-10 h-10 rounded-2xl bg-[var(--rappi-gray)] flex items-center justify-center shrink-0">
                <Icon size={16} className="text-[var(--rappi-text-muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-[var(--rappi-text-muted)]">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--rappi-text-muted)]/30 shrink-0" />
            </button>
          );
        })}
      </div>

      <button onClick={() => router.push("/login")} className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-[var(--rappi-gray)] text-red-400 font-medium text-sm hover:bg-red-500/10 transition-all active:scale-[0.98]">
        <LogOut size={16} /> Ir a inicio de sesión
      </button>
      <p className="text-center text-[10px] text-[var(--rappi-text-muted)]/30 mt-6">DomiU Magdalena v2.0</p>
    </div>
  );
}
