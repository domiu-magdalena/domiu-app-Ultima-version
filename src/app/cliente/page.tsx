"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ChevronRight, Star, Clock, Bike, Bell, Store, Smartphone, Globe, MessageCircle, AtSign, ExternalLink } from "lucide-react";
import { fetchData } from "@/lib/client-data";
import { useNotificaciones } from "@/context/NotificationContext";

type Negocio = {
  id: string; nombre: string; categoria: string; descripcion: string;
  logo: string; rating: number; tiempo_estimado: string; domicilio_cost: number;
  abierto: boolean; destacado: boolean; calificacion: number;
};

const categories = [
  { label: "Restaurantes", icon: "🍔", bg: "#ff441f", slug: "Restaurantes" },
  { label: "Mercado", icon: "🛒", bg: "#29d884", slug: "Mercado" },
  { label: "Farmacia", icon: "💊", bg: "#007aff", slug: "Droguerias" },
  { label: "Bebidas", icon: "🥤", bg: "#9b59b6", slug: "Bebidas" },
  { label: "Mascotas", icon: "🐾", bg: "#e67e22", slug: "Mascotas" },
  { label: "Licores", icon: "🍷", bg: "#2c3e50", slug: "Licoreras" },
  { label: "RappiFácil", icon: "⚡", bg: "#1abc9c", slug: "RappiFacil" },
  { label: "Envíos", icon: "📦", bg: "#e91e63", slug: "Envios" },
];

const topBuscados = ["Pizza", "Hamburguesa", "Pollo", "Sushi", "Mexicana", "Postres", "Café", "Helado"];

