"use client";

import { useState, useEffect } from "react";
import { Wallet, CheckCircle, XCircle, Search, ArrowUpDown, Loader2, AlertCircle, Clock, User, DollarSign } from "lucide-react";

const inpC = "w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm";
const lblC = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

export default function AdminWallets() {
  const [tab, setTab] = useState<"pendientes" | "todas">("pendientes");
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [ajusteId, setAjusteId] = useState<string | null>(null);
  const [ajusteMonto, setAjusteMonto] = useState("");
  const [ajusteRazon, setAjusteRazon] = useState("");

  const fetchPendientes = async () => {
    try {
      const res = await fetch("/api/admin/wallets?pendientes=true");
      if (!res.ok) throw new Error("Error al cargar pendientes");
      const data = await res.json();
      setPendientes(data);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await fetch("/api/admin/wallets");
      if (!res.ok) throw new Error("Error al cargar billeteras");
      const data = await res.json();
      setWallets(data);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setMsg("");
    setErr("");
    await Promise.all([fetchPendientes(), fetchWallets()]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const procesar = async (movimiento_id: string, action: "confirmar" | "rechazar") => {
    try {
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, movimiento_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message);
      await fetchPendientes();
      await fetchWallets();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const ajustar = async (billetera_id: string) => {
    if (!ajusteMonto || Number(ajusteMonto) === 0) return;
    try {
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ajustar", billetera_id, monto: Number(ajusteMonto), motivo: ajusteRazon || "Ajuste manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message);
      setAjusteId(null);
      setAjusteMonto("");
      setAjusteRazon("");
      await fetchWallets();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const filtWallets = wallets.filter((w: any) =>
    !search || w.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) || w.cliente_telefono?.includes(search)
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-yellow-400" size={40} /></div>
  );

  return (
    <div className="space-y-6">
      {/* Messages */}
      {msg && <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400"><CheckCircle size={18} />{msg}</div>}
      {err && <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"><AlertCircle size={18} />{err}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        {[
          { key: "pendientes" as const, label: "Solicitudes Pendientes", icon: Clock },
          { key: "todas" as const, label: "Todas las Billeteras", icon: Wallet },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20" : "text-slate-400 hover:text-white"}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ==================== PENDIENTES ==================== */}
      {tab === "pendientes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Solicitudes de Recarga</h3>
            <button onClick={fetchPendientes} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700">Actualizar</button>
          </div>
          {pendientes.length === 0 ? (
            <div className="text-center py-16 text-slate-500"><CheckCircle size={48} className="mx-auto mb-3 opacity-20" /><p>No hay solicitudes pendientes</p></div>
          ) : (
            <div className="space-y-3">
              {pendientes.map((m: any) => (
                <div key={m.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User size={16} className="text-blue-400" />
                        <span className="font-bold text-white">{m.billeteras?.cliente_nombre || "Sin nombre"}</span>
                        <span className="text-xs text-slate-500">{m.billeteras?.cliente_telefono}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-yellow-400 font-bold text-lg">{fmt(m.monto)}</span>
                        <span className="text-slate-500">{new Date(m.created_at).toLocaleString("es-CO")}</span>
                      </div>
                      {m.referencia && <p className="text-xs text-slate-500 mt-1">Referencia: {m.referencia}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => procesar(m.id, "confirmar")}
                        className="flex items-center gap-1 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg text-xs font-semibold border border-green-500/20 hover:bg-green-500/20">
                        <CheckCircle size={14} /> Confirmar
                      </button>
                      <button onClick={() => procesar(m.id, "rechazar")}
                        className="flex items-center gap-1 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-semibold border border-red-500/20 hover:bg-red-500/20">
                        <XCircle size={14} /> Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TODAS ==================== */}
      {tab === "todas" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1"><input className={inpC} placeholder="Buscar por nombre o telefono..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <button onClick={fetchWallets} className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700">Actualizar</button>
          </div>
          {filtWallets.length === 0 ? (
            <div className="text-center py-16 text-slate-500"><Wallet size={48} className="mx-auto mb-3 opacity-20" /><p>No hay billeteras</p></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtWallets.map((w: any) => (
                <div key={w.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Wallet size={18} className="text-yellow-400" />
                        <span className="font-bold text-white">{w.cliente_nombre || "Sin nombre"}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{w.cliente_telefono}</p>
                    </div>
                    <span className="text-lg font-black text-yellow-400">{fmt(w.saldo || 0)}</span>
                  </div>
                  <div className="flex gap-2">
                    {ajusteId === w.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input className="w-28 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" type="number" placeholder="Monto" value={ajusteMonto} onChange={(e) => setAjusteMonto(e.target.value)} />
                          <input className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" placeholder="Motivo" value={ajusteRazon} onChange={(e) => setAjusteRazon(e.target.value)} />
                          <button onClick={() => ajustar(w.id)} className="px-3 py-2 bg-yellow-400 text-slate-900 rounded-lg text-xs font-bold">OK</button>
                          <button onClick={() => { setAjusteId(null); setAjusteMonto(""); setAjusteRazon(""); }} className="px-3 py-2 bg-slate-800 text-slate-400 rounded-lg text-xs">X</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAjusteId(w.id)}
                        className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 flex items-center justify-center gap-1">
                        <ArrowUpDown size={14} /> Ajustar Saldo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const fmt = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v || 0);
