"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, User, FileText, CreditCard, Banknote, Smartphone, CheckCircle, Lock, Wallet, DollarSign, Bike, Sparkles, Heart, AlertTriangle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const metodosPago = [
  { id: "efectivo", label: "Efectivo", icon: Banknote, desc: "Paga al recibir", color: "#22c55e" },
  { id: "billetera", label: "Billetera DomiPay", icon: Wallet, desc: "Paga al instante con tu saldo", color: "var(--primary)" },
  { id: "nequi", label: "Nequi", icon: Smartphone, desc: "Paga con Nequi", color: "#ec4899" },
  { id: "daviplata", label: "DaviPlata", icon: Smartphone, desc: "Paga con DaviPlata", color: "#f97316" },
  { id: "transferencia", label: "Transferencia", icon: CreditCard, desc: "Bancolombia, etc.", color: "#3b82f6" },
];

const tarifaServicio = 1000;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, negocioNombre, negocioId, subtotal, propina, clearCart } = useCart();
  const { user, initialized } = useAuth();
  const [profileData, setProfileData] = useState<{nombre: string; telefono: string; direccion: string} | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editando, setEditando] = useState(false);
  const [nota, setNota] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletSaldo, setWalletSaldo] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [deliveryData, setDeliveryData] = useState<{costo: number; distancia_km: number | null; metodo: string} | null>(null);
  const [geofenceError, setGeofenceError] = useState("");

  const domicilio = deliveryData?.costo ?? 3000;
  const total = subtotal + domicilio + tarifaServicio + propina;

  useEffect(() => {
    if (items.length === 0) { router.replace("/cliente"); return; }
    if (!initialized) return;
    if (!user) { router.replace("/cliente/auth?redirect=/cliente/checkout"); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("nombre, telefono, direccion")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.nombre && data?.telefono && data?.direccion) {
          setProfileData(data);
          setEditNombre(data.nombre);
          setEditTelefono(data.telefono);
          setEditDireccion(data.direccion);
          localStorage.setItem("cliente_nombre", data.nombre);
          localStorage.setItem("cliente_telefono", data.telefono);
          localStorage.setItem("cliente_direccion", data.direccion);
        } else {
          const nombre = localStorage.getItem("cliente_nombre") || "";
          const telefono = localStorage.getItem("cliente_telefono") || "";
          const direccion = localStorage.getItem("cliente_direccion") || "";
          if (nombre || telefono || direccion) {
            setProfileData({ nombre, telefono, direccion });
            if (!editNombre) setEditNombre(nombre);
            if (!editTelefono) setEditTelefono(telefono);
            if (!editDireccion) setEditDireccion(direccion);
          }
        }
      } catch {}
    })();
  }, [initialized, user, router, items.length]);

  useEffect(() => {
    if (!negocioId || items.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/calcular-domicilio", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ negocio_id: negocioId, cliente_direccion: profileData?.direccion || "Santa Marta" }),
        });
        const data = await res.json();
        if (data.costo) {
          setDeliveryData(data);
          // Geofencing check (10km max)
          if (data.distancia_km !== null && data.distancia_km > 10) {
            setGeofenceError(`La distancia es de ${data.distancia_km} km. El máximo permitido es 10 km. Intenta con un negocio más cercano.`);
          } else {
            setGeofenceError("");
          }
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [negocioId, profileData, items]);

  const handleMetodoPagoChange = (id: string) => {
    setMetodoPago(id);
    const tel = profileData?.telefono ?? "";
    if (id === "billetera" && tel) {
      setWalletLoading(true);
      fetch(`/api/wallet?telefono=${encodeURIComponent(tel)}`).then(r => r.json()).then(d => setWalletSaldo(d.saldo ?? 0)).catch(() => setWalletSaldo(0)).finally(() => setWalletLoading(false));
    } else setWalletSaldo(null);
  };

  if (!initialized) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="relative w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (geofenceError) { setError(geofenceError); return; }
    const n = editNombre.trim() || profileData?.nombre || "";
    const t = editTelefono.trim() || profileData?.telefono || "";
    const d = editDireccion.trim() || profileData?.direccion || "";
    if (!n || !t || !d) {
      setError("Completa todos tus datos: nombre, teléfono y dirección.");
      return;
    }
    localStorage.setItem("cliente_nombre", n);
    localStorage.setItem("cliente_telefono", t);
    localStorage.setItem("cliente_direccion", d);
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/cliente/pedidos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_nombre: n, cliente_telefono: t,
          cliente_direccion: d, cliente_barrio: "",
          nota: nota.trim(), negocio_id: negocioId, domicilio,
          metodo_pago: metodoPago, propina, tarifa_servicio: tarifaServicio,
          distancia_km: deliveryData?.distancia_km || 0,
          items: items.map((i) => ({ productId: i.productId, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear pedido");
      clearCart();
      router.push(`/cliente/confirmacion?codigo=${data.pedido.codigo}&metodo=${metodoPago}`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col animate-fade-in bg-[#0F172A]">
      <div className="sticky top-0 z-30 px-5 pt-5 pb-3 bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-white/[0.07] backdrop-blur-sm flex items-center justify-center border border-white/10 active:scale-90 transition-all hover:bg-white/[0.12] shadow-lg shadow-black/20">
            <ArrowLeft size={20} className="text-slate-300" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-[#F8FAFC] tracking-tight">Confirmar pedido</h1>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block animate-pulse" />{negocioNombre}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
            <Bike size={16} className="text-[#10B981]" />
          </div>
        </div>
      </div>

      <form id="checkout-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {error && (
            <div className="p-4 mb-5 rounded-2xl bg-gradient-to-r from-red-500/15 to-red-500/5 border border-red-500/20 backdrop-blur-sm animate-fade-up shadow-lg shadow-red-500/5">
              <p className="text-sm font-medium text-red-300">{error}</p>
            </div>
          )}

          {geofenceError && (
            <div className="p-4 mb-5 rounded-2xl bg-gradient-to-r from-orange-500/15 to-orange-500/5 border border-orange-500/20 backdrop-blur-sm animate-fade-up shadow-lg shadow-orange-500/5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-orange-400" />
                </div>
                <p className="text-sm font-medium text-orange-300 leading-relaxed">{geofenceError}</p>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="rounded-3xl p-5 mb-5 bg-[#1E293B]/70 border border-white/[0.08] backdrop-blur-sm animate-fade-up shadow-xl shadow-black/10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[2px] mb-4 flex items-center gap-2">
              <span className="w-5 h-[2px] rounded-full bg-gradient-to-r from-[#10B981] to-transparent" />
              Resumen del pedido
            </h3>
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm mb-2.5 last:mb-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-[#10B981]/15 border border-[#10B981]/25 flex items-center justify-center text-[10px] font-black text-[#10B981]">{item.cantidad}</span>
                  <span className="text-slate-300">{item.nombre}</span>
                </div>
                <span className="font-semibold text-[#F8FAFC]">${(item.precio * item.cantidad).toLocaleString()}</span>
              </div>
            ))}
            <div className="h-px my-4 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-[#F8FAFC]">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400 flex items-center gap-1.5"><Bike size={13} className="text-slate-500" /> Domicilio</span>
              <span className="text-[#F8FAFC]">${domicilio.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400 flex items-center gap-1.5"><Sparkles size={13} className="text-slate-500" /> Tarifa de servicio</span>
              <span className="text-[#F8FAFC]">${tarifaServicio.toLocaleString()}</span>
            </div>
            {propina > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400 flex items-center gap-1.5"><Heart size={13} className="text-rose-400" /> Propina</span>
                <span className="text-rose-400 font-semibold">${propina.toLocaleString()}</span>
              </div>
            )}
            <div className="h-px my-3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="flex justify-between items-center font-black text-lg mt-1">
              <span className="text-[#F8FAFC]">Total</span>
              <span className="bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent text-xl">${total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="rounded-3xl p-5 mb-5 bg-[#1E293B]/70 border border-white/[0.08] backdrop-blur-sm animate-fade-up shadow-xl shadow-black/10" style={{ animationDelay: "80ms" }}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[2px] mb-4 flex items-center gap-2">
              <span className="w-5 h-[2px] rounded-full bg-gradient-to-r from-[#10B981] to-transparent" />
              Método de pago
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {metodosPago.map((mp) => {
                const Icon = mp.icon;
                const selected = metodoPago === mp.id;
                return (
                  <button key={mp.id} type="button" onClick={() => handleMetodoPagoChange(mp.id)}
                    className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.96] ${
                      selected
                        ? "bg-[#10B981]/10 border-[#10B981]/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-[#10B981]/30"
                        : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:bg-white/[0.06] hover:border-white/[0.12]"
                    }`}>
                    {selected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center shadow-md shadow-[#10B981]/30">
                        <CheckCircle size={11} color="white" strokeWidth={3} />
                      </div>
                    )}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${selected ? "bg-[#10B981]/15" : "bg-white/[0.05]"}`}>
                      <Icon size={22} style={{ color: selected ? "#10B981" : mp.color }} />
                    </div>
                    <span className={`text-xs font-bold ${selected ? "text-[#10B981]" : "text-slate-300"}`}>{mp.label}</span>
                    <span className={`text-[9px] text-center leading-tight ${selected ? "text-[#10B981]/60" : "text-slate-500"}`}>{mp.desc}</span>
                  </button>
                );
              })}
            </div>

            {metodoPago === "billetera" && (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#10B981]/10 via-[#10B981]/5 to-transparent border border-[#10B981]/20 backdrop-blur-sm animate-fade-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 flex items-center justify-center">
                      <DollarSign size={18} className="text-[#10B981]" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300">Tu saldo</span>
                  </div>
                  {walletLoading ? (
                    <div className="w-5 h-5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-xl font-black bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent">${(walletSaldo ?? 0).toLocaleString()}</span>
                  )}
                </div>
                {walletSaldo !== null && walletSaldo < total && (
                  <p className="text-xs mt-3 text-red-400 bg-red-500/10 rounded-lg px-3 py-1.5">Saldo insuficiente. Recarga desde tu perfil.</p>
                )}
                {walletSaldo !== null && walletSaldo >= total && (
                  <p className="text-xs mt-3 text-[#10B981] bg-[#10B981]/10 rounded-lg px-3 py-1.5">Saldo suficiente. Se descontarán ${total.toLocaleString()} al instante.</p>
                )}
              </div>
            )}
          </div>

          {/* User Data */}
          <div className="rounded-3xl p-5 mb-5 bg-[#1E293B]/70 border border-white/[0.08] backdrop-blur-sm animate-fade-up shadow-xl shadow-black/10" style={{ animationDelay: "160ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[2px] flex items-center gap-2">
                <span className="w-5 h-[2px] rounded-full bg-gradient-to-r from-[#10B981] to-transparent" />
                Tus datos
              </h3>
              <button type="button" onClick={() => {
                if (editando) {
                  setProfileData({ nombre: editNombre, telefono: editTelefono, direccion: editDireccion });
                }
                setEditando(!editando);
              }} className="text-xs font-bold text-[#10B981] flex items-center gap-1.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/20 rounded-xl px-3 py-1.5 transition-all cursor-pointer">
                {editando ? "Listo" : "Editar"}
              </button>
            </div>
            {editando || !profileData?.telefono || !profileData?.direccion ? (
              <div className="space-y-3">
                <input type="text" placeholder="Nombre completo *" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                  className="input-field focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]/50 transition-all" />
                <input type="tel" placeholder="Teléfono *" value={editTelefono} onChange={e => setEditTelefono(e.target.value)}
                  className="input-field focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]/50 transition-all" />
                <input type="text" placeholder="Dirección de entrega *" value={editDireccion} onChange={e => setEditDireccion(e.target.value)}
                  className="input-field focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]/50 transition-all" />
                {(!profileData?.telefono || !profileData?.direccion) && !editando && (
                  <p className="text-[10px] text-orange-400/70 flex items-center gap-1">
                    <AlertTriangle size={10} /> Completa tus datos para continuar
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3.5 hover:bg-white/[0.05] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0">
                    <User size={16} className="text-[#10B981]" />
                  </div>
                  <div><p className="text-sm font-medium text-[#F8FAFC]">{editNombre || profileData.nombre}</p><p className="text-[10px] text-slate-500 mt-0.5">Nombre</p></div>
                </div>
                <div className="flex items-center gap-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3.5 hover:bg-white/[0.05] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-[#10B981]" />
                  </div>
                  <div><p className="text-sm font-medium text-[#F8FAFC]">{editTelefono || profileData.telefono}</p><p className="text-[10px] text-slate-500 mt-0.5">Teléfono</p></div>
                </div>
                <div className="flex items-center gap-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3.5 hover:bg-white/[0.05] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-[#10B981]" />
                  </div>
                  <div><p className="text-sm font-medium text-[#F8FAFC]">{editDireccion || profileData.direccion}</p><p className="text-[10px] text-slate-500 mt-0.5">Dirección</p></div>
                </div>
              </div>
            )}
            <div className="mt-4 relative group">
              <div className="absolute left-4 top-4 w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center transition-all group-focus-within:bg-[#10B981]/20">
                <FileText size={14} className="text-[#10B981]/70 group-focus-within:text-[#10B981]" />
              </div>
              <textarea placeholder="Nota para el negocio (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
                className="input-field resize-none pt-4 pl-14 focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]/50 transition-all" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 animate-fade-up mb-2" style={{ animationDelay: "240ms" }}>
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center shrink-0">
              <Lock size={13} className="text-[#10B981]" />
            </div>
            <span className="leading-relaxed">Tus datos están seguros. Solo se usan para procesar tu pedido.</span>
          </div>
        </div>

        {/* Bottom CTA inside the form */}
        <div className="bg-gradient-to-t from-[#0F172A] via-[#0F172A]/95 to-transparent pt-8 pb-5 px-5">
          <button type="submit" disabled={loading}
            className="w-full h-[58px] rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-black text-base flex items-center justify-center gap-2 hover:from-[#059669] hover:to-[#047857] active:scale-[0.97] transition-all duration-200 shadow-[0_8px_32px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </span>
            ) : `Confirmar pedido — $${total.toLocaleString()}`}
          </button>
        </div>
      </form>
    </div>
  );
}
