"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, ClipboardList, ShoppingCart, User, Bell } from "lucide-react";
import { CartProvider, useCart } from "@/context/CartContext";
import { NotificationProvider, useNotificaciones } from "@/context/NotificationContext";

function NavBoton({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = href === "/cliente" ? pathname === "/cliente" : pathname.startsWith(href);

  return (
    <button onClick={() => router.push(href)} className="relative flex flex-col items-center gap-0.5 py-1 px-4 min-w-0 transition-all duration-200">
      <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-[var(--rappi-yellow)]/10" : ""}`}>
        <Icon size={22} className={`transition-colors duration-200 ${isActive ? "text-[var(--rappi-yellow)]" : "text-[var(--rappi-text-muted)]"}`} />
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1 bg-[var(--rappi-red)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bounce-in">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
      <span className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${isActive ? "text-[var(--rappi-yellow)]" : "text-[var(--rappi-text-muted)]"}`}>{label}</span>
    </button>
  );
}

function NavContent() {
  const { totalItems } = useCart();
  const { noLeidas } = useNotificaciones();

  return (
    <nav className="rappi-bottom-nav fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        <NavBoton href="/cliente" icon={Home} label="Inicio" />
        <NavBoton href="/cliente/negocios" icon={ShoppingCart} label="Explorar" />
        <NavBoton href="/cliente/pedidos" icon={ClipboardList} label="Pedidos" />
        <NavBoton href="/cliente/perfil" icon={User} label="Perfil" badge={noLeidas} />
      </div>
    </nav>
  );
}

function ClienteContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname.includes("/checkout") || pathname.includes("/confirmacion") || pathname.includes("/seguimiento") || pathname.includes("/chat");

  return (
    <div className="min-h-screen bg-[var(--rappi-dark)] text-[var(--rappi-text)] flex flex-col">
      <main className={`flex-1 overflow-y-auto ${hideNav ? "" : "pb-20"}`}>{children}</main>
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
