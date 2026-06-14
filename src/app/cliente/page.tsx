"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ChevronRight, Star, Clock, Bike, Bell, Store, Sparkles, ArrowRight, X, CheckCircle, User, Phone, Mail, Lock, TrendingUp, Navigation } from "lucide-react";
import { fetchData } from "@/lib/client-data";
import { useNotificaciones } from "@/context/NotificationContext";

type Negocio = {
  id: string; nombre: string; categoria: string; descripcion: string;
  logo: string; rating: number; tiempo_estimado: string; domicilio_cost: number;
  abierto: boolean; destacado: boolean; calificacion: number;
  es_local?: boolean; cobertura_km?: number;
};

const categories = [
  { label: "Restaurantes", icon: "🍔", slug: "Restaurantes", desc: "Comida rápida, japonesa, pizza y más", color: "from-rose-500/20 to-rose-500/5" },
  { label: "Mercado", icon: "🛒", slug: "Mercado", desc: "Supermercados, frutas, carnes y despensa", color: "from-emerald-500/20 to-emerald-500/5" },
  { label: "Farmacia", icon: "💊", slug: "Droguerias", desc: "Medicamentos 24/7, fórmulas y cuidado", color: "from-blue-500/20 to-blue-500/5" },
  { label: "Licores", icon: "🍷", slug: "Licoreras", desc: "Cervezas, vinos, cocteles y más", color: "from-purple-500/20 to-purple-500/5" },
  { label: "DomiU Favor", icon: "📦", slug: "Envios", desc: "Mensajería express, lo que necesites", color: "from-amber-500/20 to-amber-500/5" },
];

const banners = [
  { title: "¡30% OFF en Mariscos!", subtitle: "Válido en restaurantes participantes", emoji: "🦐", color: "from-cyan-500/20 to-blue-500/10" },
  { title: "Envío gratis en tu primer pedido", subtitle: "Usa BIENVENIDO10 · 10% OFF adicional", emoji: "🎉", color: "from-yellow-500/20 to-orange-500/10" },
  { title: "Farmacia 24/7 · Abierto ahora", subtitle: "Adjunta tu fórmula médica al pedido", emoji: "💊", color: "from-emerald-500/20 to-teal-500/10" },
  { title: "DomiU Express · Mensajería Ya", subtitle: "Lo que necesites, donde sea", emoji: "📦", color: "from-violet-500/20 to-purple-500/10" },
];

const topBuscados = ["Pizza", "Hamburguesa", "Pollo", "Mexicana", "Postres", "Café", "Helado", "Gaseosas", "Mexicana"];

type ModalType = "register" | "about" | "work" | "repartidores" | "prensa" | "help" | "terms" | "privacy" | "data" | "join-business" | "join-store" | "join-rider" | "notifications" | null;

