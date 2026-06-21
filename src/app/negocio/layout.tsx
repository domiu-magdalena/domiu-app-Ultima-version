"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Store, ClipboardList, Package, Settings, LogOut, Bell, Menu, X, LayoutDashboard, XCircle, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NegocioProvider, useNegocio } from "@/context/negocio/NegocioContext";
import { getSupabaseClient } from "@/lib/supabase";

function NewOrderNotification() {
  const { negocio } = useNegocio();
  const [notificacion, setNotificacion] = useState<{ codigo: string; cliente: string } | null>(null);

  useEffect(() => {
    if (!negocio?.id) return;
    const sub = getSupabaseClient()
      .channel("negocio-notificaciones")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos_cliente", filter: `negocio_id=eq.${negocio.id}` }, (payload: any) => {
        const nuevo = payload.new;
        setNotificacion({ codigo: nuevo.codigo, cliente: nuevo.cliente_nombre });
        setTimeout(() => setNotificacion(null), 6000);
      })
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [negocio?.id]);

  if (!notificacion) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-32px)] max-w-md animate-slide-down">
      <div className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-2xl p-4 shadow-2xl shadow-[#10B981]/20 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Bell size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Nuevo pedido recibido</p>
          <p className="text-xs text-white/70 truncate">#{notificacion.codigo} - {notificacion.cliente}</p>
        </div>
        <button onClick={() => setNotificacion(null)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 hover:bg-white/30 transition-all">
          <XCircle size={16} />
        </button>
      </div>
    </div>
  );
}

const tabs = [
  { href: "/negocio", label: "Inicio", icon: LayoutDashboard },
  { href: "/negocio/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/negocio/productos", label: "Productos", icon: Package },
  { href: "/negocio/chat", label: "Chat", icon: MessageCircle },
  { href: "/negocio/perfil", label: "Perfil", icon: Settings },
];

function NegocioNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { negocio } = useNegocio();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => href === "/negocio" ? pathname === "/negocio" : pathname.startsWith(href);
  const hideNav = pathname.includes("/pedido/");

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 bg-[#1E293B]/50 backdrop-blur-xl border-r border-white/[0.06] min-h-screen fixed left-0 top-0 z-50 p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[#10B981]/20">D</div>
          <div>
            <p className="font-bold text-sm text-white">Domi<span className="text-[#10B981]">U</span></p>
            <p className="text-[10px] text-[#64748B]">Panel del negocio</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <button key={tab.href} onClick={() => router.push(tab.href)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#10B981]/10 text-[#10B981] font-semibold" : "text-[#64748B] hover:bg-white/[0.04] hover:text-white"}`}>
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] pt-4 mt-4">
          <div className="px-2 mb-3">
            <p className="text-sm font-semibold text-white truncate">{negocio?.nombre || "Cargando..."}</p>
            <p className="text-[10px] text-[#64748B]">{negocio?.categoria}</p>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-all">
            <LogOut size={20} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0F172A]/95 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-40">
        <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center text-white">
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">Domi<span className="text-[#10B981]">U</span></span>
          <span className="text-[10px] text-[#64748B]">| {negocio?.nombre || "Negocio"}</span>
        </div>
        <div className="w-9 h-9" />
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div className="bg-[#1E293B] w-72 h-full p-4 pt-16 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.href} onClick={() => { router.push(tab.href); setMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive(tab.href) ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#64748B] hover:bg-white/[0.04]"}`}>
                    <Icon size={20} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-white/[0.06] pt-4 mt-4">
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/10">
                <LogOut size={20} />
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}

      {!hideNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <div className="flex items-center justify-around h-[64px] mx-4 mb-4 bg-[#0F172A]/92 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.href);
              return (
                <button key={tab.href} onClick={() => router.push(tab.href)} className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-0">
                  <Icon size={20} className={active ? "text-[#10B981]" : "text-[#64748B]"} />
                  <span className={`text-[10px] font-semibold ${active ? "text-[#10B981]" : "text-[#64748B]"}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

export default function NegocioLayout({ children }: { children: React.ReactNode }) {
  const { profile, initialized, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!initialized) {
    return <div className="flex items-center justify-center h-screen bg-[#0F172A]"><div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!profile || profile.rol !== "negocio") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F172A] text-white px-6">
        <div className="text-center max-w-sm animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto mb-4">
            <Store size={32} className="text-[#10B981]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Acceso restringido</h2>
          <p className="text-[#64748B] text-sm mb-6">Debes iniciar sesion como negocio para acceder.</p>
          <button onClick={() => router.push("/login")} className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm shadow-lg shadow-[#10B981]/20">Ir a login</button>
        </div>
      </div>
    );
  }

  return (
    <NegocioProvider userId={user?.id || ""}>
      <div className="min-h-screen bg-[#0F172A] text-white">
        <NewOrderNotification />
        <NegocioNav />
        <main className="md:ml-64 pb-20 md:pb-8">
          <div className="max-w-6xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </NegocioProvider>
  );
}
