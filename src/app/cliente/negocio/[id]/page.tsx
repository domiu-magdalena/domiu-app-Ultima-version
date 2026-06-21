"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Star, Clock, Bike, Plus, Minus, MapPin, Phone, Sparkles } from "lucide-react";
import { fetchData } from "@/lib/client-data";
import { useCart } from "@/context/CartContext";
import MenuOlmaWings from "@/components/MenuOlmaWings";

const OLMA_WINGS_ID = "58ed85d5-94a7-4433-afab-3b9bf7de8d6f";

type Negocio = {
  id: string; nombre: string; categoria: string; descripcion: string;
  logo: string; banner: string; rating: number; calificacion: number;
  tiempo_estimado: string; domicilio_cost: number; abierto: boolean;
  direccion: string; telefono: string;
};
type Producto = {
  id: string; negocio_id: string; nombre: string; descripcion: string;
  precio: number; imagen: string; categoria_producto: string;
};

export default function NegocioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { items, negocioId: cartNegocioId, negocioNombre: cartNegocioNombre, addItem, forceAdd, updateQuantity } = useCart();
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!id) return;
    fetchData("negocios", { filters: [{ method: "eq", column: "id", value: id }], single: true }).then((data: any) => { if (data) setNegocio(data); });
    if (id !== OLMA_WINGS_ID) {
      fetchData("productos", { filters: [{ method: "eq", column: "negocio_id", value: id }, { method: "eq", column: "disponible", value: true }] }).then((data: any) => {
        if (data) {
          setProductos(data);
          const cats = [...new Set(data.map((p: any) => p.categoria_producto))];
          if (cats.length > 0) setSelectedCat(cats[0]);
        }
      });
    }
  }, [id]);

  if (!negocio) return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
      <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent", borderWidth: "3px" }} />
    </div>
  );

  if (id === OLMA_WINGS_ID) return <MenuOlmaWings negocio={negocio} />;

  const categories = [...new Set(productos.map((p) => p.categoria_producto))];
  const filtered = selectedCat ? productos.filter((p) => p.categoria_producto === selectedCat) : productos;
  const cartItems = items.filter((i) => i.negocioId === id);
  const totalItems = cartItems.reduce((s, i) => s + i.cantidad, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const scrollToCat = (cat: string) => {
    setSelectedCat(cat);
    catRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getItemQty = (productId: string) => items.find((i) => i.productId === productId)?.cantidad || 0;

  const handleAddProduct = (p: Producto) => {
    if (cartNegocioId && cartNegocioId !== negocio.id) {
      const ok = window.confirm(`Tienes productos de "${cartNegocioNombre}" en tu carrito. ¿Deseas vaciarlo y agregar productos de "${negocio.nombre}"?`);
      if (!ok) return;
      forceAdd({ productId: p.id, negocioId: negocio.id, negocioNombre: negocio.nombre, nombre: p.nombre, precio: p.precio, descripcion: p.descripcion || "" });
      return;
    }
    addItem({ productId: p.id, negocioId: negocio.id, negocioNombre: negocio.nombre, nombre: p.nombre, precio: p.precio, descripcion: p.descripcion || "" });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-28 animate-fade-in">

      <div className="relative h-56 flex items-end overflow-hidden" style={{ background: negocio.banner ? `url(${negocio.banner}) center/cover` : "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)" }}>
        {!negocio.banner && <div className="absolute inset-0 opacity-10" style={{backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)"}} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-11 h-11 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-xl z-10 border border-white/15 active:scale-90 transition-all text-white shadow-lg shadow-black/20">
          <ArrowLeft size={20} />
        </button>
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center text-white font-bold text-4xl shrink-0 backdrop-blur-md border-2 border-white/25 shadow-2xl shadow-black/40 overflow-hidden ring-4 ring-white/10">
              {negocio.logo ? <img src={negocio.logo} alt="" className="w-full h-full object-cover" /> : negocio.nombre[0]}
            </div>
            <div className="flex-1 min-w-0 pt-1 text-white pb-1">
              <h1 className="text-2xl font-extrabold drop-shadow-lg tracking-tight">{negocio.nombre}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold bg-white/15 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">{negocio.categoria}</span>
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-sm border ${negocio.abierto ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/20" : "bg-red-500/20 text-red-200 border-red-400/20"}`}>
                  {negocio.abierto ? "Abierto" : "Cerrado"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2.5">
                <span className="flex items-center gap-1.5 text-xs text-white font-bold bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
                  <Star size={12} fill="#FBBF24" stroke="#FBBF24" /> {negocio.rating || negocio.calificacion || "—"}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/70 font-medium">
                  <Clock size={12} /> {negocio.tiempo_estimado}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/70 font-medium">
                  <Bike size={12} /> ${negocio.domicilio_cost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-color)]/50">
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)]/80 px-4 py-2.5 rounded-2xl flex-1 min-w-0 border border-[var(--border-color)]/30">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--primary)15" }}>
            <MapPin size={14} style={{ color: "var(--primary)" }} />
          </div>
          <span className="truncate">{negocio.direccion}</span>
        </div>
        {negocio.telefono && (
          <a href={`tel:${negocio.telefono}`}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 active:scale-90 transition-all border border-[var(--border-color)]/30 shadow-sm" style={{ background: "var(--primary)10", color: "var(--primary)" }}>
            <Phone size={16} />
          </a>
        )}
      </div>

      {categories.length > 1 && (
        <div className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-2xl border-b border-[var(--border-color)]/30">
          <div className="h-scroll px-5 py-3 flex gap-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => scrollToCat(cat)}
                className={`shrink-0 px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${selectedCat === cat ? "text-white shadow-lg shadow-emerald-500/25" : "text-[var(--text-secondary)] bg-[var(--bg-secondary)]/60 border border-[var(--border-color)]/40 hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]"}`}
                style={selectedCat === cat ? { background: "var(--primary)" } : {}}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pt-5 pb-4">
        {categories.length > 1 ? (
          categories.map((cat) => {
            const catProducts = productos.filter((p) => p.categoria_producto === cat);
            if (catProducts.length === 0) return null;
            return (
              <div key={cat} ref={(el) => { catRefs.current[cat] = el; }} className="mb-8 animate-fade-up">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={15} style={{ color: "var(--primary)" }} />
                  <h3 className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">{cat}</h3>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)]/80 px-2.5 py-0.5 rounded-full border border-[var(--border-color)]/30">{catProducts.length}</span>
                </div>
                <div className="h-0.5 w-12 rounded-full mb-4" style={{ background: "linear-gradient(90deg, var(--primary), transparent)" }} />
                <div className="grid gap-3">
                  {catProducts.map((p, idx) => {
                    const qty = getItemQty(p.id);
                    return (
                      <div key={p.id} className="group relative bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/70 border border-[var(--border-color)]/30 hover:border-[var(--primary)]/20 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 hover:shadow-lg hover:shadow-black/10" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-[var(--border-color)]/40 overflow-hidden shadow-md shadow-black/10 group-hover:shadow-lg group-hover:shadow-black/15 transition-shadow duration-200" style={{ background: "var(--primary)08" }}>
                          {p.imagen ? <img src={p.imagen} alt="" className="w-full h-full object-cover" /> : "🍽️"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate text-[var(--text-primary)]">{p.nombre}</h4>
                          {p.descripcion && <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">{p.descripcion}</p>}
                          <div className="flex items-center justify-between mt-2.5">
                            <span className="font-extrabold text-lg" style={{ color: "var(--primary)" }}>${p.precio.toLocaleString()}</span>
                            {qty === 0 ? (
                              <button onClick={(e) => { e.stopPropagation(); handleAddProduct(p); }}
                                className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center active:scale-90 transition-all duration-200 shadow-lg hover:shadow-xl" style={{ background: "var(--primary)", boxShadow: "0 4px 14px 0 color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                                <Plus size={20} />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-xl p-1 border border-[var(--border-color)]/60 shadow-sm">
                                <button onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, qty - 1); }}
                                  className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center active:scale-90 transition-all" style={{ background: "var(--primary)" }}>
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm font-bold w-7 text-center text-[var(--text-primary)]">{qty}</span>
                                <button onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, qty + 1); }}
                                  className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center active:scale-90 transition-all" style={{ background: "var(--primary)" }}>
                                  <Plus size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid gap-3">
            {filtered.map((p, idx) => {
              const qty = getItemQty(p.id);
              return (
                <div key={p.id} className="group relative bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/70 border border-[var(--border-color)]/30 hover:border-[var(--primary)]/20 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 hover:shadow-lg hover:shadow-black/10 animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
                   <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-[var(--border-color)]/40 overflow-hidden shadow-md shadow-black/10 group-hover:shadow-lg group-hover:shadow-black/15 transition-shadow duration-200" style={{ background: "var(--primary)08" }}>
                    {p.imagen ? <img src={p.imagen} alt="" className="w-full h-full object-cover" /> : "🍽️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate text-[var(--text-primary)]">{p.nombre}</h4>
                    {p.descripcion && <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">{p.descripcion}</p>}
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="font-extrabold text-lg" style={{ color: "var(--primary)" }}>${p.precio.toLocaleString()}</span>
                      {qty === 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); handleAddProduct(p); }}
                          className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center active:scale-90 transition-all duration-200 shadow-lg hover:shadow-xl" style={{ background: "var(--primary)", boxShadow: "0 4px 14px 0 color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                          <Plus size={20} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-xl p-1 border border-[var(--border-color)]/60 shadow-sm">
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, qty - 1); }}
                            className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center active:scale-90 transition-all" style={{ background: "var(--primary)" }}>
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold w-7 text-center text-[var(--text-primary)]">{qty}</span>
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, qty + 1); }}
                            className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center active:scale-90 transition-all" style={{ background: "var(--primary)" }}>
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {productos.length === 0 && (
          <div className="text-center py-24 animate-fade-up">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-secondary)]/50 flex items-center justify-center mx-auto mb-5 text-4xl border border-[var(--border-color)]/30 shadow-lg shadow-black/10">
              🍽️
            </div>
            <p className="text-[var(--text-secondary)] font-semibold text-sm">No hay productos disponibles</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">Vuelve más tarde para ver el menú</p>
          </div>
        )}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 p-4 pb-3 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/95 to-transparent pointer-events-none">
          <button onClick={() => router.push("/cliente/carrito")}
            className="pointer-events-auto w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl text-white font-bold text-sm transition-all duration-200 active:scale-[0.98]" style={{ background: "var(--primary)", boxShadow: "0 8px 30px 0 color-mix(in srgb, var(--primary) 45%, transparent), 0 2px 8px 0 rgba(0,0,0,0.2)" }}>
            <div className="relative">
              <ShoppingCart size={18} />
              <span className="absolute -top-2 -right-2.5 bg-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center" style={{ color: "var(--primary)" }}>{totalItems}</span>
            </div>
            <span>Ver carrito</span>
            <span className="font-extrabold text-base">${totalPrice.toLocaleString()}</span>
          </button>
        </div>
      )}
    </div>
  );
}