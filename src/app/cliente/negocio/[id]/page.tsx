"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Star, Clock, Bike, Plus, Minus, MapPin, Phone } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

type Negocio = {
  id: string; nombre: string; categoria: string; descripcion: string;
  logo: string; banner: string; rating: number; tiempo_estimado: string;
  domicilio_cost: number; abierto: boolean; direccion: string; telefono: string;
};
type Producto = {
  id: string; negocio_id: string; nombre: string; descripcion: string;
  precio: number; imagen: string; categoria_producto: string;
};

export default function NegocioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { items, addItem, updateQuantity } = useCart();
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedCat, setSelectedCat] = useState("");

  useEffect(() => {
    if (!id) return;
    getSupabaseClient().from("negocios").select("*").eq("id", id).single().then(({ data }) => { if (data) setNegocio(data); });
    getSupabaseClient().from("productos").select("*").eq("negocio_id", id).eq("disponible", true).then(({ data }) => {
      if (data) {
        setProductos(data);
        const cats = [...new Set(data.map((p) => p.categoria_producto))];
        if (cats.length > 0) setSelectedCat(cats[0]);
      }
    });
  }, [id]);

  const categories = [...new Set(productos.map((p) => p.categoria_producto))];
  const filtered = selectedCat ? productos.filter((p) => p.categoria_producto === selectedCat) : productos;
  const cartItems = items.filter((i) => i.negocioId === id);
  const totalItems = cartItems.reduce((s, i) => s + i.cantidad, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0);

  if (!negocio) return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--rappi-dark)]">
      <div className="w-8 h-8 border-2 border-[var(--rappi-yellow)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const getItemQty = (productId: string) => items.find((i) => i.productId === productId)?.cantidad || 0;

  return (
    <div className="min-h-screen bg-[var(--rappi-dark)] text-[var(--rappi-text)] pb-24 animate-fade-in">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-br from-[var(--rappi-yellow)]/20 to-[var(--rappi-dark)] flex items-end">
        <button onClick={() => router.back()} className="absolute top-4 left-4 w-10 h-10 rounded-2xl bg-black/40 flex items-center justify-center backdrop-blur-md z-10 hover:bg-black/60 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="absolute bottom-4 left-4 right-4 max-w-lg mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--rappi-yellow)]/30 to-[var(--rappi-yellow)]/5 flex items-center justify-center text-[var(--rappi-yellow)] font-bold text-2xl shrink-0 backdrop-blur-sm border border-white/10 shadow-xl">
              {negocio.nombre[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold drop-shadow-lg">{negocio.nombre}</h1>
              <p className="text-xs text-[var(--rappi-text-muted)]">{negocio.categoria}</p>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-[var(--rappi-yellow)] font-semibold"><Star size={12} /> {negocio.rating}</span>
                <span className="flex items-center gap-1 text-xs text-[var(--rappi-text-muted)]"><Clock size={12} /> {negocio.tiempo_estimado}</span>
                <span className="flex items-center gap-1 text-xs text-[var(--rappi-text-muted)]"><Bike size={12} /> ${negocio.domicilio_cost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex gap-4 px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-[var(--rappi-text-muted)]">
          <MapPin size={12} /> <span className="truncate max-w-[180px]">{negocio.direccion}</span>
        </div>
        {negocio.telefono && (
          <a href={`tel:${negocio.telefono}`} className="flex items-center gap-1.5 text-xs text-[var(--rappi-yellow)] ml-auto shrink-0">
            <Phone size={12} /> Llamar
          </a>
        )}
      </div>

      {/* Product categories */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-4 scrollbar-none border-b border-white/5">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                selectedCat === cat ? "bg-[var(--rappi-yellow)] text-[var(--rappi-black)]" : "bg-[var(--rappi-gray)] text-[var(--rappi-text-muted)] hover:bg-[var(--rappi-gray)]/80"
              }`}>{cat}</button>
          ))}
        </div>
      )}

      {/* Products */}
      <div className="px-4 pt-4 pb-4 max-w-lg mx-auto grid gap-3">
        {filtered.map((p) => {
          const qty = getItemQty(p.id);
          return (
            <div key={p.id} className="product-card active:scale-[0.99] transition-all">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--rappi-yellow)]/10 to-white/5 flex items-center justify-center text-3xl shrink-0 border border-white/5">
                🍽️
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{p.nombre}</h4>
                {p.descripcion && <p className="text-xs text-[var(--rappi-text-muted)] mt-0.5 line-clamp-2">{p.descripcion}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-[var(--rappi-yellow)] text-sm">${p.precio.toLocaleString()}</span>
                  {qty === 0 ? (
                    <button onClick={(e) => { e.stopPropagation(); addItem({ productId: p.id, negocioId: negocio.id, negocioNombre: negocio.nombre, nombre: p.nombre, precio: p.precio, descripcion: p.descripcion || "" }); }}
                      className="w-8 h-8 rounded-full bg-[var(--rappi-yellow)] text-[var(--rappi-black)] flex items-center justify-center hover:brightness-110 transition-all active:scale-90">
                      <Plus size={18} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-[var(--rappi-gray)] rounded-full px-1">
                      <button onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, qty - 1); }} className="w-7 h-7 rounded-full bg-[var(--rappi-yellow)] text-[var(--rappi-black)] flex items-center justify-center hover:brightness-110 transition-all active:scale-90">
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center text-[var(--rappi-text)]">{qty}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, qty + 1); }} className="w-7 h-7 rounded-full bg-[var(--rappi-yellow)] text-[var(--rappi-black)] flex items-center justify-center hover:brightness-110 transition-all active:scale-90">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12"><p className="text-[var(--rappi-text-muted)] text-sm">No hay productos en esta categoría</p></div>
        )}
      </div>

      {/* Floating cart */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-6 bg-gradient-to-t from-[var(--rappi-dark)] via-[var(--rappi-dark)] to-transparent pointer-events-none">
          <button onClick={() => router.push("/cliente/carrito")} className="floating-cart pointer-events-auto mx-auto active:scale-[0.97] transition-all">
            <ShoppingCart size={20} />
            <span>Ver carrito ({totalItems})</span>
            <span className="font-bold">${totalPrice.toLocaleString()}</span>
          </button>
        </div>
      )}
    </div>
  );
}
