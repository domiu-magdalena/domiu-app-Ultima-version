"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Tag, ChefHat } from "lucide-react";
import { useCart } from "@/context/CartContext";

const sugerencias = ["Agregar bebida", "Agregar postre", "Agregar extra"];

export default function CarritoPage() {
  const router = useRouter();
  const { items, negocioNombre, updateQuantity, removeItem, subtotal, clearCart } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const domicilio = 3000;
  const descuento = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal + domicilio - descuento;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-5 pt-5 pb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)] active:scale-90 transition-all">
            <ArrowLeft size={18} className="text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-xl font-bold">Carrito</h1>
        </div>
        <div className="text-center py-20 animate-fade-up">
          <div className="w-24 h-24 rounded-3xl bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-5">
            <ShoppingCart size={44} className="text-[var(--text-muted)]" style={{ opacity: 0.3 }} />
          </div>
          <p className="text-[var(--text-secondary)] font-medium text-lg">Tu carrito está vacío</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Agrega productos desde un negocio</p>
          <button onClick={() => router.push("/cliente")}
            className="btn-primary mt-8 text-sm inline-flex items-center gap-2">
            Ir a Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-36 animate-fade-in">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)] active:scale-90 transition-all">
              <ArrowLeft size={18} className="text-[var(--text-secondary)]" />
            </button>
            <h1 className="text-xl font-bold">Carrito</h1>
          </div>
          <button onClick={clearCart} className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all" style={{ color: "var(--error)", background: "var(--error)10" }}>
            <Trash2 size={13} /> Vaciar
          </button>
        </div>

        <div className="glass-card p-4 mb-5 flex items-center gap-3 animate-fade-up">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg" style={{ background: "var(--primary)10", color: "var(--primary)" }}>
            {negocioNombre?.[0] || "?"}
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Negocio</p>
            <p className="font-bold text-[15px]">{negocioNombre}</p>
          </div>
        </div>

        <div className="grid gap-2 mb-6">
          {items.map((item, idx) => (
            <div key={item.productId} className="glass-card p-4 flex items-center gap-4 animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-[var(--border-color)]" style={{ background: "var(--primary)05" }}>
                🍽️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm truncate">{item.nombre}</p>
                  <button onClick={() => removeItem(item.productId)} className="text-[var(--text-muted)] hover:text-[var(--error)] transition-colors ml-2 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">${item.precio.toLocaleString()} c/u</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-sm" style={{ color: "var(--primary)" }}>${(item.precio * item.cantidad).toLocaleString()}</span>
                  <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg p-0.5 border border-[var(--border-color)]">
                    <button onClick={() => updateQuantity(item.productId, item.cantidad - 1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center active:scale-90 transition-all" style={{ background: "var(--primary)", color: "white" }}>
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold w-5 text-center text-[var(--text-primary)]">{item.cantidad}</span>
                    <button onClick={() => updateQuantity(item.productId, item.cantidad + 1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center active:scale-90 transition-all" style={{ background: "var(--primary)", color: "white" }}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 animate-fade-up">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[1.5px] mb-3">¿Algo más?</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 scroll-hide">
            {sugerencias.map((s) => (
              <button key={s} className="chip chip-inactive whitespace-nowrap text-xs flex items-center gap-1.5 active:scale-95">
                <ChefHat size={12} /> {s}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-4 mb-5 animate-fade-up">
          <div className="flex items-center gap-3">
            <Tag size={16} className="shrink-0" style={{ color: "var(--primary)" }} />
            <input type="text" placeholder="Código promocional" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none" />
            <button onClick={() => { if (promoCode.trim()) setPromoApplied(!promoApplied); }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95" style={promoApplied ? { background: "var(--success)20", color: "var(--success)" } : { background: "var(--primary)", color: "white" }}>
              {promoApplied ? "Aplicado" : "Aplicar"}
            </button>
          </div>
          {promoApplied && <p className="text-xs mt-2" style={{ color: "var(--success)" }}>¡Descuento del 10% aplicado!</p>}
        </div>

        <div className="glass-card p-5 animate-fade-up">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[1.5px] mb-4">Resumen</h3>
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-[var(--text-secondary)]">Subtotal ({items.length} productos)</span>
            <span className="font-semibold">${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-[var(--text-secondary)]">Domicilio</span>
            <span className="font-semibold">${domicilio.toLocaleString()}</span>
          </div>
          {promoApplied && (
            <div className="flex justify-between text-sm mb-2.5">
              <span style={{ color: "var(--success)" }}>Descuento (10%)</span>
              <span className="font-semibold" style={{ color: "var(--success)" }}>-${descuento.toLocaleString()}</span>
            </div>
          )}
          <div className="h-px my-3" style={{ background: "var(--border-color)" }} />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span style={{ color: "var(--primary)" }}>${total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 p-4 pb-3 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent pointer-events-none">
        <button onClick={() => router.push("/cliente/checkout")}
          className="btn-primary w-full text-sm pointer-events-auto active:scale-[0.97] transition-all">
          Continuar al pago — ${total.toLocaleString()}
        </button>
      </div>
    </div>
  );
}
