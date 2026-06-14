"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Tag, Bike, Sparkles, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";

const propinaOptions = [0, 2000, 5000, 10000];
const tarifaServicio = 1000;

export default function CarritoPage() {
  const router = useRouter();
  const { items, negocioId, negocioNombre, updateQuantity, removeItem, subtotal, clearCart, propina, setPropina } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [domicilio, setDomicilio] = useState(3000);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0 || !negocioId) return;
    setDeliveryLoading(true);
    const tel = localStorage.getItem("cliente_telefono") || "";
    fetch("/api/calcular-domicilio", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ negocio_id: negocioId, cliente_direccion: tel || "Santa Marta" }),
    }).then(r => r.json()).then(d => { if (d.costo) setDomicilio(d.costo); }).catch(() => {}).finally(() => setDeliveryLoading(false));
  }, [negocioId, items]);

  const descuento = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal + domicilio + tarifaServicio + propina - descuento;

  if (items.length === 0) {
    return (
      <div className="min-h-screen px-5 pt-5 pb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 active:scale-90 transition-all">
            <ArrowLeft size={18} className="text-slate-400" />
          </button>
          <h1 className="text-xl font-bold text-white">Carrito</h1>
        </div>
        <div className="text-center py-20 animate-fade-up">
          <div className="w-24 h-24 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto mb-5">
            <ShoppingCart size={44} className="text-slate-600" />
          </div>
          <p className="text-slate-300 font-medium text-lg">Tu carrito está vacío</p>
          <p className="text-xs text-slate-500 mt-1">Agrega productos desde un negocio</p>
          <button onClick={() => router.push("/cliente")} className="btn-primary mt-8 text-sm inline-flex items-center gap-2">Ir a Inicio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36 animate-fade-in">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 active:scale-90 transition-all">
              <ArrowLeft size={18} className="text-slate-400" />
            </button>
            <h1 className="text-xl font-bold text-white">Carrito</h1>
          </div>
          <button onClick={clearCart} className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 transition-all active:scale-95">
            <Trash2 size={13} /> Vaciar
          </button>
        </div>

        <div className="glass-card p-4 mb-5 flex items-center gap-3 animate-fade-up">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg bg-yellow-400/10 text-yellow-400">
            {negocioNombre?.[0] || "?"}
          </div>
          <div>
            <p className="text-xs text-slate-500">Negocio</p>
            <p className="font-bold text-[15px] text-white">{negocioNombre}</p>
          </div>
        </div>

        <div className="grid gap-2 mb-6">
          {items.map((item, idx) => (
            <div key={item.productId} className="glass-card p-4 flex items-center gap-4 animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-slate-700 bg-slate-800/50">🍽️</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-white truncate">{item.nombre}</p>
                  <button onClick={() => removeItem(item.productId)} className="text-slate-500 hover:text-red-400 transition-colors ml-2 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">${item.precio.toLocaleString()} c/u</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-sm text-yellow-400">${(item.precio * item.cantidad).toLocaleString()}</span>
                  <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button onClick={() => updateQuantity(item.productId, item.cantidad - 1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center active:scale-90 transition-all bg-yellow-400 text-slate-900">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold w-5 text-center text-white">{item.cantidad}</span>
                    <button onClick={() => updateQuantity(item.productId, item.cantidad + 1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center active:scale-90 transition-all bg-yellow-400 text-slate-900">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Promo code */}
        <div className="glass-card p-4 mb-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <Tag size={16} className="shrink-0 text-yellow-400" />
            <input type="text" placeholder="Código promocional" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none" />
            <button onClick={() => { if (promoCode.trim()) setPromoApplied(!promoApplied); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${promoApplied ? "bg-green-500/20 text-green-400" : "bg-yellow-400 text-slate-900"}`}>
              {promoApplied ? "Aplicado" : "Aplicar"}
            </button>
          </div>
          {promoApplied && <p className="text-xs mt-2 text-green-400">¡Descuento del 10% aplicado!</p>}
        </div>

        {/* Tip selector */}
        <div className="glass-card p-4 mb-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-3 flex items-center gap-1.5">
            <Heart size={12} className="text-rose-400" /> Propina para el repartidor
          </h3>
          <div className="flex gap-2">
            {propinaOptions.map(v => (
              <button key={v} onClick={() => setPropina(v)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                  propina === v
                    ? "bg-yellow-400/10 border-yellow-400 text-yellow-400"
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-yellow-400/30"
                }`}>
                {v === 0 ? "Sin" : `$${(v).toLocaleString()}`}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="glass-card p-5 animate-fade-up">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-4">Resumen</h3>
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-slate-400">Subtotal</span>
            <span className="font-semibold text-white">${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Bike size={12} /> Domicilio
              {deliveryLoading && <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />}
            </span>
            <span className="font-semibold text-white">${domicilio.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles size={12} /> Tarifa de servicio
            </span>
            <span className="font-semibold text-white">${tarifaServicio.toLocaleString()}</span>
          </div>
          {propina > 0 && (
            <div className="flex justify-between text-sm mb-2.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Heart size={12} className="text-rose-400" /> Propina
              </span>
              <span className="font-semibold text-rose-400">${propina.toLocaleString()}</span>
            </div>
          )}
          {promoApplied && (
            <div className="flex justify-between text-sm mb-2.5">
              <span className="text-green-400">Descuento (10%)</span>
              <span className="font-semibold text-green-400">-${descuento.toLocaleString()}</span>
            </div>
          )}
          <div className="h-px my-3 bg-slate-700" />
          <div className="flex justify-between font-bold text-lg">
            <span className="text-white">Total</span>
            <span className="text-yellow-400">${total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 p-4 pb-3 bg-gradient-to-t from-[#0F172A] via-[#0F172A] to-transparent pointer-events-none">
        <button onClick={() => router.push("/cliente/checkout")}
          className="btn-primary w-full text-sm pointer-events-auto active:scale-[0.97] transition-all">
          Continuar al pago — ${total.toLocaleString()}
        </button>
      </div>
    </div>
  );
}
