"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, User, FileText, CreditCard, Banknote, Smartphone, CheckCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";

const metodosPago = [
  { id: "efectivo", label: "Efectivo", icon: Banknote, desc: "Paga al recibir", color: "#00C853" },
  { id: "transferencia", label: "Transferencia", icon: CreditCard, desc: "Bancolombia, Nequi, etc.", color: "#2979FF" },
  { id: "nequi", label: "Nequi", icon: Smartphone, desc: "Paga con Nequi", color: "#FF3D81" },
  { id: "daviplata", label: "DaviPlata", icon: Smartphone, desc: "Paga con DaviPlata", color: "#FF6B00" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, negocioNombre, subtotal, clearCart } = useCart();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [barrio, setBarrio] = useState("");
  const [nota, setNota] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (items.length === 0) { router.replace("/cliente"); return null; }

  const domicilio = 3000;
  const total = subtotal + domicilio;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
      setError("Completa nombre, teléfono y dirección"); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/cliente/pedidos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_nombre: nombre.trim(), cliente_telefono: telefono.trim(),
          cliente_direccion: direccion.trim(), cliente_barrio: barrio.trim(),
          nota: nota.trim(), negocio_id: items[0].negocioId, domicilio,
          metodo_pago: metodoPago,
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
    <div className="min-h-screen bg-[var(--rappi-dark)] text-[var(--rappi-text)] pb-8 animate-fade-in">
      <div className="px-4 pt-5 pb-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-[var(--rappi-gray)] flex items-center justify-center hover:bg-[var(--rappi-gray)]/80 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold">Confirmar pedido</h1>
            <p className="text-xs text-[var(--rappi-text-muted)]">{negocioNombre}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 max-w-lg mx-auto">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 animate-fade-in">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Order summary */}
        <div className="rappi-card p-4 mb-4">
          <h3 className="text-xs text-[var(--rappi-text-muted)] uppercase tracking-widest font-semibold mb-3">Resumen del pedido</h3>
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm mb-2 last:mb-0">
              <span className="text-[var(--rappi-text-muted)]">{item.cantidad}x {item.nombre}</span>
              <span className="text-[var(--rappi-text)] font-medium">${(item.precio * item.cantidad).toLocaleString()}</span>
            </div>
          ))}
          <div className="h-px bg-white/5 my-3" />
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[var(--rappi-text-muted)]">Subtotal</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[var(--rappi-text-muted)]">Domicilio</span>
            <span>${domicilio.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-white/5">
            <span>Total</span>
            <span className="text-[var(--rappi-yellow)]">${total.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="rappi-card p-4 mb-4">
          <h3 className="text-xs text-[var(--rappi-text-muted)] uppercase tracking-widest font-semibold mb-3">Método de pago</h3>
          <div className="grid grid-cols-2 gap-2">
            {metodosPago.map((mp) => {
              const Icon = mp.icon;
              const selected = metodoPago === mp.id;
              return (
                <button key={mp.id} type="button" onClick={() => setMetodoPago(mp.id)}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
                    selected ? "bg-[var(--rappi-yellow)]/10 border-[var(--rappi-yellow)]" : "bg-[var(--rappi-gray)]/50 border-white/5 text-[var(--rappi-text-muted)] hover:border-white/20"
                  }`}>
                  {selected && <CheckCircle size={14} className="absolute top-2 right-2 text-[var(--rappi-yellow)]" />}
                  <Icon size={22} style={{ color: selected ? "var(--rappi-yellow)" : mp.color }} />
                  <span className={`text-xs font-semibold ${selected ? "text-[var(--rappi-yellow)]" : ""}`}>{mp.label}</span>
                  <span className={`text-[9px] ${selected ? "text-[var(--rappi-yellow)]/70" : "text-[var(--rappi-text-muted)]/60"}`}>{mp.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Client data */}
        <div className="rappi-card p-4 mb-4">
          <h3 className="text-xs text-[var(--rappi-text-muted)] uppercase tracking-widest font-semibold mb-3">Tus datos</h3>
          <div className="space-y-3">
            {[{ icon: User, placeholder: "Nombre completo *", val: nombre, set: setNombre, type: "text" },
              { icon: Phone, placeholder: "Teléfono *", val: telefono, set: setTelefono, type: "tel" },
              { icon: MapPin, placeholder: "Dirección *", val: direccion, set: setDireccion, type: "text" },
              { icon: MapPin, placeholder: "Barrio (opcional)", val: barrio, set: setBarrio, type: "text" },
            ].map((f) => (
              <div key={f.placeholder} className="relative">
                <f.icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--rappi-text-muted)]/50" />
                <input type={f.type} placeholder={f.placeholder} value={f.val} onChange={(e) => f.set(e.target.value)}
                  className="w-full bg-[var(--rappi-gray)]/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--rappi-text)] placeholder-[var(--rappi-text-muted)]/40 outline-none focus:border-[var(--rappi-yellow)]/50 transition-all" />
              </div>
            ))}
            <div className="relative">
              <FileText size={16} className="absolute left-4 top-4 text-[var(--rappi-text-muted)]/50" />
              <textarea placeholder="Nota para el negocio (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
                className="w-full bg-[var(--rappi-gray)]/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--rappi-text)] placeholder-[var(--rappi-text-muted)]/40 outline-none focus:border-[var(--rappi-yellow)]/50 transition-all resize-none" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="rappi-btn w-full text-base disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-[var(--rappi-yellow)]/20">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[var(--rappi-black)] border-t-transparent rounded-full animate-spin" />
              Procesando...
            </span>
          ) : `Confirmar pedido - $${total.toLocaleString()}`}
        </button>
      </form>
    </div>
  );
}
