"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, User, Phone, Car, FileText, Shield, ChevronRight, Loader2, ArrowRight, Bike, Store, LayoutDashboard } from "lucide-react";

export default function LoginPage() {
  const { login, registerAdmin, registerRepartidor, registerNegocio, registerFinanciero, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [rol, setRol] = useState<"admin" | "repartidor" | "negocio" | "financiero">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [placa, setPlaca] = useState("");
  const [documento, setDocumento] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [categoria, setCategoria] = useState("Restaurantes");
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitLoading(true);

    try {
      if (isRegister) {
        if (rol === "repartidor") {
          await registerRepartidor(email, password, nombre, telefono, documento, vehiculo, placa);
          setError("Repartidor creado. Ahora inicia sesion.");
        } else if (rol === "financiero") {
          if (!accessCode.trim()) { setError("Se requiere codigo de acceso."); setSubmitLoading(false); return; }
          await registerFinanciero(email, password, nombre, accessCode);
          setError("Cuenta financiera creada. Ahora inicia sesion.");
        } else if (rol === "negocio") {
          const res = await fetch("/api/negocio/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, nombre, telefono, categoria }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Error al crear negocio");
          setError("Negocio creado. Ahora inicia sesion.");
        } else {
          if (!accessCode.trim()) { setError("Se requiere codigo de acceso."); setSubmitLoading(false); return; }
          await registerAdmin(email, password, nombre, accessCode);
          setError("Cuenta creada. Ahora inicia sesion.");
        }
        setSubmitLoading(false);
      } else {
        const result = await login(email, password);
        if (result.profile?.rol === "admin") {
          const adminsPermitidos = ["leivakevin620@gmail.com", "alcazarluisa99@gmail.com"];
          if (!adminsPermitidos.includes(result.profile.email)) {
            setError("No tienes permisos de administrador.");
            setSubmitLoading(false);
            return;
          }
          setTimeout(() => { window.location.href = "/admin"; }, 500);
        } else if (result.profile?.rol === "financiero") {
          setTimeout(() => { window.location.href = "/admin"; }, 500);
        } else if (result.profile?.rol === "repartidor") {
          setTimeout(() => { window.location.href = "/repartidor"; }, 500);
        } else if (result.profile?.rol === "negocio") {
          setTimeout(() => { window.location.href = "/negocio"; }, 500);
        } else if (result.profile?.rol === "cliente") {
          setTimeout(() => { window.location.href = "/cliente"; }, 500);
        } else {
          setError("No se encontro perfil para este usuario.");
          setSubmitLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al autenticar");
      setSubmitLoading(false);
    }
  };

  const rolOptions = [
    { key: "admin" as const, label: "Admin", icon: Shield, desc: "Panel administrativo" },
    { key: "repartidor" as const, label: "Repartidor", icon: Bike, desc: "Entrega domicilios" },
    { key: "negocio" as const, label: "Negocio", icon: Store, desc: "Gestiona tu tienda" },
    { key: "financiero" as const, label: "Financiero", icon: LayoutDashboard, desc: "Control financiero" },
  ];

  const isSuccess = error.includes("creado");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#10B981]/[0.03] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#2563EB]/[0.03] blur-3xl pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10 animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg shadow-[#10B981]/20">
            D
          </div>
          <h1 className="text-3xl font-black text-[#F8FAFC]">Domi<span className="text-[#10B981]">U</span></h1>
          <p className="text-[#64748B] text-sm mt-1">Magdalena</p>
        </div>

        <div className="bg-[#1E293B]/70 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-8 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#F8FAFC]">{isRegister ? "Crear cuenta" : "Iniciar sesion"}</h2>
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(""); setTelefono(""); setVehiculo(""); setPlaca(""); setDocumento(""); setAccessCode(""); setCategoria("Restaurantes"); }}
              className="text-xs font-semibold text-[#10B981] hover:text-[#34d399] transition-colors flex items-center gap-1"
            >
              {isRegister ? "Iniciar sesion" : "Registrarse"}
              <ChevronRight size={14} />
            </button>
          </div>

          {error && (
            <div className={`mb-5 p-4 rounded-2xl border text-sm font-medium animate-fade-up ${isSuccess ? "bg-[#10B981]/10 border-[#10B981]/20 text-[#34d399]" : "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#fca5a5]"}`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {rolOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setRol(opt.key)}
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl border text-left transition-all ${
                          rol === opt.key
                            ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                            : "bg-white/[0.02] border-white/[0.06] text-[#64748B] hover:border-white/[0.12] hover:text-[#94A3B8]"
                        }`}
                      >
                        <Icon size={16} />
                        <div>
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-[9px] opacity-60 hidden sm:block">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder={rol === "negocio" ? "Nombre del negocio" : "Nombre completo"}
                    required
                    className="input-field"
                  />
                </div>

                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Telefono"
                    required
                    className="input-field"
                  />
                </div>

                {rol === "repartidor" && (
                  <>
                    <div className="relative">
                      <Car size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                      <input
                        type="text"
                        value={vehiculo}
                        onChange={(e) => setVehiculo(e.target.value)}
                        placeholder="Vehiculo (moto, bicicleta...)"
                        className="input-field"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                        <input
                          type="text"
                          value={placa}
                          onChange={(e) => setPlaca(e.target.value)}
                          placeholder="Placa"
                          className="input-field"
                        />
                      </div>
                      <div className="relative">
                        <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                        <input
                          type="text"
                          value={documento}
                          onChange={(e) => setDocumento(e.target.value)}
                          placeholder="Documento"
                          className="input-field"
                        />
                      </div>
                    </div>
                  </>
                )}

                {rol === "negocio" && (
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full h-[52px] px-4 rounded-xl border border-white/[0.08] bg-[#1E293B] text-[#F8FAFC] text-sm outline-none focus:border-[#10B981] transition-colors"
                  >
                    <option value="Restaurantes">Restaurantes</option>
                    <option value="Tiendas">Tiendas</option>
                    <option value="Licoreras">Licoreras</option>
                    <option value="Droguerias">Droguerias</option>
                    <option value="Promociones">Promociones</option>
                  </select>
                )}

                {(rol === "admin" || rol === "financiero") && (
                  <div className="relative">
                    <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      type="text"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Codigo de acceso"
                      required
                      className="input-field"
                    />
                  </div>
                )}
              </>
            )}

            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="input-field"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contrasena"
                required
                minLength={6}
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading || loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-[#10B981]/20 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait disabled:transform-none flex items-center justify-center gap-2"
            >
              {(submitLoading || loading) ? (
                <><Loader2 size={16} className="animate-spin" /> Procesando...</>
              ) : (
                <>{isRegister ? "Crear cuenta" : "Iniciar sesion"} <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            href="/cliente"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] font-semibold text-sm hover:bg-[#10B981]/15 transition-all active:scale-[0.98]"
          >
            Explorar como cliente <ArrowRight size={14} />
          </a>
          <p className="text-[11px] text-[#64748B]">
            Eres cliente? Accede directamente desde la app
          </p>
        </div>
      </div>
    </div>
  );
}
