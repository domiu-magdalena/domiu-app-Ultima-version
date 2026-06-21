"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, AlertTriangle, MapPin, Calendar, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = "login" | "register" | "forgot" | "success";

export default function ClientAuthPage() {
  const router = useRouter();
  const { user, profile, initialized } = useAuth();
  const [redirectTo, setRedirectTo] = useState("/cliente");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("redirect");
    if (r) setRedirectTo(r);
  }, []);

  useEffect(() => {
    if (initialized && user) {
      // Bloquear acceso a repartidores, negocios, admin y financiero
      if (profile && (profile.rol === "repartidor" || profile.rol === "negocio" || profile.rol === "admin" || profile.rol === "financiero")) {
        if (profile.rol === "repartidor") {
          router.replace("/repartidor");
        } else if (profile.rol === "negocio") {
          router.replace("/negocio");
        } else {
          router.replace("/admin");
        }
        return;
      }
      router.replace(redirectTo);
    }
  }, [initialized, user, profile, router, redirectTo]);

  const [mode, setMode] = useState<AuthMode>("login");
  const [registerMethod, setRegisterMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [edad, setEdad] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [documentoIdentidad, setDocumentoIdentidad] = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mensajeBienvenida, setMensajeBienvenida] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (initialized && user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const esTelefono = /^[\d\s\+\-\(\)]{7,}$/.test(email.trim());
      const loginPayload = esTelefono
        ? { phone: email.trim(), password }
        : { email: email.trim(), password };
      const { error: signInError } = await supabase.auth.signInWithPassword(loginPayload);
      if (signInError) throw new Error(signInError.message);
      router.replace(redirectTo);
    } catch (err: any) {
      if (err.message?.includes("Invalid login credentials")) {
        setError("Correo/teléfono o contraseña incorrectos");
      } else {
        setError(err.message || "Error al iniciar sesión");
      }
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    if (!nombre.trim() || !apellido.trim() || !telefono.trim() || !direccion.trim() || !password.trim()) {
      setError("Todos los campos son obligatorios"); setLoading(false); return;
    }
    if (registerMethod === "email" && !email.trim()) {
      setError("El correo electrónico es obligatorio"); setLoading(false); return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres"); setLoading(false); return;
    }
    if (parseInt(edad) < 14 || parseInt(edad) > 120) {
      setError("Debes tener al menos 14 años para registrarte"); setLoading(false); return;
    }
    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones"); setLoading(false); return;
    }
    try {
      const res = await fetch("/api/cliente/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(), apellido: apellido.trim(),
          email: email.trim(), telefono: telefono.trim(),
          direccion: direccion.trim(), edad: edad.trim(),
          fecha_nacimiento: fechaNacimiento || null,
          documento_identidad: documentoIdentidad?.trim() || null,
          password, metodo: registerMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrarse");

      const identificador = registerMethod === "email" ? email.trim() : telefono.trim();
      const tipo = registerMethod === "email" ? "correo electrónico" : "WhatsApp";

      setMensajeBienvenida(
        `¡Bienvenido a DomiU Magdalena, ${nombre.trim()}! Te enviamos un mensaje de confirmación a tu ${tipo} (${identificador}). Ya puedes iniciar sesión con tus datos.`
      );

      setMode("success");
      setNombre(""); setApellido(""); setEmail(""); setTelefono("");
      setDireccion(""); setEdad(""); setFechaNacimiento(""); setDocumentoIdentidad("");
      setPassword(""); setAceptaTerminos(false);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Ingresa tu correo electrónico"); return; }
    setError(""); setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/cliente/auth`,
      });
      if (resetError) throw new Error(resetError.message);
      setSuccessMsg(`Te enviamos un enlace para restablecer tu contraseña a ${email.trim()}. Revisa tu bandeja de entrada.`);
    } catch (err: any) {
      setError(err.message || "Error al enviar el correo");
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: "google") => {
    setLoading(true); setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/cliente` },
      });
      if (oauthError) throw new Error(oauthError.message);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión con el proveedor");
      setLoading(false);
    }
  };

  const inputClasses = "w-full h-13 pl-11 pr-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-white text-sm placeholder-slate-500 outline-none focus:border-[#10B981] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] focus:bg-slate-800/60 transition-all duration-300";
  const iconClasses = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-300";

  const TermsModal = () => {
    if (!showTerms && !showPrivacy) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5" onClick={() => { setShowTerms(false); setShowPrivacy(false); }}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
        <div className="relative w-full sm:max-w-lg max-h-[85vh] bg-[#1E293B]/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-slate-700/50 overflow-hidden animate-scale-in shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-[#1E293B]/95 backdrop-blur-xl p-5 pb-3 border-b border-slate-700/40 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{showTerms ? "Términos y Condiciones" : "Política de Privacidad"}</h3>
            <button onClick={() => { setShowTerms(false); setShowPrivacy(false); }} className="w-8 h-8 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all text-sm font-bold">✕</button>
          </div>
          <div className="p-5 overflow-y-auto max-h-[65vh] text-xs text-slate-400 leading-relaxed space-y-3">
            {showTerms ? (
              <>
                <p className="text-[#10B981] font-bold text-sm">Términos y Condiciones de Uso - DomiU Magdalena</p>
                <p>1. Al registrarte en DomiU Magdalena, aceptas los presentes términos y condiciones. Si no estás de acuerdo, no utilices la plataforma.</p>
                <p>2. Debes ser mayor de 14 años para registrarte. Los menores de 18 años requieren autorización de un adulto responsable.</p>
                <p>3. DomiU Magdalena conecta a usuarios con negocios locales para la compra y entrega de productos a domicilio.</p>
                <p>4. Los precios y disponibilidad de productos son establecidos por cada negocio registrado en la plataforma.</p>
                <p>5. Los datos personales proporcionados serán tratados conforme a nuestra Política de Privacidad y a la Ley 1581 de 2012.</p>
                <p>6. El usuario es responsable de mantener la confidencialidad de su contraseña y de todas las actividades que ocurran en su cuenta.</p>
                <p>7. No nos hacemos responsables por demoras en la entrega debido a condiciones climáticas, tráfico o casos de fuerza mayor.</p>
                <p>8. DomiU Magdalena se reserva el derecho de modificar estos términos en cualquier momento, notificando a los usuarios a través de la plataforma.</p>
              </>
            ) : (
              <>
                <p className="text-[#10B981] font-bold text-sm">Política de Privacidad y Tratamiento de Datos - DomiU Magdalena</p>
                <p>En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios, DomiU Magdalena informa:</p>
                <p>1. Los datos personales recopilados (nombre, apellido, edad, dirección, teléfono, correo electrónico) serán utilizados exclusivamente para la prestación del servicio de delivery y comunicación con el usuario.</p>
                <p>2. Los datos serán almacenados de forma segura y no serán compartidos con terceros sin consentimiento explícito, excepto cuando sea requerido por ley.</p>
                <p>3. El usuario tiene derecho a conocer, actualizar, rectificar y solicitar la eliminación de sus datos personales en cualquier momento.</p>
                <p>4. Los datos de ubicación y dirección son utilizados únicamente para coordinar la entrega de pedidos.</p>
                <p>5. Para ejercer tus derechos de protección de datos, contáctanos a través de la plataforma o al correo de soporte.</p>
                <p>6. DomiU Magdalena implementa medidas de seguridad técnicas y organizativas para proteger la información personal contra acceso no autorizado.</p>
              </>
            )}
          </div>
          <div className="sticky bottom-0 bg-[#1E293B]/95 backdrop-blur-xl p-4 border-t border-slate-700/40">
            <button onClick={() => { setShowTerms(false); setShowPrivacy(false); }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-400 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#10B981]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#10B981]/3 rounded-full blur-3xl" />
      </div>
      <TermsModal />
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#10B981] to-emerald-400 flex items-center justify-center text-white font-black text-3xl mx-auto mb-4 shadow-xl shadow-[#10B981]/30 transition-transform duration-300 hover:scale-105">
              D
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-3xl bg-gradient-to-br from-[#10B981] to-emerald-400 mx-auto blur-xl opacity-30 -z-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Domi<span className="bg-gradient-to-r from-[#10B981] to-emerald-400 bg-clip-text text-transparent">U</span></h1>
          <p className="text-sm text-slate-500 mt-1 font-medium tracking-wide">Magdalena</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-3 p-4 mb-5 rounded-2xl bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20 animate-fade-up backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <p className="text-sm text-red-400 mt-1">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-3 p-4 mb-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-[#10B981]/20 animate-fade-up backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 flex items-center justify-center shrink-0">
              <CheckCircle size={16} className="text-[#10B981]" />
            </div>
            <div>
              <p className="text-sm text-[#10B981] font-semibold">Correo enviado</p>
              <p className="text-xs text-[#10B981]/70 mt-1">{successMsg}</p>
            </div>
          </div>
        )}

        {/* SUCCESS SCREEN */}
        {mode === "success" && (
          <div className="relative bg-[#1E293B]/70 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 text-center animate-scale-in shadow-2xl shadow-black/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#10B981]/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#10B981]/20 to-emerald-400/10 flex items-center justify-center mx-auto border border-[#10B981]/20">
                  <CheckCircle size={44} className="text-[#10B981]" />
                </div>
                <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-[#10B981]/20 blur-2xl -z-10 mx-auto" />
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">¡Registro exitoso!</h2>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed">{mensajeBienvenida}</p>
              <button onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-400 text-white font-bold text-sm shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40 active:scale-[0.98] transition-all duration-300">
                Iniciar sesión ahora
              </button>
            </div>
          </div>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <div className="bg-[#1E293B]/70 backdrop-blur-xl p-7 rounded-3xl border border-slate-700/50 animate-scale-in shadow-2xl shadow-black/20">
            <h2 className="text-xl font-black text-white mb-1">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mb-7">Ingresa con tu correo o teléfono</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative group">
                <Mail size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                <input type="text" placeholder="Correo electrónico o teléfono" value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} required />
              </div>
              <div className="relative group">
                <Lock size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                <input type={showPassword ? "text" : "password"} placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className={inputClasses} required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-400 text-white font-bold text-sm shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:shadow-none">
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Iniciar sesión"}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button onClick={() => { setError(""); setSuccessMsg(""); setMode("forgot"); }} className="text-xs text-slate-500 hover:text-[#10B981] transition-colors duration-300 bg-transparent border-none cursor-pointer">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="mt-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
                <span className="text-xs text-slate-500 font-medium">O continúa con</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
              </div>
              <button onClick={() => handleSocialLogin("google")} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-slate-300 text-sm font-semibold hover:border-[#10B981]/30 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-[#10B981]/5 active:scale-[0.97] transition-all duration-300 disabled:opacity-40">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
            </div>

            <div className="mt-7 text-center">
              <p className="text-xs text-slate-500">
                ¿No tienes cuenta?{" "}
                <button onClick={() => { setError(""); setSuccessMsg(""); setMode("register"); }} className="text-[#10B981] font-semibold hover:text-emerald-400 transition-colors duration-300 bg-transparent border-none cursor-pointer">
                  Regístrate gratis
                </button>
              </p>
            </div>

            <div className="mt-5 pt-5 border-t border-slate-700/30 flex justify-center gap-6">
              <button onClick={() => router.push("/cliente/")} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors duration-300 bg-transparent border-none cursor-pointer">
                Volver al inicio
              </button>
              <button onClick={() => router.push("/login")} className="text-[10px] text-slate-600 hover:text-[#10B981] transition-colors duration-300 bg-transparent border-none cursor-pointer">
                ¿Eres administrador?
              </button>
            </div>
          </div>
        )}

        {/* REGISTER */}
        {mode === "register" && (
          <div className="bg-[#1E293B]/70 backdrop-blur-xl p-7 rounded-3xl border border-slate-700/50 animate-scale-in shadow-2xl shadow-black/20">
            <div className="flex items-center gap-3 mb-7">
              <button onClick={() => { setError(""); setSuccessMsg(""); setMode("login"); }} className="w-10 h-10 rounded-2xl bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center border border-slate-700/50 active:scale-90 transition-all duration-300">
                <ArrowLeft size={16} className="text-slate-400" />
              </button>
              <div>
                <h2 className="text-xl font-black text-white">Crear cuenta</h2>
                <p className="text-xs text-slate-500">Únete a DomiU Magdalena</p>
              </div>
            </div>

            {/* Method tabs */}
            <div className="flex rounded-2xl bg-slate-800/40 border border-slate-700/40 p-1.5 mb-6">
              <button onClick={() => { setRegisterMethod("email"); setError(""); }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 ${registerMethod === "email" ? "bg-gradient-to-r from-[#10B981] to-emerald-400 text-white shadow-lg shadow-[#10B981]/25" : "text-slate-500 hover:text-slate-300"}`}>
                <Mail size={14} className="inline mr-1.5 -mt-0.5" />Correo
              </button>
              <button onClick={() => { setRegisterMethod("phone"); setError(""); }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 ${registerMethod === "phone" ? "bg-gradient-to-r from-[#10B981] to-emerald-400 text-white shadow-lg shadow-[#10B981]/25" : "text-slate-500 hover:text-slate-300"}`}>
                <Phone size={14} className="inline mr-1.5 -mt-0.5" />Teléfono
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <User size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                  <input type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className={inputClasses} required />
                </div>
                <div className="relative group">
                  <User size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                  <input type="text" placeholder="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} className={inputClasses} required />
                </div>
              </div>

              {registerMethod === "email" ? (
                <div className="relative group">
                  <Mail size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                  <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} required />
                </div>
              ) : (
                <div className="relative group">
                  <Phone size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                  <input type="tel" placeholder="Número de teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} className={inputClasses} required />
                </div>
              )}

              <div className="relative group">
                <MapPin size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                <input type="text" placeholder="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} className={inputClasses} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <Calendar size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                  <input type="date" placeholder="Fecha de nacimiento" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} className={inputClasses} required />
                </div>
                <div className="relative group">
                  <CreditCard size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                  <input type="text" placeholder="Documento de identidad" value={documentoIdentidad} onChange={e => setDocumentoIdentidad(e.target.value)} className={inputClasses} required />
                </div>
              </div>

              <div className="relative group">
                <Lock size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                <input type={showPassword ? "text" : "password"} placeholder="Contraseña (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} className={inputClasses} required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input type="checkbox" checked={aceptaTerminos} onChange={e => setAceptaTerminos(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded-lg border-slate-600 bg-slate-800/50 accent-[#10B981] cursor-pointer" />
                <span className="text-xs text-slate-400 leading-relaxed">
                  Acepto los{" "}
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-[#10B981] hover:text-emerald-400 underline decoration-[#10B981]/30 hover:decoration-emerald-400/50 bg-transparent border-none p-0 cursor-pointer text-xs transition-colors duration-300">términos y condiciones</button>
                  {" "}y la{" "}
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="text-[#10B981] hover:text-emerald-400 underline decoration-[#10B981]/30 hover:decoration-emerald-400/50 bg-transparent border-none p-0 cursor-pointer text-xs transition-colors duration-300">política de privacidad</button>
                </span>
              </label>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-400 text-white font-bold text-sm shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40 active:scale-[0.98] transition-all duration-300 mt-2 disabled:opacity-40 disabled:shadow-none">
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Crear cuenta gratis"}
              </button>
            </form>

            <div className="mt-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
                <span className="text-xs text-slate-500 font-medium">O regístrate con</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
              </div>
              <button onClick={() => handleSocialLogin("google")} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-slate-300 text-sm font-semibold hover:border-[#10B981]/30 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-[#10B981]/5 active:scale-[0.97] transition-all duration-300 disabled:opacity-40">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
            </div>

            <p className="mt-7 text-center text-xs text-slate-500">
              ¿Ya tienes cuenta?{" "}
              <button onClick={() => { setError(""); setSuccessMsg(""); setMode("login"); }} className="text-[#10B981] font-semibold hover:text-emerald-400 transition-colors duration-300 bg-transparent border-none cursor-pointer">
                Inicia sesión
              </button>
            </p>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {mode === "forgot" && (
          <div className="bg-[#1E293B]/70 backdrop-blur-xl p-7 rounded-3xl border border-slate-700/50 animate-scale-in shadow-2xl shadow-black/20">
            <div className="flex items-center gap-3 mb-7">
              <button onClick={() => { setError(""); setSuccessMsg(""); setMode("login"); }} className="w-10 h-10 rounded-2xl bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center border border-slate-700/50 active:scale-90 transition-all duration-300">
                <ArrowLeft size={16} className="text-slate-400" />
              </button>
              <div>
                <h2 className="text-xl font-black text-white">Restablecer contraseña</h2>
                <p className="text-xs text-slate-500">Te enviaremos un enlace a tu correo</p>
              </div>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10B981]/15 to-emerald-400/10 flex items-center justify-center mx-auto mb-6 border border-[#10B981]/20">
              <Lock size={24} className="text-[#10B981]" />
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative group">
                <Mail size={16} className={`${iconClasses} group-focus-within:text-[#10B981]`} />
                <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-400 text-white font-bold text-sm shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:shadow-none">
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Enviar enlace"}
              </button>
            </form>
          </div>
        )}

        {/* Footer legal */}
        <div className="mt-10 text-center">
          <div className="flex items-center justify-center gap-5 text-[10px] text-slate-600">
            <button onClick={() => router.push("/cliente/")} className="hover:text-slate-400 transition-colors duration-300 bg-transparent border-none cursor-pointer">Inicio</button>
            <span className="text-slate-800">·</span>
            <button onClick={() => setShowTerms(true)} className="hover:text-slate-400 transition-colors duration-300 bg-transparent border-none cursor-pointer">Términos</button>
            <span className="text-slate-800">·</span>
            <button onClick={() => setShowPrivacy(true)} className="hover:text-slate-400 transition-colors duration-300 bg-transparent border-none cursor-pointer">Privacidad</button>
          </div>
          <p className="text-[10px] text-slate-700/60 mt-3">© 2026 DomiU Magdalena. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}