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
          <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-slate-800/80 backdrop-blur-xl flex items-center justify-center border border-slate-700/50 active:scale-90 transition-all shadow-lg shadow-black/20">
            <ArrowLeft size={20} className="text-slate-300" />
          </button>
          <h1 className="text-xl font-bold text-white">Carrito</h1>
        </div>
        <div className="text-center py-16 animate-fade-up">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 blur-xl" />
            <div className="relative w-32 h-32 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-700/50 flex items-center justify-center shadow-2xl shadow-black/30">
              <ShoppingCart size={52} className="text-slate-600" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-slate-200 font-semibold text-xl">Tu carrito está vacío</p>
          <p className="text-sm text-slate-500 mt-2">Explora negocios y agrega productos</p>
          <button onClick={() => router.push("/cliente")} className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.97] transition-all hover:shadow-emerald-500/40">
            <ArrowLeft size={16} className="rotate-180" /> Ir a Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36 animate-fade-in">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-slate-800/80 backdrop-blur-xl flex items-center justify-center border border-slate-700/50 active:scale-90 transition-all shadow-lg shadow-black/20">
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <h1 className="text-xl font-bold text-white">Tu Carrito</h1>
          </div>
          <button onClick={clearCart} className="text-xs font-semibold flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 transition-all active:scale-95 hover:bg-red-500/15">
            <Trash2 size={13} /> Vaciar
          </button>
        </div>

        <div className="relative p-5 mb-5 flex items-center gap-4 animate-fade-up rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-slate-800/90 to-slate-800/90 border border-emerald-500/20 rounded-2xl" />
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
            {negocioNombre?.[0] || "?"}
          </div>
          <div className="relative">
            <p className="text-[11px] text-emerald-400/70 uppercase tracking-wider font-medium">Negocio</p>
            <p className="font-bold text-[16px] text-white">{negocioNombre}</p>
          </div>
        </div>

        <div className="grid gap-3 mb-6">
          {items.map((item, idx) => (
            <div key={item.productId} className="glass-card p-4 flex items-center gap-4 animate-fade-up hover:border-slate-600/50 transition-all" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-800/60 shadow-inner">🍽️</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[15px] text-white truncate pr-2">{item.nombre}</p>
                  <button onClick={() => removeItem(item.productId)} className="text-slate-600 hover:text-red-400 transition-colors ml-2 shrink-0 p-1 rounded-lg hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">${item.precio.toLocaleString()} c/u</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-[15px] text-emerald-400">${(item.precio * item.cantidad).toLocaleString()}</span>
                  <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700/50">
                    <button onClick={() => updateQuantity(item.productId, item.cantidad - 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                      <Minus size={13} />
                    </button>
                    <span className="text-sm font-bold w-7 text-center text-white">{item.cantidad}</span>
                    <button onClick={() => updateQuantity(item.productId, item.cantidad + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Promo code */}
        <div className={`relative p-4 mb-4 animate-fade-up rounded-2xl overflow-hidden transition-all ${promoApplied ? "" : ""}`}>
          {promoApplied && <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-emerald-500/20 border border-emerald-500/30" />}
          {!promoApplied && <div className="absolute inset-0 glass-card rounded-2xl" />}
          <div className="relative flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${promoApplied ? "bg-emerald-500/20" : "bg-slate-800"}`}>
              <Tag size={16} className={promoApplied ? "text-emerald-400" : "text-slate-400"} />
            </div>
            <input type="text" placeholder="Código promocional" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none" />
            <button onClick={() => { if (promoCode.trim()) setPromoApplied(!promoApplied); }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${promoApplied ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20"}`}>
              {promoApplied ? "✓ Aplicado" : "Aplicar"}
            </button>
          </div>
          {promoApplied && <p className="relative text-xs mt-3 text-emerald-400 font-medium flex items-center gap-1.5"><Sparkles size={12} /> ¡Descuento del 10% aplicado!</p>}
        </div>

        {/* Tip selector */}
        <div className="glass-card p-5 mb-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-4 flex items-center gap-1.5">
            <Heart size={12} className="text-rose-400" /> Propina para el repartidor
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {propinaOptions.map(v => (
              <button key={v} onClick={() => setPropina(v)}
                className={`relative py-3.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                  propina === v
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-emerald-500/30 hover:text-slate-300"
                }`}>
                {v === 0 ? "🚫 Sin" : `💰 $${(v).toLocaleString()}`}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="glass-card p-5 animate-fade-up">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[1.5px] mb-4">Resumen del pedido</h3>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-slate-400">Subtotal</span>
            <span className="font-semibold text-white">${subtotal.toLocaleString()}</span>
          </div>
          <div className="h-px bg-slate-700/50 mb-3" />
          <div className="flex justify-between text-sm mb-3">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Bike size={13} /> Domicilio
              {deliveryLoading && <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />}
            </span>
            <span className="font-semibold text-white">${domicilio.toLocaleString()}</span>
          </div>
          <div className="h-px bg-slate-700/50 mb-3" />
          <div className="flex justify-between text-sm mb-3">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} /> Tarifa de servicio
            </span>
            <span className="font-semibold text-white">${tarifaServicio.toLocaleString()}</span>
          </div>
          {propina > 0 && (
            <>
              <div className="h-px bg-slate-700/50 mb-3" />
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Heart size={13} className="text-rose-400" /> Propina
                </span>
                <span className="font-semibold text-rose-400">${propina.toLocaleString()}</span>
              </div>
            </>
          )}
          {promoApplied && (
            <>
              <div className="h-px bg-slate-700/50 mb-3" />
              <div className="flex justify-between text-sm mb-3">
                <span className="text-emerald-400 flex items-center gap-1.5"><Sparkles size={13} /> Descuento (10%)</span>
                <span className="font-semibold text-emerald-400">-${descuento.toLocaleString()}</span>
              </div>
            </>
          )}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent my-4" />
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg text-white">Total</span>
            <span className="font-extrabold text-2xl bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">${total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 p-4 pb-3 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/95 to-transparent pointer-events-none backdrop-blur-sm">
        <button onClick={() => router.push("/cliente/checkout")}
          className="btn-primary w-full text-sm pointer-events-auto active:scale-[0.97] transition-all py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 text-[15px] font-bold hover:shadow-emerald-500/40">
          Continuar al pago — ${total.toLocaleString()}
        </button>
      </div>
    </div>
  );
}
