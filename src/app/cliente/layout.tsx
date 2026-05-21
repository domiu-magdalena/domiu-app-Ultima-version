"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, ShoppingBag, ClipboardList, User, MapPin, Search, ShoppingCart, Bell, ChevronDown } from "lucide-react";
import { CartProvider, useCart } from "@/context/CartContext";
import { NotificationProvider, useNotificaciones } from "@/context/NotificationContext";

function NavBoton({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = href === "/cliente" ? pathname === "/cliente" : pathname.startsWith(href);

  return (
    <button onClick={() => router.push(href)} className="relative flex flex-col items-center gap-0.5 py-1 px-4 min-w-0 transition-all active:scale-90">
      <div className="relative p-1.5 rounded-xl transition-all">
        <Icon size={22} className={`transition-colors ${isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`} />
        {badge && badge > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-[var(--primary)] text-white text-[9px] font-bold flex items-center justify-center shadow-lg animate-scale-in">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
      <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}>{label}</span>
    </button>
  );
}

function TopHeader() {
  const router = useRouter();
  const { totalItems } = useCart();
  const { noLeidas } = useNotificaciones();
  const pathname = usePathname();
  const hideHeader = pathname.includes("/checkout") || pathname.includes("/confirmacion") || pathname.includes("/chat");

  if (hideHeader) return null;

  return (
    <div className="app-header" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gridTemplateRows: "56px", gap: "8px", padding: "0 16px" }}>
      <div className="flex items-center gap-1 cursor-pointer" onClick={() => router.push("/cliente")}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-base" style={{ background: "var(--primary)", color: "white" }}>D</div>
      </div>
      <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/cliente")}>
        <div className="flex items-center gap-1.5">
          <MapPin size={14} style={{ color: "var(--primary)" }} />
          <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[200px]" style={{ color: "var(--primary)" }}>Santa Marta, Magdalena</span>
          <ChevronDown size={12} style={{ color: "var(--primary)" }} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/cliente/negocios")} className="relative w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
          <Search size={16} style={{ color: "var(--text-secondary)" }} />
        </button>
        <button className="relative w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
          <Bell size={16} style={{ color: "var(--text-secondary)" }} />
          {noLeidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-[17px] h-[17px] rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: "var(--primary)" }}>
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
        <button onClick={() => router.push("/cliente/carrito")} className="relative w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
          <ShoppingCart size={16} style={{ color: "var(--text-secondary)" }} />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-[17px] h-[17px] rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: "var(--primary)" }}>
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function NavContent() {
  const { totalItems } = useCart();
  const { noLeidas } = useNotificaciones();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav">
      <div className="flex items-center justify-around h-[64px] max-w-lg mx-auto">
        <NavBoton href="/cliente" icon={Home} label="Inicio" />
        <NavBoton href="/cliente/negocios" icon={ShoppingBag} label="Explorar" />
        <NavBoton href="/cliente/pedidos" icon={ClipboardList} label="Pedidos" />
        <NavBoton href="/cliente/perfil" icon={User} label="Perfil" badge={noLeidas} />
      </div>
    </nav>
  );
}

function ClienteContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname.includes("/checkout") || pathname.includes("/confirmacion") || pathname.includes("/seguimiento") || pathname.includes("/chat");
  const hideHeader = hideNav;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <TopHeader />
      <main className={`flex-1 overflow-y-auto ${hideHeader ? "" : "pt-[56px]"} ${hideNav ? "" : "pb-[68px]"}`}>{children}</main>
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
