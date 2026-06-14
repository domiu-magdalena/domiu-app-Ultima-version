"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, User, FileText, CreditCard, Banknote, Smartphone, CheckCircle, Lock, Wallet, DollarSign, Navigation, Bike, Sparkles, Heart, AlertTriangle } from "lucide-react";
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
  const p = profileData ?? { nombre: "", telefono: "", direccion: "" };

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
          localStorage.setItem("cliente_telefono", data.telefono);
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (geofenceError) { setError(geofenceError); return; }
    const perfil = profileData;
    if (!perfil?.nombre || !perfil?.telefono || !perfil?.direccion) {
      setError("No se encontraron tus datos de perfil. Actualiza tu perfil e intenta de nuevo.");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/cliente/pedidos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_nombre: perfil.nombre, cliente_telefono: perfil.telefono,
          cliente_direccion: perfil.direccion, cliente_barrio: "",
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
    <div className="min-h-screen pb-8 animate-fade-in">
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 active:scale-90 transition-all">
            <ArrowLeft size={18} className="text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Confirmar pedido</h1>
            <p className="text-xs text-slate-400">{negocioNombre}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5">
        {error && (
          <div className="p-4 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-up">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}

        {geofenceError && (
          <div className="p-4 mb-5 rounded-xl bg-orange-500/10 border border-orange-500/20 animate-fade-up">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-orange-400">{geofenceError}</p>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="glass-card p-5 mb-5 animate-fade-up">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-4">Resumen del pedido</h3>
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm mb-2.5 last:mb-0">
              <span className="text-slate-400">{item.cantidad}x {item.nombre}</span>
              <span className="font-semibold text-white">${(item.precio * item.cantidad).toLocaleString()}</span>
            </div>
          ))}
          <div className="h-px my-3 bg-slate-700" />
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-white">${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400 flex items-center gap-1"><Bike size={12} /> Domicilio</span>
            <span className="text-white">${domicilio.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400 flex items-center gap-1"><Sparkles size={12} /> Tarifa de servicio</span>
            <span className="text-white">${tarifaServicio.toLocaleString()}</span>
          </div>
          {propina > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400 flex items-center gap-1"><Heart size={12} className="text-rose-400" /> Propina</span>
              <span className="text-rose-400 font-semibold">${propina.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base mt-3 pt-3 border-t border-slate-700">
            <span className="text-white">Total</span>
            <span className="text-yellow-400">${total.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="glass-card p-5 mb-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-4">Método de pago</h3>
          <div className="grid grid-cols-2 gap-3">
            {metodosPago.map((mp) => {
              const Icon = mp.icon;
              const selected = metodoPago === mp.id;
              return (
                <button key={mp.id} type="button" onClick={() => handleMetodoPagoChange(mp.id)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border text-left transition-all active:scale-[0.97] ${
                    selected ? "bg-yellow-400/10 border-yellow-400 shadow-lg shadow-yellow-400/10" : "bg-slate-800/50 border-slate-700 text-slate-400"
                  }`}>
                  {selected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                      <CheckCircle size={12} color="#0c1222" />
                    </div>
                  )}
                  <Icon size={24} style={{ color: selected ? "var(--primary)" : mp.color }} />
                  <span className={`text-xs font-bold ${selected ? "text-yellow-400" : "text-slate-400"}`}>{mp.label}</span>
                  <span className={`text-[9px] text-center leading-tight ${selected ? "text-yellow-400/70" : "text-slate-500"}`}>{mp.desc}</span>
                </button>
              );
            })}
          </div>

          {metodoPago === "billetera" && (
            <div className="mt-4 p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/20 animate-fade-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-yellow-400" />
                  <span className="text-sm font-semibold text-slate-300">Tu saldo</span>
                </div>
                {walletLoading ? (
                  <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-lg font-black text-yellow-400">${(walletSaldo ?? 0).toLocaleString()}</span>
                )}
              </div>
              {walletSaldo !== null && walletSaldo < total && (
                <p className="text-xs mt-2 text-red-400">Saldo insuficiente. Recarga desde tu perfil.</p>
              )}
              {walletSaldo !== null && walletSaldo >= total && (
                <p className="text-xs mt-2 text-green-400">Saldo suficiente. Se descontarán ${total.toLocaleString()} al instante.</p>
              )}
            </div>
          )}
        </div>

        {/* User Data */}
        <div className="glass-card p-5 mb-5 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-4">Tus datos</h3>
          {profileData ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-800/30 border border-slate-700/50 p-3">
                <User size={16} className="text-yellow-400 shrink-0" />
                <div><p className="text-sm text-white">{p.nombre}</p><p className="text-[10px] text-slate-500">Nombre</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-800/30 border border-slate-700/50 p-3">
                <Phone size={16} className="text-yellow-400 shrink-0" />
                <div><p className="text-sm text-white">{p.telefono}</p><p className="text-[10px] text-slate-500">Teléfono</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-800/30 border border-slate-700/50 p-3">
                <MapPin size={16} className="text-yellow-400 shrink-0" />
                <div><p className="text-sm text-white">{p.direccion}</p><p className="text-[10px] text-slate-500">Dirección</p></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Cargando tus datos...</p>
          )}
          <div className="mt-3 relative">
            <FileText size={16} className="absolute left-4 top-4 text-slate-500" />
            <textarea placeholder="Nota para el negocio (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
              className="input-field resize-none pt-4" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 mb-5 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <Lock size={12} />
          <span>Tus datos están seguros. Solo se usan para procesar tu pedido.</span>
        </div>

        <button type="submit" disabled={loading}
          className="btn-primary w-full text-sm disabled:opacity-40 active:scale-[0.98] transition-all">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              Procesando...
            </span>
          ) : `Confirmar pedido — $${total.toLocaleString()}`}
        </button>
      </form>
    </div>
  );
}