const modalContent: Record<string, { title: string; body: string[] }> = {
  about: {
    title: "Sobre DomiU",
    body: [
      "DomiU Magdalena es una plataforma de domicilios que conecta a los habitantes de Santa Marta y el Magdalena con los mejores negocios locales. Nuestra misión es llevar todo lo que necesitas directamente a tu puerta, de manera rápida y segura.",
      "Trabajamos con restaurantes, tiendas, licoreras, farmacias y más para ofrecerte la mejor experiencia de domicilio en la región. Creemos en el comercio local y en la economía de nuestra comunidad.",
      "Fundada con el propósito de hacer la vida más fácil a los magdalenenses, DomiU sigue creciendo para ofrecerte más opciones, mejores precios y un servicio excepcional.",
    ],
  },
  work: {
    title: "Trabaja con nosotros",
    body: [
      "¿Quieres formar parte del equipo DomiU Magdalena? Estamos buscando personas talentosas y apasionadas por el servicio al cliente.",
      "Posiciones disponibles:",
      "• Repartidores independientes (horarios flexibles)",
      "• Atención al cliente",
      "• Desarrollo de tecnología",
      "• Alianzas comerciales",
      "Envía tu hoja de vida a trabajaconnosotros@domiumagdalena.com y te contactaremos pronto.",
    ],
  },
  repartidores: {
    title: "Repartidores",
    body: [
      "Únete a nuestro equipo de repartidores y gana dinero extra en tus tiempos libres. En DomiU Magdalena, los repartidores son la parte más importante de nuestro servicio.",
      "Beneficios:",
      "• Horarios flexibles — trabaja cuando quieras",
      "• Gana hasta $3,000 por domicilio + propinas",
      "• Pagos semanales sin complicaciones",
      "• Zona de trabajo: Santa Marta y alrededores",
      "Requisitos: tener moto, bicicleta o vehículo propio, smartphone con datos y disponibilidad de al menos 4 horas al día.",
    ],
  },
  prensa: {
    title: "Prensa",
    body: [
      "Bienvenidos a la sala de prensa de DomiU Magdalena. Aquí encontrarás comunicados oficiales, noticias y recursos para medios de comunicación.",
      "Para consultas de prensa, contáctanos en:",
      "• Email: prensa@domiumagdalena.com",
      "• Teléfono: +57 301 234 5678",
      "Próximamente estaremos compartiendo nuestras últimas noticias y logros.",
    ],
  },
  help: {
    title: "Centro de ayuda",
    body: [
      "¿Tienes alguna duda o problema? Estamos aquí para ayudarte.",
      "Preguntas frecuentes:",
      "• ¿Cómo hago un pedido? Busca un negocio, agrega productos al carrito y confirma tu pedido.",
      "• ¿Cómo pago? Puedes pagar en efectivo, con Nequi, transferencia, DaviPlata o con tu billetera DomiPay.",
      "• ¿Cuánto tarda el domicilio? Depende del negocio, pero usualmente 30-60 minutos.",
      "• ¿Cómo rastreo mi pedido? Ve a 'Mis pedidos' e ingresa tu teléfono.",
      "Si necesitas más ayuda, escríbenos a ayuda@domiumagdalena.com o llama al +57 301 234 5678.",
    ],
  },
  terms: {
    title: "Términos y condiciones",
    body: [
      "1. Aceptación de términos: Al usar DomiU Magdalena, aceptas estos términos en su totalidad.",
      "2. Servicio: DomiU actúa como intermediario entre negocios y clientes.",
      "3. Registro: Es responsabilidad del usuario proporcionar información veraz.",
      "4. Precios: Los precios publicados incluyen IVA. El costo de domicilio se calcula según la distancia.",
      "5. Cancelaciones: Los pedidos pueden cancelarse antes de que el negocio confirme su preparación.",
      "6. Devoluciones: Cualquier reclamo sobre productos debe hacerse dentro de las 24 horas.",
      "7. Propiedad intelectual: El nombre DomiU, logotipos y diseño son propiedad de DomiU Magdalena.",
    ],
  },
  privacy: {
    title: "Política de privacidad",
    body: [
      "En DomiU Magdalena valoramos tu privacidad y nos comprometemos a proteger tus datos personales.",
      "1. Información que recopilamos: Nombre, dirección, teléfono, email, ubicación y datos de pago.",
      "2. Uso de la información: Usamos tus datos para procesar pedidos y mejorar nuestro servicio.",
      "3. Protección: Implementamos medidas de seguridad técnicas y organizativas.",
      "4. Compartición: No vendemos tus datos a terceros.",
      "5. Tus derechos: Puedes solicitar acceso, corrección o eliminación de tus datos.",
    ],
  },
  data: {
    title: "Tratamiento de datos",
    body: [
      "DomiU Magdalena, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, informa:",
      "• Responsable del tratamiento: DomiU Magdalena, NIT 901.XXX.XXX-X, Santa Marta.",
      "• Finalidad: Gestión de pedidos, comunicación con usuarios, mejora del servicio.",
      "• Derechos del titular: Conocer, actualizar, rectificar y solicitar eliminación de datos.",
      "• Canal: datospersonales@domiumagdalena.com",
    ],
  },
  "join-business": {
    title: "Registra tu negocio",
    body: [
      "¡Lleva tu negocio al mundo digital con DomiU Magdalena!",
      "Beneficios:",
      "• Llega a cientos de clientes en Santa Marta y el Magdalena",
      "• Sin inversión inicial — solo pagas una comisión por pedido",
      "• Panel de administración para gestionar tu menú y pedidos",
      "• Reportes detallados de ventas",
      "¡Escríbenos a negocios@domiumagdalena.com!",
    ],
  },
  "join-store": {
    title: "Registra tu tienda",
    body: [
      "¿Tienes una tienda física? ¡Vende por DomiU Magdalena!",
      "Beneficios:",
      "• Alcance a miles de clientes potenciales",
      "• Gestión sencilla de inventario y pedidos",
      "• Estadísticas de ventas en tiempo real",
      "• Sin costos mensuales fijos",
      "Contáctanos: tiendas@domiumagdalena.com",
    ],
  },
  "join-rider": {
    title: "Únete como repartidor",
    body: [
      "¿Tienes moto, bicicleta o carro? Gana dinero con DomiU Magdalena.",
      "• Te registras, activas tu disponibilidad y recibes pedidos cercanos.",
      "• Entregas el pedido y recibes tu pago directamente.",
      "• Tú decides cuándo trabajar.",
      "Beneficios:",
      "• Gana hasta $3,000 por domicilio + propinas",
      "• Pagos semanales",
      "• Horarios 100% flexibles",
      "¡Regístrate ahora! Descarga la app o escribe a repartidores@domiumagdalena.com.",
    ],
  },
};

