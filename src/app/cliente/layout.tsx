"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Store, ClipboardList, User, ShoppingCart, Bell, MapPin, Headphones } from "lucide-react";
import { CartProvider, useCart } from "@/context/CartContext";
import { NotificationProvider, useNotificaciones } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";

function NavBoton({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = href === "/cliente" ? pathname === "/cliente" : pathname.startsWith(href);

  return (
    <button onClick={() => router.push(href)} className="relative flex flex-col items-center gap-0.5 py-1.5 px-4 min-w-0 transition-colors active:scale-90">
      <div className={`relative p-1.5 rounded-xl transition-colors ${isActive ? "bg-[#10B981]/10" : ""}`}>
        <Icon size={22} className={`transition-colors ${isActive ? "text-[#10B981]" : "text-slate-500"}`} />
        {badge && badge > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-[#10B981] text-white text-[8px] font-bold flex items-center justify-center px-1">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
      <span className={`text-[10px] font-semibold transition-colors ${isActive ? "text-[#10B981]" : "text-slate-500"}`}>{label}</span>
    </button>
  );
}

function TopHeader() {
  const router = useRouter();
  const { totalItems } = useCart();
  const { noLeidas } = useNotificaciones();
  const pathname = usePathname();
  const hideHeader = pathname.includes("/checkout") || pathname.includes("/confirmacion") || pathname.includes("/chat") || pathname.includes("/seguimiento") || pathname.includes("/auth");

  if (hideHeader) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-[#0F172A]/95 border-b border-white/[0.06]">
      <button onClick={() => router.push("/cliente")} className="flex items-center gap-2 active:scale-95 transition-transform">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center font-black text-base text-white">D</div>
        <span className="text-sm font-black text-white">Domi<span className="text-[#10B981]">U</span></span>
      </button>
      <button onClick={() => router.push("/cliente")} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 active:scale-95 transition-transform">
        <MapPin size={12} className="text-[#10B981]" />
        <span className="text-xs font-semibold text-slate-300 truncate max-w-[140px]">Santa Marta, Magdalena</span>
      </button>
      <div className="flex items-center gap-1.5">
        <button onClick={() => router.push("/cliente/negocios")} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Store size={16} className="text-slate-400" />
        </button>
        <button className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Bell size={16} className="text-slate-400" />
          {noLeidas > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[#10B981] text-white text-[8px] font-bold flex items-center justify-center px-1">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
        <button onClick={() => router.push("/cliente/carrito")} className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <ShoppingCart size={16} className="text-slate-400" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[#10B981] text-white text-[8px] font-bold flex items-center justify-center px-1">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

function NavContent() {
  const { totalItems } = useCart();
  const { noLeidas } = useNotificaciones();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50">
      <div className="flex items-center justify-around h-[64px] bg-[#0F172A]/95 border border-white/10 rounded-2xl max-w-lg mx-auto">
        <NavBoton href="/cliente" icon={Home} label="Inicio" />
        <NavBoton href="/cliente/pedidos" icon={ClipboardList} label="Pedidos" />
        <NavBoton href="/cliente/soporte" icon={Headphones} label="Soporte" />
        <NavBoton href="/cliente/perfil" icon={User} label="Perfil" badge={noLeidas} />
      </div>
    </nav>
  );
}

function ClienteContent({ children }: { children: React.ReactNode }) {
  const { user, profile, initialized } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname.startsWith("/cliente/auth");

  useEffect(() => {
    if (!initialized) return;
    
    // Bloquear acceso a repartidores, negocios, admin y financiero
    if (user && profile && (profile.rol === "repartidor" || profile.rol === "negocio" || profile.rol === "admin" || profile.rol === "financiero")) {
      if (profile.rol === "repartidor") {
        router.replace("/repartidor");
      } else if (profile.rol === "negocio") {
        router.replace("/negocio");
      } else {
        router.replace("/admin");
      }
      return;
    }
    
    if (!user && !isAuthPage) {
      router.replace("/cliente/auth");
    }
    if (user && isAuthPage) {
      router.replace("/cliente");
    }
  }, [initialized, user, profile, isAuthPage, router]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black text-xl">D</div>
          <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const hideNav = pathname.includes("/checkout") || pathname.includes("/confirmacion") || pathname.includes("/seguimiento") || pathname.includes("/chat") || pathname.includes("/auth");
  const hideHeader = hideNav || pathname.includes("/negocio/");

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col">
      <TopHeader />
      <main className={`flex-1 overflow-y-auto ${hideHeader ? "" : "pt-14"} ${hideNav ? "" : "pb-[68px]"}`}>{children}</main>
      {!hideNav && <NavContent />}
    </div>
  );
}

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <NotificationProvider>
        <ClienteContent>{children}</ClienteContent>
      </NotificationProvider>
    </CartProvider>
  );
}
