"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Package, Clock, MapPin, Bike, CreditCard, Banknote, Smartphone, ArrowRight, Sparkles, MessageCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

const metodosLabels: Record<string, { label: string; icon: any }> = {
  efectivo: { label: "Efectivo", icon: Banknote },
  transferencia: { label: "Transferencia", icon: CreditCard },
  nequi: { label: "Nequi", icon: Smartphone },
  daviplata: { label: "DaviPlata", icon: Smartphone },
};

type Pedido = {
  id: string; codigo: string; cliente_nombre: string; cliente_direccion: string;
  subtotal: number; domicilio: number; total: number; estado: string;
  metodo_pago: string; created_at: string;
  negocios: { nombre: string } | null;
};

function ConfirmacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codigo = searchParams.get("codigo") || "";
  const [pedido, setPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    if (!codigo) return;
    getSupabaseClient()
      .from("pedidos_cliente")
      .select("*, negocios(nombre)")
      .eq("codigo", codigo)
      .single()
      .then(({ data }) => { if (data) setPedido(data); });
  }, [codigo]);

  if (!codigo) { router.replace("/cliente"); return null; }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto w-full">
        <div className="relative mb-8">
          <div className="absolute inset-0 w-32 h-32 rounded-[2rem] bg-[#10B981]/20 blur-2xl animate-pulse mx-auto" />
          <div className="relative w-32 h-32 rounded-[2rem] bg-gradient-to-br from-[#10B981]/30 to-[#10B981]/5 flex items-center justify-center shadow-2xl shadow-[#10B981]/20 border border-[#10B981]/25 backdrop-blur-xl animate-scale-in">
            <CheckCircle size={60} className="text-[#10B981] drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
          </div>
        </div>

        <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-[#10B981] via-emerald-300 to-[#10B981] bg-clip-text text-transparent">¡Pedido confirmado!</h1>
        <p className="text-[#64748B] text-sm mb-8">Tu pedido ha sido recibido y pronto será preparado.</p>

        <div className="w-full mb-6 animate-fade-up rounded-3xl bg-[#1E293B]/70 border border-white/[0.06] backdrop-blur-xl p-7 shadow-2xl shadow-black/20">
          <p className="text-[10px] text-[#64748B] uppercase tracking-[3px] font-semibold mb-3">Código de pedido</p>
          <p className="text-4xl font-black tracking-[6px] bg-gradient-to-r from-[#10B981] to-emerald-300 bg-clip-text text-transparent">{pedido?.codigo || codigo}</p>

          <div className="h-px bg-gradient-to-r from-[#10B981]/20 via-white/[0.06] to-transparent my-6" />

          {pedido && (
            <div className="text-left space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center border border-[#10B981]/10">
                  <Package size={16} className="text-[#10B981]" />
                </div>
                <span className="text-[#64748B]">{pedido.negocios?.nombre || "Negocio"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center border border-[#10B981]/10">
                  <MapPin size={16} className="text-[#10B981]" />
                </div>
                <span className="text-[#64748B] truncate">{pedido.cliente_direccion}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center border border-[#10B981]/10">
                  <Bike size={16} className="text-[#10B981]" />
                </div>
                <span className="text-[#64748B]">Domicilio: ${pedido.domicilio.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center border border-[#10B981]/10">
                  <CreditCard size={16} className="text-[#10B981]" />
                </div>
                <span className="text-[#64748B]">
                  {pedido.metodo_pago ? (metodosLabels[pedido.metodo_pago]?.label || pedido.metodo_pago) : "Pago contra entrega"}
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-transparent my-4" />
              <div className="flex justify-between font-bold text-lg">
                <span className="text-[#F8FAFC]">Total</span>
                <span className="bg-gradient-to-r from-[#10B981] to-emerald-300 bg-clip-text text-transparent">${pedido.total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => router.push(`/cliente/seguimiento/${pedido?.codigo || codigo}`)}
          className="w-full text-sm font-bold mb-3 py-4 rounded-2xl text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-xl shadow-[#10B981]/25" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
          <Clock size={18} /> Seguir pedido <ArrowRight size={16} />
        </button>

        <button onClick={() => router.push(`/cliente/chat/${codigo}`)}
          className="w-full text-sm font-bold mb-3 py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all border border-[#10B981]/20 bg-[#1E293B]/70 backdrop-blur-xl hover:border-[#10B981]/40 hover:shadow-lg hover:shadow-[#10B981]/5">
          <MessageCircle size={18} className="text-[#10B981]" /> <span className="text-[#F8FAFC]">Chat en vivo</span>
        </button>

        <button onClick={() => router.push("/cliente")} className="text-sm text-[#64748B] font-medium py-3 hover:text-[#F8FAFC] transition-colors">
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0F172A]"><div className="w-12 h-12 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" /></div>}>
      <ConfirmacionContent />
    </Suspense>
  );
}
