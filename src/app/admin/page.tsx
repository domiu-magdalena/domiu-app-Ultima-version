"use client";

import { useAuth } from "@/hooks/useAuth";
import AdminApp from "@/components/AdminApp";
import { Loader2, Shield } from "lucide-react";

export default function AdminPage() {
  const { profile, initialized, logout } = useAuth();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#10B981]/20">D</div>
          <Loader2 className="animate-spin text-[#10B981]" size={24} />
        </div>
      </div>
    );
  }

  if (!profile || (profile.rol !== "admin" && profile.rol !== "financiero") || (profile.rol === "admin" && profile.email !== "leivakevin620@gmail.com")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] gap-4 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center">
          <Shield size={32} className="text-[#EF4444]" />
        </div>
        <p className="text-[#EF4444] text-sm font-semibold">Acceso no autorizado</p>
        <p className="text-[#64748B] text-xs">Solo el administrador o el financiero pueden acceder.</p>
        <p className="text-[#64748B] text-[10px]">{profile?.email}</p>
        <a href="/login" className="text-[#10B981] text-sm font-semibold hover:text-[#34d399] transition-colors">Volver al login</a>
      </div>
    );
  }

  return <AdminApp role={profile.rol} />;
}
