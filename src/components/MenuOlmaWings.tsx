"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Minus, X, Trash2, Star, Bike, Clock, MapPin, Phone, ShoppingCart, Sparkles, Flame, Beer, Wine, ChevronRight, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";

const OLMA_ID = "58ed85d5-94a7-4433-afab-3b9bf7de8d6f";

const FALLBACK_PRICES: Record<string, number> = { x6: 24000, x12: 46000, x18: 68000, x24: 90000, x30: 112000, x36: 134000 };
const FALLBACK_SAUCES = ["BBQ Picante", "Gochujang", "Corozo", "Ajo", "Tamarindo", "Mango Picante", "Maracuyá", "Miel Mostaza", "BBQ Ahumada"];
const SAUCE_LIMITS: Record<string, number> = { x6: 2, x12: 3, x18: 4, x24: 5, x30: 6, x36: 7 };
const FALLBACK_SODAS = [
  { name: "Coca Cola", price: 5000, emoji: "🥤" },
  { name: "Sprite", price: 5000, emoji: "🥤" },
  { name: "Colombiana", price: 5000, emoji: "🥤" },
  { name: "Agua", price: 3000, emoji: "💧" },
  { name: "Hatsu", price: 7000, emoji: "🧃" },
];
const FALLBACK_BEERS = [
  { name: "Heineken", price: 6000, emoji: "🍺" },
  { name: "Corona", price: 6000, emoji: "🍺" },
  { name: "Poker", price: 6000, emoji: "🍺" },
  { name: "Costeña", price: 6000, emoji: "🍺" },
];

const SIZE_LABELS: Record<string, string> = { x6: "6 und", x12: "12 und", x18: "18 und", x24: "24 und", x30: "30 und", x36: "36 und" };
const SIZE_EMOJI: Record<string, string> = { x6: "🐔", x12: "🐔", x18: "🐔", x24: "🐔", x30: "🐔", x36: "🐔" };
const SAUCE_EMOJIS: Record<string, string> = { "BBQ Picante": "🌶️", Gochujang: "🇰🇷", Corozo: "🫐", Ajo: "🧄", Tamarindo: "🫘", "Mango Picante": "🥭", Maracuyá: "💛", "Miel Mostaza": "🍯", "BBQ Ahumada": "🔥" };

