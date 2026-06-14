"use client";
import { useState, useEffect } from "react";
import { Search, Mail, Lock, Trash2, Shield, ShieldOff, Loader2, CheckCircle, AlertCircle, User, Phone, Calendar } from "lucide-react";

type Usuario = {
  id: string; email: string; nombre: string; telefono: string;
  rol: string; created_at: string; last_sign_in: string | null;
  confirmed: boolean; disabled: boolean;
};

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const inpC = "w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm";

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/usuarios");
      if (!res.ok) throw new Error("Error al cargar usuarios");
      setUsuarios(await res.json());
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const ejecutarAccion = async (userId: string, action: string, extra?: any) => {
    setActionLoading(userId); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setSuccess(data.message || "Acción completada");
      cargarUsuarios();
    } catch (err: any) { setError(err.message); }
    setActionLoading(null);
  };

  const cambiarEmail = async (usuario: Usuario) => {
    const nuevoEmail = prompt("Nuevo email para " + usuario.email + ":", usuario.email);
    if (!nuevoEmail || nuevoEmail === usuario.email) return;
    await ejecutarAccion(usuario.id, "update-email", { email: nuevoEmail });
  };

  const resetPassword = async (usuario: Usuario) => {
    const nuevaPass = prompt("Nueva contraseña para " + usuario.email + " (mín. 6 caracteres):");
    if (!nuevaPass || nuevaPass.length < 6) { setError("Mínimo 6 caracteres"); return; }
    await ejecutarAccion(usuario.id, "reset-password", { password: nuevaPass });
  };

  const confirmarEliminar = (usuario: Usuario) => {
    if (confirm(`¿Eliminar permanentemente a ${usuario.nombre || usuario.email}? Esta acción NO se puede deshacer.`)) {
      ejecutarAccion(usuario.id, "delete");
    }
  };

  const filtrados = usuarios.filter(u => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q) || u.telefono.includes(q);
  });

  return (
    <div className="space-y-5">
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
          <CheckCircle size={18} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className={`${inpC} pl-10`} placeholder="Buscar por nombre, email o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-slate-400">{filtrados.length} usuarios</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-yellow-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(u => (
            <div key={u.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 font-bold">
                    {(u.nombre || u.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{u.nombre || "Sin nombre"}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${u.confirmed ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {u.confirmed ? "Verificado" : "Pendiente"}
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${u.disabled ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-400"}`}>
                    {u.disabled ? "Desactivado" : "Activo"}
                  </span>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 font-bold">
                    {u.rol}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Teléfono</p>
                  <p className="text-white text-xs">{u.telefono || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Registro</p>
                  <p className="text-white text-xs">{new Date(u.created_at).toLocaleDateString("es-CO")}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Último acceso</p>
                  <p className="text-white text-xs">{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("es-CO") : "Nunca"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">ID</p>
                  <p className="text-white text-xs font-mono">{u.id.slice(0, 12)}...</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => cambiarEmail(u)} disabled={actionLoading === u.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 hover:bg-blue-500/20 active:scale-95 transition-all disabled:opacity-40">
                  <Mail size={12} /> Cambiar email
                </button>
                <button onClick={() => resetPassword(u)} disabled={actionLoading === u.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-semibold border border-yellow-500/20 hover:bg-yellow-500/20 active:scale-95 transition-all disabled:opacity-40">
                  <Lock size={12} /> Rest. contraseña
                </button>
                {!u.disabled ? (
                  <button onClick={() => ejecutarAccion(u.id, "disable")} disabled={actionLoading === u.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-40">
                    <ShieldOff size={12} /> Desactivar
                  </button>
                ) : (
                  <button onClick={() => ejecutarAccion(u.id, "enable")} disabled={actionLoading === u.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold border border-green-500/20 hover:bg-green-500/20 active:scale-95 transition-all disabled:opacity-40">
                    <Shield size={12} /> Activar
                  </button>
                )}
                <button onClick={() => confirmarEliminar(u)} disabled={actionLoading === u.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-40">
                  {actionLoading === u.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
                </button>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div className="text-center py-16">
              <User size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm font-medium">No se encontraron usuarios</p>
              <p className="text-xs text-slate-500 mt-1">Prueba con otra búsqueda</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
