"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Store, ClipboardList, User, ShoppingCart, Bell, MapPin } from "lucide-react";
import { CartProvider, useCart } from "@/context/CartContext";
import { NotificationProvider, useNotificaciones } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";

function NavBoton({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = href === "/cliente" ? pathname === "/cliente" : pathname.startsWith(href);

  return (
    <button onClick={() => router.push(href)} className="relative flex flex-col items-center gap-0.5 py-1 px-4 min-w-0 transition-all active:scale-90">
      <div className="relative p-1.5 rounded-xl transition-all">
        <Icon size={22} className={`transition-colors ${isActive ? "text-yellow-400" : "text-slate-500"}`} />
        {badge && badge > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-yellow-400 text-slate-900 text-[9px] font-bold flex items-center justify-center shadow-lg animate-scale-in">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
      <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? "text-yellow-400" : "text-slate-500"}`}>{label}</span>
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
    <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-[#0F172A]/90 backdrop-blur-xl border-b border-white/5">
      <button onClick={() => router.push("/cliente")} className="flex items-center gap-2 active:scale-95 transition-all">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center font-black text-base text-slate-900 shadow-lg shadow-yellow-400/20">D</div>
        <span className="text-sm font-black text-white">Domi<span className="text-yellow-400">U</span></span>
      </button>
      <button onClick={() => router.push("/cliente")} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 active:scale-95 transition-all">
        <MapPin size={12} className="text-yellow-400" />
        <span className="text-xs font-semibold text-slate-300 truncate max-w-[140px]">Santa Marta, Magdalena</span>
      </button>
      <div className="flex items-center gap-1.5">
        <button onClick={() => router.push("/cliente/negocios")} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all">
          <Store size={16} className="text-slate-400" />
        </button>
        <button className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all">
          <Bell size={16} className="text-slate-400" />
          {noLeidas > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-yellow-400 text-slate-900 text-[8px] font-bold flex items-center justify-center px-1 shadow-lg">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
        <button onClick={() => router.push("/cliente/carrito")} className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all">
          <ShoppingCart size={16} className="text-slate-400" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-yellow-400 text-slate-900 text-[8px] font-bold flex items-center justify-center px-1 shadow-lg">
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
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bottom-nav flex items-center justify-around h-[64px] max-w-lg mx-auto">
        <NavBoton href="/cliente" icon={Home} label="Inicio" />
        <NavBoton href="/cliente/negocios" icon={Store} label="Explorar" />
        <NavBoton href="/cliente/carrito" icon={ShoppingCart} label="Carrito" badge={totalItems} />
        <NavBoton href="/cliente/pedidos" icon={ClipboardList} label="Pedidos" />
        <NavBoton href="/cliente/perfil" icon={User} label="Perfil" badge={noLeidas} />
      </div>
    </nav>
  );
}

function ClienteContent({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname.startsWith("/cliente/auth");

  useEffect(() => {
    if (!initialized) return;
    if (!user && !isAuthPage) {
      router.replace("/cliente/auth");
    }
    if (user && isAuthPage) {
      router.replace("/cliente");
    }
  }, [initialized, user, isAuthPage, router]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-slate-900 font-black text-xl shadow-lg shadow-yellow-400/20">D</div>
          <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
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