function fp(n: number) { return "$" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function ol(key: string) { return SIZE_LABELS[key] || key; }
function genId() { return "olma_" + Math.random().toString(36).substr(2, 8); }

type ProductRecord = { id: string; nombre: string; descripcion: string; precio: number; categoria_producto: string; imagen: string; disponible: boolean };
type Negocio = { id: string; nombre: string; categoria: string; descripcion: string; logo: string; banner: string; rating: number; calificacion: number; tiempo_estimado: string; domicilio_cost: number; abierto: boolean; direccion: string; telefono: string };

const BANNER_FALLBACK = "https://images.unsplash.com/photo-1608039829572-fa0675e5b29b?w=800&q=80";

export default function MenuOlmaWings({ negocio }: { negocio: Negocio }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [drinks, setDrinks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [dTab, setDTab] = useState("sodas");
  const [promo, setPromo] = useState(true);
  const [mType, setMType] = useState("broaster");
  const [mSize, setMSize] = useState("x12");
  const [mInc, setMInc] = useState<string[]>([]);
  const [mXSauces, setMXSauces] = useState<{name: string; qty: number}[]>([]);
  const [mPres, setMPres] = useState("bañadas");
  const [mXWings, setMXWings] = useState(0);
  const [mXFries, setMXFries] = useState(0);
  const [mNote, setMNote] = useState("");

  const [dbProducts, setDbProducts] = useState<ProductRecord[]>([]);

  useEffect(() => {
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "productos",
        filters: [
          { method: "eq", column: "negocio_id", value: OLMA_ID },
          { method: "eq", column: "disponible", value: true },
        ],
      }),
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length) setDbProducts(data); })
      .catch(() => {});
  }, []);

  const {
    PRICES, ALL_SAUCES, SODAS, BEERS,
    EXTRA_SAUCE_PRICE, EXTRA_WING_PRICE, EXTRA_FRIES_PRICE,
    wingPackMap, drinkMap,
  } = useMemo(() => {
    if (!dbProducts.length) {
      return {
        PRICES: FALLBACK_PRICES, ALL_SAUCES: FALLBACK_SAUCES,
        SODAS: FALLBACK_SODAS, BEERS: FALLBACK_BEERS,
        EXTRA_SAUCE_PRICE: 2300, EXTRA_WING_PRICE: 4500, EXTRA_FRIES_PRICE: 4000,
        wingPackMap: {} as Record<string, string>,
        drinkMap: {} as Record<string, string>,
      };
    }

    const packs = dbProducts.filter((p) => p.categoria_producto === "Pack Alitas");
    const sauces = dbProducts.filter((p) => p.categoria_producto === "Salsa").map((p) => p.nombre);
    const sodas = dbProducts.filter((p) => p.categoria_producto === "Gaseosa");
    const beers = dbProducts.filter((p) => p.categoria_producto === "Cerveza");
    const extras = dbProducts.filter((p) => p.categoria_producto === "Adición");

    const prices: Record<string, number> = {};
    const packMap: Record<string, string> = {};
    for (const p of packs) {
      const m = p.nombre.match(/^(\d+)\s*und/i);
      if (m) { const k = `x${m[1]}`; prices[k] = Number(p.precio); packMap[k] = p.id; }
    }

    const dMap: Record<string, string> = {};
    for (const p of [...sodas, ...beers]) dMap[p.nombre] = p.id;

    const xSauce = extras.find((e) => /salsa/i.test(e.nombre));
    const xWing = extras.find((e) => /alita/i.test(e.nombre));
    const xFries = extras.find((e) => /papa/i.test(e.nombre));

    return {
      PRICES: Object.keys(prices).length ? prices : FALLBACK_PRICES,
      ALL_SAUCES: sauces.length ? sauces : FALLBACK_SAUCES,
      SODAS: sodas.length ? sodas.map((p) => ({ name: p.nombre, price: Number(p.precio), emoji: "🥤" as const })) : FALLBACK_SODAS,
      BEERS: beers.length ? beers.map((p) => ({ name: p.nombre, price: Number(p.precio), emoji: "🍺" as const })) : FALLBACK_BEERS,
      EXTRA_SAUCE_PRICE: xSauce ? Number(xSauce.precio) : 2300,
      EXTRA_WING_PRICE: xWing ? Number(xWing.precio) : 4500,
      EXTRA_FRIES_PRICE: xFries ? Number(xFries.precio) : 4000,
      wingPackMap: packMap,
      drinkMap: dMap,
    };
  }, [dbProducts]);

  function resetM() { setMSize("x12"); setMInc([]); setMXSauces([]); setMPres("bañadas"); setMXWings(0); setMXFries(0); setMNote(""); }

  function openNew() { setEditId(null); resetM(); setShowModal(true); }
  function openEdit(id: string) {
    const o = orders.find(x => x.id === id); if (!o) return;
    setEditId(id); setMType(o.wingType); setMSize(o.size); setMInc([...o.included]);
    setMXSauces(o.extraSauces.map((e: any) => ({ ...e }))); setMPres(o.presentation);
    setMXWings(o.extraWings); setMXFries(o.extraFries); setMNote(o.note || "");
    setShowModal(true);
  }

  function calcOrderPrice(o: any) {
    let t = PRICES[o.size as keyof typeof PRICES] || 0;
    t += (o.extraSauces || []).reduce((s: number, e: any) => s + e.qty * EXTRA_SAUCE_PRICE, 0);
    t += (o.extraWings || 0) * EXTRA_WING_PRICE;
    t += (o.extraFries || 0) * EXTRA_FRIES_PRICE;
    return t;
  }

  function saveOrder() {
    const order = {
      id: editId || genId(), wingType: mType, size: mSize, included: [...mInc],
      extraSauces: mXSauces.map(e => ({ ...e })), presentation: mPres,
      extraWings: mXWings, extraFries: mXFries, note: mNote,
    };
    if (editId) setOrders(p => p.map(o => o.id === editId ? order : o));
    else setOrders(p => [...p, order]);
    setShowModal(false);
  }

  function toggleInc(s: string) {
    const lim = SAUCE_LIMITS[mSize as keyof typeof SAUCE_LIMITS] || 2;
    if (mInc.includes(s)) setMInc(p => p.filter(x => x !== s));
    else if (mInc.length < lim) setMInc(p => [...p, s]);
  }

  function addX(s: string) {
    const e = mXSauces.find(x => x.name === s);
    if (e) setMXSauces(p => p.map(x => x.name === s ? { ...x, qty: x.qty + 1 } : x));
    else setMXSauces(p => [...p, { name: s, qty: 1 }]);
    setShowExtra(false);
  }

  function addDrink(d: typeof FALLBACK_SODAS[0]) {
    setDrinks(p => { const e = p.find(x => x.name === d.name); return e ? p.map(x => x.name === d.name ? { ...x, qty: x.qty + 1 } : x) : [...p, { ...d, qty: 1 }]; });
  }

  function sendToCart() {
    for (const o of orders) {
      const tipo = o.wingType === "broaster" ? "Broaster Clásico" : "Light Crunch";
      const baseName = `${ol(o.size)} ${tipo} (${o.presentation === "bañadas" ? "Bañadas" : "Salsa aparte"})`;
      let desc = o.included.length ? `Salsas: ${o.included.join(", ")}` : "Sin salsas";
      if (o.note) desc += ` | Nota: ${o.note}`;
      const packId = wingPackMap[o.size] || genId();
      addItem({ productId: packId, negocioId: OLMA_ID, negocioNombre: "Olma Wings and SmokeHouse", nombre: baseName, precio: PRICES[o.size as keyof typeof PRICES], descripcion: desc });
      for (const xs of o.extraSauces) {
        for (let i = 0; i < xs.qty; i++) {
          addItem({ productId: genId(), negocioId: OLMA_ID, negocioNombre: "Olma Wings and SmokeHouse", nombre: `Salsa extra: ${xs.name}`, precio: EXTRA_SAUCE_PRICE, descripcion: "" });
        }
      }
      if (o.extraWings > 0) {
        const wingId = dbProducts.find((p) => /alita/i.test(p.nombre) && p.categoria_producto === "Adición")?.id || genId();
        for (let i = 0; i < o.extraWings; i++) {
          addItem({ productId: wingId, negocioId: OLMA_ID, negocioNombre: "Olma Wings and SmokeHouse", nombre: "Alita extra", precio: EXTRA_WING_PRICE, descripcion: "" });
        }
      }
      if (o.extraFries > 0) {
        const fryId = dbProducts.find((p) => /papa/i.test(p.nombre) && p.categoria_producto === "Adición")?.id || genId();
        for (let i = 0; i < o.extraFries; i++) {
          addItem({ productId: fryId, negocioId: OLMA_ID, negocioNombre: "Olma Wings and SmokeHouse", nombre: "Porción extra de papas", precio: EXTRA_FRIES_PRICE, descripcion: "" });
        }
      }
    }
    for (const d of drinks) {
      const drinkProductId = drinkMap[d.name] || genId();
      for (let i = 0; i < d.qty; i++) {
        addItem({ productId: drinkProductId, negocioId: OLMA_ID, negocioNombre: "Olma Wings and SmokeHouse", nombre: d.name, precio: d.price, descripcion: "" });
      }
    }
    router.push("/cliente/checkout");
  }

  const totOrd = orders.reduce((s, o) => s + calcOrderPrice(o), 0);
  const totDrinks = drinks.reduce((s, d) => s + d.price * d.qty, 0);
  const totGen = totOrd + totDrinks;

  const inputC = "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors text-sm";
  const hasOrders = orders.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32 font-[system-ui,-apple-system,sans-serif]">
      {/* ===== HERO / BANNER ===== */}
      <div className="relative h-[340px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-[#0a0a0a]" />
        <img src={negocio.banner || BANNER_FALLBACK} alt=""
          className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.6)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/30" />

        <button onClick={() => router.back()}
          className="absolute top-5 left-5 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all">
          <ArrowLeft size={18} />
        </button>

        {negocio.abierto !== undefined && (
          <div className="absolute top-5 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: negocio.abierto ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: negocio.abierto ? "#4ade80" : "#f87171", border: "1px solid", borderColor: negocio.abierto ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: negocio.abierto ? "#4ade80" : "#f87171" }} />
            {negocio.abierto ? "Abierto" : "Cerrado"}
          </div>
        )}

        {/* Brand */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          <div className="flex items-end gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-700/30 border-2 border-amber-400/30 backdrop-blur-md flex items-center justify-center text-4xl shrink-0 shadow-2xl overflow-hidden">
              {negocio.logo ? (
                <img src={negocio.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-amber-400" style={{ fontFamily: "Georgia, serif" }}>O</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-3xl font-black tracking-tight drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
                {negocio.nombre || "Olma Wings & SmokeHouse"}
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-400/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">{negocio.categoria || "Alitas"}</span>
                <span className="flex items-center gap-1 text-xs text-white/60">
                  <Star size={11} className="text-amber-400" fill="#fbbf24" /> {negocio.rating || negocio.calificacion || "4.8"}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                <span className="flex items-center gap-1.5"><Bike size={13} className="text-amber-400/70" /> ${(negocio.domicilio_cost || 3000).toLocaleString()}</span>
                <span className="flex items-center gap-1.5"><Clock size={13} className="text-amber-400/70" /> {negocio.tiempo_estimado || "30-45 min"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== INFO BAR ===== */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs text-white/40 bg-white/5 px-3 py-2 rounded-xl flex-1 min-w-0">
          <MapPin size={13} className="shrink-0 text-amber-400/60" />
          <span className="truncate">{negocio.direccion || "Cra 1C #22-80, El Rodadero, Santa Marta"}</span>
        </div>
        {negocio.telefono && (
          <a href={`tel:${negocio.telefono}`} className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0 active:scale-90 transition-all">
            <Phone size={15} />
          </a>
        )}
      </div>

      {/* ===== CONTENT ===== */}
      <div className="px-4 mt-5 space-y-5 pb-6">

        {/* PROMO BANNER */}
        {promo && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 to-amber-950/40 border border-amber-500/20 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="text-[10px] font-bold tracking-[0.3em] text-amber-400/60 uppercase mb-1">🔥 Promoción</div>
              <h3 className="text-xl font-black text-amber-300">PROMO ALITAS</h3>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Paga 6 lleva 8", "Paga 12 lleva 15", "Paga 18 lleva 20"].map(p => (
                  <span key={p} className="text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20 px-3 py-1.5 rounded-lg">{p}</span>
                ))}
              </div>
              <button onClick={() => setPromo(false)} className="mt-3 text-[10px] text-white/30 underline underline-offset-2">Cerrar</button>
            </div>
          </div>
        )}

        {/* ===== SECTION: WING TYPE ===== */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-amber-400/80">Tipo de alita</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "broaster", label: "Broaster Clásico", desc: "Más crocante, más power.", emoji: "🍗" },
              { id: "light", label: "Light Crunch", desc: "Más ligero, más sabor.", emoji: "✨" },
            ].map(t => (
              <button key={t.id} onClick={() => { setMType(t.id); resetM(); setOrders([]); setDrinks([]); }}
                className={`relative p-4 rounded-2xl text-left transition-all active:scale-[0.97] border-2 ${
                  mType === t.id
                    ? "border-amber-400 bg-gradient-to-br from-amber-400/15 to-amber-500/5 shadow-lg shadow-amber-400/10"
                    : "border-white/[0.06] bg-white/[0.03] hover:border-white/20"
                }`}>
                <span className="text-2xl mb-2 block">{t.emoji}</span>
                <p className="font-bold text-sm">{t.label}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{t.desc}</p>
                {mType === t.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                    <Check size={10} color="#0a0a0a" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ===== SECTION: ORDERS ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-amber-400/80">Órdenes</h2>
              {hasOrders && <span className="text-[10px] bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded-full font-bold">{orders.length}</span>}
            </div>
            <button onClick={openNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold active:scale-95 transition-all shadow-lg shadow-amber-400/20">
              <Plus size={14} /> Nueva orden
            </button>
          </div>

          {!hasOrders ? (
            <button onClick={openNew}
              className="w-full py-10 rounded-2xl border-2 border-dashed border-white/[0.06] text-white/30 text-sm font-medium hover:border-amber-400/20 hover:text-amber-400/50 transition-all active:scale-[0.98] flex flex-col items-center gap-2">
              <span className="text-3xl">🍗</span>
              <span>Crea tu primera orden de alitas</span>
            </button>
          ) : (
            <div className="space-y-2">
              {orders.map((o, i) => (
                <div key={o.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-amber-400/10 text-amber-400 font-black text-[10px] flex items-center justify-center">#{i + 1}</span>
                        <span className="text-sm font-bold">{ol(o.size)}</span>
                        <span className="text-[9px] font-semibold bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded-full">{o.wingType === "broaster" ? "Broaster" : "Light Crunch"}</span>
                        <span className="text-[9px] font-semibold bg-white/5 text-white/50 px-2 py-0.5 rounded-full">{o.presentation === "bañadas" ? "Bañadas" : "Salsa aparte"}</span>
                      </div>
                      {o.included.length > 0 && <p className="text-[10px] text-white/40 mt-1.5">Salsas: {o.included.join(", ")}</p>}
                      {o.extraSauces.length > 0 && <p className="text-[10px] text-amber-400/50 mt-0.5">Extra: {o.extraSauces.map((e: any) => `${e.name} x${e.qty}`).join(", ")}</p>}
                      {(o.extraWings > 0 || o.extraFries > 0) && (
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {o.extraWings > 0 && `🐔 +${o.extraWings} alita(s)`} {o.extraFries > 0 && `🍟 +${o.extraFries} papa(s)`}
                        </p>
                      )}
                      {o.note && <p className="text-[10px] text-white/30 italic mt-0.5">📝 {o.note}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(o.id)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 active:scale-90 transition-all hover:border-amber-400/30 text-xs">✏️</button>
                      <button onClick={() => setOrders(p => p.filter(x => x.id !== o.id))}
                        className="w-8 h-8 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-400/50 active:scale-90 transition-all hover:border-red-400/30"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.04] flex justify-between items-center">
                    <span className="text-[10px] text-white/30">Base {fp(PRICES[o.size as keyof typeof PRICES])}</span>
                    <span className="text-base font-black text-amber-400">{fp(calcOrderPrice(o))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== SECTION: DRINKS ===== */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Wine size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-amber-400/80">Bebidas</h2>
            {drinks.length > 0 && <span className="text-[10px] bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded-full font-bold">{drinks.reduce((s, d) => s + d.qty, 0)}</span>}
          </div>
          <div className="flex gap-1 mb-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
            {["sodas", "beers"].map(t => (
              <button key={t} onClick={() => setDTab(t)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${dTab === t ? "bg-amber-400 text-black shadow-lg" : "text-white/40 hover:text-white/70"}`}>
                {t === "sodas" ? "🥤 Gaseosas" : "🍺 Cervezas"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(dTab === "sodas" ? SODAS : BEERS).map(d => {
              const inCart = drinks.find(x => x.name === d.name);
              return (
                <button key={d.name} onClick={() => addDrink(d)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-400/20 active:scale-[0.97] transition-all">
                  <span className="text-xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold">{d.name}</p>
                    <p className="text-[10px] text-amber-400/70 font-bold">{fp(d.price)}</p>
                  </div>
                  {inCart ? (
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-[9px] font-bold flex items-center justify-center">{inCart.qty}</span>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Plus size={10} className="text-white/40" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {drinks.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {drinks.map(d => (
                <div key={d.name} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5">
                  <span className="text-xs font-medium">{d.emoji} {d.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDrinks(p => { const e = p.find(x => x.name === d.name); if (e.qty <= 1) return p.filter(x => x.name !== d.name); return p.map(x => x.name === d.name ? { ...x, qty: x.qty - 1 } : x); })}
                      className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs active:scale-90 text-white/50">−</button>
                    <span className="text-xs font-bold w-5 text-center text-white/80">{d.qty}</span>
                    <button onClick={() => addDrink(d)}
                      className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs active:scale-90 text-white/50">+</button>
                    <span className="text-xs text-amber-400 font-bold w-16 text-right">{fp(d.price * d.qty)}</span>
                    <button onClick={() => setDrinks(p => p.filter(x => x.name !== d.name))}
                      className="w-7 h-7 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-400/50 active:scale-90"><X size={10} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== SUMMARY CARD ===== */}
        <div className="bg-gradient-to-br from-amber-400/[0.04] to-transparent border border-amber-400/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={15} className="text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-amber-400/80">Resumen</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-white/60">
              <span>Órdenes de alitas</span>
              <span className="font-semibold text-white">{orders.length} ({fp(totOrd)})</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Bebidas</span>
              <span className="font-semibold text-white">{drinks.reduce((s, d) => s + d.qty, 0)} und ({fp(totDrinks)})</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Domicilio</span>
              <span className="font-semibold text-white">${(negocio.domicilio_cost || 3000).toLocaleString()}</span>
            </div>
            <div className="h-px bg-white/5 my-2" />
            <div className="flex justify-between text-base">
              <span className="font-bold text-white">Total</span>
              <span className="font-black text-amber-400 text-lg">{fp(totGen + (negocio.domicilio_cost || 3000))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== STICKY CTA ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-5 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
        <button onClick={sendToCart} disabled={!hasOrders}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-[0.97] shadow-2xl ${
            hasOrders
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-amber-400/25"
              : "bg-white/[0.04] text-white/20 border border-white/[0.06]"
          }`}>
          {hasOrders ? (
            <><ShoppingCart size={18} /> Ir a pagar — {fp(totGen + (negocio.domicilio_cost || 3000))}</>
          ) : (
            <><ShoppingCart size={18} /> Agrega una orden de alitas</>
          )}
        </button>
      </div>

      {/* ===== ORDER MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto bg-[#0f0f0f] rounded-t-3xl sm:rounded-3xl p-5 border-t border-amber-400/10 shadow-2xl scrollbar-hide" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-base">{editId ? "Editar orden" : "Nueva orden"}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 active:scale-90">✕</button>
            </div>

            {/* Cantidad */}
            <div className="mb-5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60 mb-2 block">Cantidad</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(PRICES).map(([k, v]) => (
                  <button key={k} onClick={() => { setMSize(k); setMInc([]); }}
                    className={`p-3 rounded-xl text-center transition-all active:scale-95 border ${
                      mSize === k ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10" : "border-white/[0.06] bg-white/[0.03] hover:border-white/20"
                    }`}>
                    <div className="text-lg mb-0.5">{SIZE_EMOJI[k as keyof typeof SIZE_EMOJI]}</div>
                    <div className="text-xs font-bold">{ol(k)}</div>
                    <div className="text-[9px] text-amber-400/70 font-semibold">{fp(v)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Salsas incluidas */}
            <div className="mb-5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60 mb-2 block">
                Salsas incluidas <span className="text-white/30 normal-case">({mInc.length}/{SAUCE_LIMITS[mSize as keyof typeof SAUCE_LIMITS] || 2})</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SAUCES.map(s => {
                  const a = mInc.includes(s);
                  const lim = SAUCE_LIMITS[mSize as keyof typeof SAUCE_LIMITS] || 2;
                  const disabled = !a && mInc.length >= lim;
                  return (
                    <button key={s} onClick={() => toggleInc(s)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 border ${
                        a ? "bg-amber-400 text-black border-amber-400 shadow-sm" : disabled ? "bg-white/[0.02] border-white/[0.04] text-white/20" : "bg-white/[0.04] border-white/10 text-white/60 hover:border-amber-400/30"
                      }`}>
                      {SAUCE_EMOJIS[s as keyof typeof SAUCE_EMOJIS] || "🌶️"} {s} {a && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Presentación */}
            <div className="mb-5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60 mb-2 block">Presentación</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: "bañadas", label: "Bañadas", desc: "Alitas bañadas en salsa", emoji: "🫕" }, { id: "aparte", label: "Salsa aparte", desc: "Salsa servida aparte", emoji: "🥣" }].map(p => (
                  <button key={p.id} onClick={() => setMPres(p.id)}
                    className={`p-3 rounded-xl text-left transition-all active:scale-[0.97] border-2 ${
                      mPres === p.id ? "border-amber-400 bg-amber-400/10" : "border-white/[0.06] bg-white/[0.03]"
                    }`}>
                    <span className="text-lg block mb-1">{p.emoji}</span>
                    <p className="font-bold text-xs">{p.label}</p>
                    <p className="text-[9px] text-white/40">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Salsas extra */}
            <div className="mb-5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60 mb-2 block">Salsas extra ({fp(EXTRA_SAUCE_PRICE)} c/u)</label>
              {mXSauces.length === 0 ? (
                <button onClick={() => setShowExtra(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-white/[0.06] text-white/30 text-xs font-medium hover:border-amber-400/20 hover:text-amber-400/50 transition-all active:scale-[0.98]">
                  + Agregar salsa extra
                </button>
              ) : (
                <div className="space-y-1.5">
                  {mXSauces.map(e => (
                    <div key={e.name} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                      <span className="text-xs font-medium">{SAUCE_EMOJIS[e.name as keyof typeof SAUCE_EMOJIS] || "🌶️"} {e.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { const n = e.qty - 1; if (n <= 0) setMXSauces(p => p.filter(x => x.name !== e.name)); else setMXSauces(p => p.map(x => x.name === e.name ? { ...x, qty: n } : x)); }}
                          className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs active:scale-90 text-white/50">−</button>
                        <span className="text-xs font-bold w-4 text-center">{e.qty}</span>
                        <button onClick={() => setMXSauces(p => p.map(x => x.name === e.name ? { ...x, qty: x.qty + 1 } : x))}
                          className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs active:scale-90 text-white/50">+</button>
                        <span className="text-xs text-amber-400 font-bold w-14 text-right">{fp(e.qty * EXTRA_SAUCE_PRICE)}</span>
                        <button onClick={() => setMXSauces(p => p.filter(x => x.name !== e.name))}
                          className="w-6 h-6 rounded-lg bg-red-500/5 flex items-center justify-center text-red-400/50 active:scale-90"><X size={10} /></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setShowExtra(true)} className="text-[10px] text-amber-400/50 font-medium active:scale-95">+ Agregar otra salsa</button>
                </div>
              )}
            </div>

            {/* Adiciones */}
            <div className="mb-5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60 mb-2 block">Adiciones</label>
              <div className="space-y-2">
                {[
                  { key: "xw", label: "Alita extra", price: EXTRA_WING_PRICE, emoji: "🐔", val: mXWings, set: setMXWings },
                  { key: "xf", label: "Porción extra de papas", price: EXTRA_FRIES_PRICE, emoji: "🍟", val: mXFries, set: setMXFries },
                ].map(a => (
                  <div key={a.key} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{a.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold">{a.label}</p>
                        <p className="text-[9px] text-amber-400/60">{fp(a.price)} c/u</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => a.set(Math.max(0, a.val - 1))}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs active:scale-90 text-white/50">−</button>
                      <span className="text-sm font-bold w-5 text-center text-white/80">{a.val}</span>
                      <button onClick={() => a.set(a.val + 1)}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs active:scale-90 text-white/50">+</button>
                      <span className="text-xs text-amber-400 font-bold w-16 text-right">{fp(a.val * a.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota */}
            <div className="mb-5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60 mb-2 block">Nota</label>
              <textarea placeholder="Ej: Sin cebolla, bien asado..." value={mNote} onChange={e => setMNote(e.target.value)} rows={2}
                className={inputC + " resize-none"} />
            </div>

            {/* Subtotal */}
            <div className="flex items-center justify-between bg-amber-400/[0.06] border border-amber-400/10 rounded-2xl px-4 py-3 mb-4">
              <span className="text-sm font-medium text-white/60">Subtotal</span>
              <span className="text-lg font-black text-amber-400">{fp(calcOrderPrice({ size: mSize, extraSauces: mXSauces, extraWings: mXWings, extraFries: mXFries }))}</span>
            </div>

            <button onClick={saveOrder}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-sm active:scale-[0.97] transition-all shadow-lg shadow-amber-400/20">
              {editId ? "Guardar cambios" : "Agregar orden"}
            </button>
          </div>
        </div>
      )}

      {/* ===== EXTRA SAUCE PICKER MODAL ===== */}
      {showExtra && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setShowExtra(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#0f0f0f] rounded-t-3xl sm:rounded-3xl p-5 border-t border-amber-400/10" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-4">Seleccionar salsa extra</h3>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SAUCES.map(s => (
                <button key={s} onClick={() => addX(s)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-medium active:scale-95 hover:border-amber-400/30 transition-all">
                  {SAUCE_EMOJIS[s as keyof typeof SAUCE_EMOJIS] || "🌶️"} {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        }
      `}</style>
    </div>
  );
}