export default function ClienteHome() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [cookieOk, setCookieOk] = useState(false);
  const { notificaciones, noLeidas, permiso, solicitarPermiso, marcarTodasLeidas } = useNotificaciones();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [locationText, setLocationText] = useState("Santa Marta, Magdalena");
  const [regNombre, setRegNombre] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAceptaTerminos, setRegAceptaTerminos] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      fetchData("negocios", {
        filters: [{ method: "eq", column: "activo", value: true }],
        order: [{ column: "destacado", ascending: false }],
      }),
      fetchData("locales", {
        filters: [{ method: "eq", column: "activo", value: true }],
      }),
    ]).then(([negociosData, localesData]: [any, any]) => {
      const negocioNames = new Set((negociosData || []).map((n: any) => n.nombre.toLowerCase()));
      const negociosList: Negocio[] = (negociosData || []).map((n: any) => ({ ...n, es_local: false }));
      const localesList: Negocio[] = (localesData || []).filter((l: any) => !negocioNames.has(l.nombre.toLowerCase())).map((l: any) => ({
        id: l.id, nombre: l.nombre, categoria: "General",
        descripcion: "", logo: "", rating: 0,
        tiempo_estimado: "30-45 min", domicilio_cost: 3000,
        abierto: true, destacado: false, calificacion: 0, es_local: true,
      }));
      setNegocios([...negociosList, ...localesList]);
      setLoading(false);
    }).catch(() => setLoading(false));
    if (typeof window !== "undefined") {
      setCookieOk(localStorage.getItem("cookie_ok") === "true");
    }
    // Auto banner rotation
    bannerTimer.current = setInterval(() => {
      setBannerIdx(i => (i + 1) % banners.length);
    }, 5000);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, []);

  // Try GPS location
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=AIzaSyBaQOa_K2AFz1v5R3f778DNK-MnVhEMCXY`);
          const data = await res.json();
          if (data.status === "OK" && data.results?.[0]) {
            const comps = data.results[0].address_components;
            const city = comps.find((c: any) => c.types.includes("locality"))?.long_name;
            const dept = comps.find((c: any) => c.types.includes("administrative_area_level_1"))?.long_name;
            if (city && dept) setLocationText(`${city}, ${dept}`);
            else if (city) setLocationText(city);
          }
        } catch {}
      }, () => {}, { timeout: 5000 });
    }
  }, []);

  const destacados = negocios.filter((n) => n.destacado);

  const handleRegister = async () => {
    setRegError("");
    if (!regNombre.trim() || !regEmail.trim() || !regTelefono.trim() || !regPassword.trim()) {
      setRegError("Todos los campos son obligatorios"); return;
    }
    if (!regAceptaTerminos) {
      setRegError("Debes aceptar los términos y condiciones"); return;
    }
    if (regPassword.length < 6) {
      setRegError("La contraseña debe tener al menos 6 caracteres"); return;
    }
    setRegLoading(true);
    try {
      const res = await fetch("/api/cliente/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: regNombre.trim(), email: regEmail.trim(), telefono: regTelefono.trim(), password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrarse");
      setRegSuccess(true);
      setRegNombre(""); setRegEmail(""); setRegTelefono(""); setRegPassword(""); setRegAceptaTerminos(false);
    } catch (err: any) { setRegError(err.message); }
    setRegLoading(false);
  };

  const Modal = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)}>
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
          <h2 className="font-black text-lg text-white">{modalContent[activeModal as string]?.title || "DomiU"}</h2>
          <button onClick={() => setActiveModal(null)} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center active:scale-90 transition-all border border-slate-700">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* HERO - Moderno */}
      <div className="hero-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-slate-900 font-black text-base shadow-lg shadow-yellow-400/20 shrink-0">D</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-yellow-400/70 font-semibold tracking-[2px] uppercase">DomiU Magdalena</p>
            <h1 className="text-xl font-black text-white leading-tight">Si tienes <span className="text-yellow-400">DomiU,</span> tienes <span className="text-yellow-400">Todo.</span></h1>
          </div>
          <button onClick={() => setActiveModal("notifications")} className="relative w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-all shrink-0">
            <Bell size={18} className="text-white" />
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-yellow-400 text-slate-900 text-[9px] font-bold flex items-center justify-center px-1 shadow-lg">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>
        </div>

        {/* Location pill */}
        <div className="location-input mb-3">
          <MapPin size={14} />
          <span>{locationText}</span>
          <ChevronRight size={12} />
        </div>

        {/* Search */}
        <div className="hero-search">
          <Search size={16} />
          <input type="text" placeholder="Buscar negocios, productos..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {search && (
          <div className="mt-4 animate-fade-up">
            <p className="text-sm text-white/60 mb-2">Resultados para &ldquo;{search}&rdquo;</p>
            {negocios.filter(n => n.nombre.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/5">
                <Search size={36} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50 text-sm">No encontramos resultados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {negocios.filter(n => n.nombre.toLowerCase().includes(search.toLowerCase())).map(n => (
                  <button key={n.id} onClick={() => n.es_local ? null : router.push(`/cliente/negocio/${n.id}`)}
                    className="w-full bg-white/5 hover:bg-white/10 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all text-left border border-white/5">
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-sm overflow-hidden">{n.logo ? <img src={n.logo} alt="" className="w-full h-full object-cover" /> : n.nombre[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{n.nombre}</p>
                      <p className="text-xs text-white/50">{n.es_local ? "Tienda" : `${n.categoria} · 🕐 ${n.tiempo_estimado}`}</p>
                    </div>
                    <ChevronRight size={16} className="text-white/30 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!search && (
        <>
          {/* BANNER CAROUSEL */}
          <div className="mx-5 mt-5">
            <div className="relative overflow-hidden rounded-2xl">
              <div className={`bg-gradient-to-r ${banners[bannerIdx].color} border border-white/5 p-5 flex items-center gap-4 min-h-[90px] transition-all duration-500`}>
                <div className="text-4xl shrink-0">{banners[bannerIdx].emoji}</div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{banners[bannerIdx].title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{banners[bannerIdx].subtitle}</p>
                </div>
                <button onClick={() => router.push("/cliente/negocios")} className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold whitespace-nowrap shrink-0 active:scale-95 transition-all hover:bg-white/20">
                  Ordenar
                </button>
              </div>
              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {banners.map((_, i) => (
                  <button key={i} onClick={() => setBannerIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === bannerIdx ? "bg-yellow-400 w-4" : "bg-white/30"}`} />
                ))}
              </div>
            </div>
          </div>

          {/* CATEGORIES GRID - 5 verticales premium */}
          <div className="mt-6 px-5">
            <h2 className="font-bold text-base text-white mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-400" /> Verticales
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {categories.map(cat => (
                <button key={cat.label} onClick={() => router.push(`/cliente/negocios?categoria=${cat.slug}`)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-95 transition-all hover:bg-white/[0.06]">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl border border-white/10`}>
                    <span>{cat.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 text-center leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TOP SEARCHED */}
          <div className="mt-6 px-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                <TrendingUp size={14} className="text-yellow-400" /> Lo más buscado
              </h2>
              <button onClick={() => router.push("/cliente/negocios")} className="text-[10px] font-bold text-yellow-400 flex items-center gap-1">
                Ver todo <ArrowRight size={10} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topBuscados.slice(0, 8).map(t => (
                <button key={t} onClick={() => router.push(`/cliente/negocios?busqueda=${t}`)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-yellow-400/30 hover:text-yellow-400 active:scale-95 transition-all">
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* RECOMMENDED STORES */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-5 mb-3">
              <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Store size={14} className="text-yellow-400" /> Tiendas recomendadas
              </h2>
              <button onClick={() => router.push("/cliente/negocios")} className="text-[10px] font-bold text-yellow-400 flex items-center gap-1">
                Ver todas <ArrowRight size={10} />
              </button>
            </div>
            {loading ? (
              <div className="h-scroll px-5">
                {[1,2,3].map(i => (
                  <div key={i} className="store-card animate-fade-up">
                    <div className="store-card-img skeleton" />
                    <div className="store-card-body">
                      <div className="skeleton h-4 w-3/4 mb-2" />
                      <div className="skeleton h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : destacados.length > 0 ? (
              <div className="h-scroll px-5">
                {destacados.map((n, i) => (
                  <button key={n.id} onClick={() => n.es_local ? null : router.push(`/cliente/negocio/${n.id}`)}
                    className={`store-card animate-fade-up ${n.es_local ? 'opacity-60' : ''}`} style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="store-card-img" style={{ background: n.logo ? `url(${n.logo}) center/cover` : (n.es_local ? "linear-gradient(135deg, #1e293b, #0f172a)" : "linear-gradient(135deg, rgba(250,204,21,0.3), rgba(250,204,21,0.05))") }}>
                      {!n.logo && <span className="text-4xl opacity-30 text-white">{n.nombre[0]}</span>}
                    </div>
                    <div className="store-card-body text-left">
                      <h4>{n.nombre}</h4>
                      <div className="meta">
                        <span className="flex items-center gap-0.5"><Star size={10} className="text-yellow-400" />{n.rating || n.calificacion || "Nuevo"}</span>
                        <span className="flex items-center gap-0.5"><Clock size={10} />{n.tiempo_estimado}</span>
                        <span className="flex items-center gap-0.5"><Bike size={10} />${n.domicilio_cost?.toLocaleString()}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5">
                <div className="glass-card p-6 text-center">
                  <Store size={32} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-slate-400 text-xs">No hay tiendas destacadas aún</p>
                </div>
              </div>
            )}
          </div>

          {/* EXPLORE ALL CTA */}
          <div className="mx-5 mt-4">
            <button onClick={() => router.push("/cliente/negocios")} className="w-full py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 hover:border-yellow-400/30 hover:text-yellow-400 active:scale-[0.98] transition-all">
              Explorar todos los negocios <ChevronRight size={14} />
            </button>
          </div>

          {/* REGISTER CTA */}
          <div className="mx-5 mt-4">
            <button onClick={() => setActiveModal("register")}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400/20 to-yellow-400/5 border border-yellow-400/20 text-yellow-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
              <User size={14} /> Crear cuenta gratis en DomiU
            </button>
          </div>

          {/* JOIN SECTION */}
          <div className="mt-8 px-5">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-white">Únete a <span className="text-yellow-400">DomiU</span></h2>
              <p className="text-xs text-slate-400 mt-1">Forma parte del ecosistema DomiU Magdalena</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { modal: "join-business" as ModalType, emoji: "🍕", title: "Registra tu negocio", desc: "Descubre los beneficios", color: "rgba(239,68,68,0.1)" },
                { modal: "join-store" as ModalType, emoji: "🛒", title: "Registra tu tienda", desc: "Accede a miles de clientes", color: "rgba(34,197,94,0.1)" },
                { modal: "join-rider" as ModalType, emoji: "🛵", title: "Únete como repartidor", desc: "Gana dinero extra", color: "rgba(250,204,21,0.1)" },
              ].map((item, i) => (
                <div key={i} className="glass-card overflow-hidden group hover:border-yellow-400/30 transition-all">
                  <div className="h-24 flex items-center justify-center text-3xl" style={{ background: item.color }}>
                    <span className="group-hover:scale-110 transition-transform">{item.emoji}</span>
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-bold text-white text-xs mb-1.5">{item.title}</h3>
                    <p className="text-[10px] text-slate-400 mb-2.5">{item.desc}</p>
                    <button onClick={() => setActiveModal(item.modal)}
                      className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700 hover:border-yellow-400/30 hover:text-yellow-400 active:scale-95 transition-all">Conocer más</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <div className="app-footer mt-10">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center font-black text-base text-slate-900">D</div>
                <div>
                  <p className="font-bold text-white text-sm">DomiU Magdalena</p>
                  <p className="text-[10px] text-slate-500">Todo lo que necesitas, en un solo lugar</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div>
                  <h4 className="font-bold text-slate-300 text-xs mb-3">Compañía</h4>
                  <div className="space-y-2">
                    {["about", "work", "repartidores", "prensa"].map(key => {
                      const labels: Record<string, string> = { about: "Sobre DomiU", work: "Trabaja con nosotros", repartidores: "Repartidores", prensa: "Prensa" };
                      return <button key={key} onClick={() => setActiveModal(key as ModalType)} className="block text-[11px] text-slate-500 hover:text-yellow-400 transition-colors w-full text-left">{labels[key]}</button>;
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-300 text-xs mb-3">Ayuda</h4>
                  <div className="space-y-2">
                    {["help", "terms", "privacy", "data"].map(key => {
                      const labels: Record<string, string> = { help: "Centro de ayuda", terms: "Términos y condiciones", privacy: "Política de privacidad", data: "Tratamiento de datos" };
                      return <button key={key} onClick={() => setActiveModal(key as ModalType)} className="block text-[11px] text-slate-500 hover:text-yellow-400 transition-colors w-full text-left">{labels[key]}</button>;
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-300 text-xs mb-3">Descarga la app</h4>
                  <div className="space-y-2">
                    <button onClick={() => setActiveModal("help")} className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700 hover:border-yellow-400/30 hover:text-yellow-400 active:scale-95 transition-all flex items-center justify-center gap-2">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                      App Store
                    </button>
                    <button onClick={() => setActiveModal("help")} className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700 hover:border-yellow-400/30 hover:text-yellow-400 active:scale-95 transition-all flex items-center justify-center gap-2">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                      Google Play
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-600">© 2026 DomiU Magdalena. Hecho en Colombia.</p>
            </div>
          </div>
        </>
      )}

      {/* Cookie bar */}
      {!cookieOk && (
        <div className="cookie-bar">
          <p>Usamos cookies para asegurarnos que tengas la mejor experiencia. <button onClick={() => setActiveModal("privacy")} className="text-yellow-400 underline bg-transparent border-none cursor-pointer font-inherit text-inherit p-0">Más información</button></p>
          <button onClick={() => { setCookieOk(true); localStorage.setItem("cookie_ok", "true"); }}>Ok, entendido</button>
        </div>
      )}

      {/* INFO / LEGAL MODALS */}
      {activeModal && activeModal !== "register" && activeModal !== "notifications" && modalContent[activeModal] && (
        <Modal>
          <div className="space-y-4">
            {modalContent[activeModal].body.map((p, i) => (
              <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
            ))}
            <button onClick={() => setActiveModal(null)} className="btn-primary w-full text-sm mt-4">Entendido</button>
          </div>
        </Modal>
      )}

      {/* REGISTER MODAL */}
      {activeModal === "register" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => { if (!regLoading) setActiveModal(null); }}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
              <h2 className="font-black text-lg text-white">Crear cuenta en DomiU</h2>
              <button onClick={() => { if (!regLoading) setActiveModal(null); }} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center active:scale-90 transition-all border border-slate-700">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5">
              {regSuccess ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={40} className="text-green-400" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">¡Registro exitoso!</h3>
                  <p className="text-sm text-slate-400 mb-6">Tu cuenta ha sido creada. Ya puedes hacer pedidos con tu número de teléfono.</p>
                  <button onClick={() => { setActiveModal(null); setRegSuccess(false); }} className="btn-primary w-full text-sm">Empezar a pedir</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">Crea tu cuenta para tener un historial de pedidos, gestión de direcciones y más.</p>
                  {regError && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"><p className="text-sm font-medium text-red-400">{regError}</p></div>}
                  <div className="relative"><User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="Nombre completo *" value={regNombre} onChange={e => setRegNombre(e.target.value)} className="input-field" /></div>
                  <div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="email" placeholder="Correo electrónico *" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="input-field" /></div>
                  <div className="relative"><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="tel" placeholder="Teléfono *" value={regTelefono} onChange={e => setRegTelefono(e.target.value)} className="input-field" /></div>
                  <div className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="password" placeholder="Contraseña (mín. 6 caracteres) *" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="input-field" /></div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={regAceptaTerminos} onChange={e => setRegAceptaTerminos(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 accent-yellow-400" />
                    <span className="text-xs text-slate-400">
                      Acepto los <button type="button" onClick={() => setActiveModal("terms")} className="text-yellow-400 underline bg-transparent border-none p-0 cursor-pointer font-inherit text-xs">términos</button> y la <button type="button" onClick={() => setActiveModal("privacy")} className="text-yellow-400 underline bg-transparent border-none p-0 cursor-pointer font-inherit text-xs">privacidad</button>
                    </span>
                  </label>
                  <button onClick={handleRegister} disabled={regLoading} className="btn-primary w-full text-sm disabled:opacity-40 active:scale-[0.98] transition-all">
                    {regLoading ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> Creando cuenta...</span> : "Crear cuenta"}
                  </button>
                  <p className="text-xs text-slate-500 text-center">¿Ya tienes cuenta? <button onClick={() => { setActiveModal(null); }} className="text-yellow-400 font-semibold bg-transparent border-none p-0 cursor-pointer font-inherit text-xs">Inicia sesión</button></p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL */}
      {activeModal === "notifications" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
              <h2 className="font-black text-lg text-white">Notificaciones</h2>
              <div className="flex items-center gap-2">
                {noLeidas > 0 && <button onClick={marcarTodasLeidas} className="text-xs font-semibold text-yellow-400 bg-transparent border border-yellow-400/30 rounded-lg px-3 py-1.5 active:scale-95 transition-all">Leer todas</button>}
                <button onClick={() => setActiveModal(null)} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center active:scale-90 transition-all border border-slate-700"><X size={16} className="text-slate-400" /></button>
              </div>
            </div>
            <div className="p-5">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 mb-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-semibold text-white">Notificaciones push</p><p className="text-xs text-slate-400 mt-0.5">{permiso === "granted" ? "✓ Activadas" : permiso === "denied" ? "✗ Bloqueadas" : "No activadas"}</p></div>
                  {permiso !== "granted" && <button onClick={solicitarPermiso} className="px-4 py-2 rounded-xl bg-yellow-400 text-slate-900 text-xs font-bold active:scale-95 transition-all">{permiso === "denied" ? "Configurar" : "Activar"}</button>}
                </div>
              </div>
              {notificaciones.length === 0 ? (
                <div className="text-center py-12"><Bell size={36} className="mx-auto text-slate-600 mb-3" /><p className="text-slate-400 text-sm font-medium">Sin notificaciones</p><p className="text-xs text-slate-500 mt-1">Aquí aparecerán las actualizaciones de tus pedidos</p></div>
              ) : (
                <div className="space-y-2">
                  {notificaciones.map(n => (
                    <div key={n.id} className={`p-4 rounded-2xl border ${n.leida ? "bg-slate-800/30 border-slate-700/50" : "bg-yellow-400/5 border-yellow-400/20"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div><p className={`text-sm font-semibold ${n.leida ? "text-slate-300" : "text-white"}`}>{n.titulo}</p><p className="text-xs text-slate-400 mt-0.5">{n.cuerpo}</p><p className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString("es-CO")}</p></div>
                        {!n.leida && <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 mt-1.5" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