export default function ClienteHome() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [cookieOk, setCookieOk] = useState(false);
  const { noLeidas } = useNotificaciones();

  useEffect(() => {
    fetchData("negocios", {
      filters: [{ method: "eq", column: "activo", value: true }],
      order: [{ column: "destacado", ascending: false }],
    }).then((data: any) => {
      if (data) setNegocios(data);
      setLoading(false);
    }).catch(() => setLoading(false));
    if (typeof window !== "undefined") {
      setCookieOk(localStorage.getItem("cookie_ok") === "true");
    }
  }, []);

  const aceptarCookies = () => {
    setCookieOk(true);
    localStorage.setItem("cookie_ok", "true");
  };

  const destacados = negocios.filter((n) => n.destacado);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Hero */}
      <div className="hero-section">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg">D</div>
          <div className="flex-1">
            <h2>Si tienes <span>DomiU,</span></h2>
            <h2 className="font-bold">tienes Todo.</h2>
          </div>
          <button className="relative w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <Bell size={20} className="text-white" />
            {noLeidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-white text-[var(--primary)] text-[9px] font-bold flex items-center justify-center shadow-lg">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>
        </div>

        <div className="location-input bg-white/15 border border-white/20 mb-4">
          <MapPin size={18} />
          <span>Santa Marta, Magdalena</span>
          <ChevronRight size={16} />
        </div>

        <div className="hero-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar negocios, productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <div className="mt-4 animate-fade-up">
            <p className="text-sm text-white/70 mb-2">Resultados para &quot;{search}&quot;</p>
            {negocios.filter(n => n.nombre.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <div className="bg-white/10 rounded-xl p-6 text-center">
                <Search size={32} className="mx-auto text-white/30 mb-2" />
                <p className="text-white/60 text-sm">No encontramos resultados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {negocios.filter(n => n.nombre.toLowerCase().includes(search.toLowerCase())).map(n => (
                  <button key={n.id} onClick={() => router.push(`/cliente/negocio/${n.id}`)}
                    className="w-full bg-white/10 rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all text-left">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">{n.nombre[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{n.nombre}</p>
                      <p className="text-xs text-white/60">{n.categoria} · 🕐 {n.tiempo_estimado}</p>
                    </div>
                    <ChevronRight size={16} className="text-white/40" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!search && (
        <>
          {/* Category Circles (Rappi exact style) */}
          <div className="h-scroll px-5 mt-5" style={{ paddingTop: "24px" }}>
            {categories.map(cat => (
              <button key={cat.label} onClick={() => router.push(`/cliente/negocios?categoria=${cat.slug}`)}
                className="flex flex-col items-center gap-2 min-w-[75px]">
                <div className="cat-circle" style={{ background: cat.bg + "15" }}>
                  <span className="text-2xl">{cat.icon}</span>
                </div>
                <span className="text-[11px] font-bold text-center leading-tight" style={{ color: "var(--text-primary)" }}>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Promo Banner */}
          <div className="promo-banner mt-6">
            <div className="promo-banner-icon" style={{ background: "#fff5e5" }}>🎉</div>
            <div className="flex-1">
              <p className="font-bold text-sm">¡Bienvenido!</p>
              <p className="text-xs text-[var(--text-secondary)]">Usa <strong style={{ color: "var(--primary)" }}>BIENVENIDO10</strong> y obtén 10% OFF</p>
            </div>
            <button onClick={() => router.push("/cliente/negocios")} className="btn-primary text-xs px-4 py-2 whitespace-nowrap">Ordenar</button>
          </div>

          {/* Top searched */}
          <div className="mt-6 px-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-lg">Lo más buscado</p>
              <button onClick={() => router.push("/cliente/negocios")} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Ver todo</button>
            </div>
            <div className="h-scroll">
              {topBuscados.map(t => (
                <button key={t} onClick={() => router.push(`/cliente/negocios?busqueda=${t}`)} className="chip chip-inactive shrink-0">{t}</button>
              ))}
            </div>
          </div>

          {/* Featured stores */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-5 mb-3">
              <p className="font-bold text-lg">Negocios destacados</p>
              <button onClick={() => router.push("/cliente/negocios")} className="text-sm font-semibold flex items-center gap-1" style={{ color: "var(--primary)" }}>
                Ver todos <ChevronRight size={14} />
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
                  <button key={n.id} onClick={() => router.push(`/cliente/negocio/${n.id}`)}
                    className="store-card animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="store-card-img" style={{ background: "linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)" }}>
                      <span className="text-5xl opacity-30">{n.nombre[0]}</span>
                      <div className="store-card-logo">{n.nombre[0]}</div>
                    </div>
                    <div className="store-card-body text-left">
                      <h4>{n.nombre}</h4>
                      <div className="meta">
                        <span className="flex items-center gap-0.5"><Star size={11} style={{ color: "var(--primary)" }} />{n.rating || n.calificacion || "—"}</span>
                        <span className="flex items-center gap-0.5"><Clock size={11} />{n.tiempo_estimado}</span>
                        <span className="flex items-center gap-0.5"><Bike size={11} />${n.domicilio_cost?.toLocaleString()}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5">
                <div className="glass-card p-6 text-center">
                  <Store size={36} className="mx-auto text-[var(--text-muted)]/40 mb-2" />
                  <p className="text-[var(--text-secondary)] text-sm">No hay negocios destacados</p>
                </div>
              </div>
            )}
          </div>

          {/* More stores CTA */}
          <div className="mx-5 mt-4">
            <button onClick={() => router.push("/cliente/negocios")} className="btn-tertiary w-full flex items-center justify-center gap-2 text-sm py-3">
              Explorar todos los negocios <ChevronRight size={16} />
            </button>
          </div>

          {/* CTA Join section */}
          <div className="mt-8 px-5">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold">Únete a <span style={{ color: "var(--primary)" }}>DomiU</span></h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card overflow-hidden">
                <div className="h-32 flex items-center justify-center text-4xl" style={{ background: "linear-gradient(135deg, #ff441f15, #ff441f08)" }}>🍕</div>
                <div className="p-5 text-center">
                  <h4 className="font-bold text-sm mb-2">Registra tu negocio</h4>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Descubre los beneficios de trabajar con DomiU</p>
                  <button className="btn-secondary text-xs w-full py-2">Conocer más</button>
                </div>
              </div>
              <div className="glass-card overflow-hidden">
                <div className="h-32 flex items-center justify-center text-4xl" style={{ background: "linear-gradient(135deg, #29d88415, #29d88408)" }}>🛒</div>
                <div className="p-5 text-center">
                  <h4 className="font-bold text-sm mb-2">Registra tu tienda</h4>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Accede a miles de clientes en Magdalena</p>
                  <button className="btn-secondary text-xs w-full py-2">Conocer más</button>
                </div>
              </div>
              <div className="glass-card overflow-hidden">
                <div className="h-32 flex items-center justify-center text-4xl" style={{ background: "linear-gradient(135deg, #9b59b615, #9b59b608)" }}>🛵</div>
                <div className="p-5 text-center">
                  <h4 className="font-bold text-sm mb-2">Únete como repartidor</h4>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Gana dinero extra entregando domicilios</p>
                  <button className="btn-secondary text-xs w-full py-2">Más info</button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer (Rappi style) */}
          <div className="app-footer mt-10">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white" style={{ background: "var(--primary)" }}>D</div>
                <div>
                  <p className="font-bold text-base">DomiU Magdalena</p>
                  <p className="text-xs text-[var(--text-secondary)]">Tu domicilio, más rápido que Rappi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div>
                  <h4 className="font-bold text-sm mb-4">Compañía</h4>
                  <div className="space-y-2.5">
                    <a href="#" className="block text-sm">Sobre DomiU</a>
                    <a href="#" className="block text-sm">Trabaja con nosotros</a>
                    <a href="#" className="block text-sm">Repartidores</a>
                    <a href="#" className="block text-sm">Prensa</a>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-4">Ayuda</h4>
                  <div className="space-y-2.5">
                    <a href="#" className="block text-sm">Centro de ayuda</a>
                    <a href="#" className="block text-sm">Términos y condiciones</a>
                    <a href="#" className="block text-sm">Política de privacidad</a>
                    <a href="#" className="block text-sm">Tratamiento de datos</a>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-4">Descarga la app</h4>
                  <div className="space-y-3">
                    <button className="btn-tertiary w-full text-xs py-3 flex items-center justify-center gap-2">
                      <Smartphone size={16} /> App Store
                    </button>
                    <button className="btn-tertiary w-full text-xs py-3 flex items-center justify-center gap-2">
                      <Smartphone size={16} /> Google Play
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mb-6" style={{ color: "var(--text-muted)" }}>
                <a href="#" className="hover:opacity-80 transition-opacity"><MessageCircle size={20} /></a>
                <a href="#" className="hover:opacity-80 transition-opacity"><AtSign size={20} /></a>
                <a href="#" className="hover:opacity-80 transition-opacity"><Globe size={20} /></a>
                <a href="#" className="hover:opacity-80 transition-opacity"><ExternalLink size={20} /></a>
              </div>

              <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>Paga con:</span>
                <span className="text-base">💳</span>
                <span className="text-base">📱</span>
                <span className="text-base">💵</span>
              </div>

              <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                © 2026 DomiU Magdalena. Hecho en Colombia 🇨🇴 con amor.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Cookie bar */}
      {!cookieOk && (
        <div className="cookie-bar">
          <p>Usamos cookies para asegurarnos que tengas la mejor experiencia. <a href="#">Más información</a></p>
          <button onClick={aceptarCookies}>Ok, entendido</button>
        </div>
      )}
    </div>
  );
}
