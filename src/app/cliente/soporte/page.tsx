"use client";
import { Headphones, MessageCircle, Phone, Mail, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const faqs = [
  { q: "¿Cómo hago un pedido?", a: "Busca un negocio, agrega productos al carrito y confirma tu pedido." },
  { q: "¿Cómo pago mi pedido?", a: "Puedes pagar en efectivo, Nequi, DaviPlata, transferencia bancaria o con tu billetera DomiPay." },
  { q: "¿Cuánto tarda el domicilio?", a: "Depende del negocio, pero usualmente 30-60 minutos." },
  { q: "¿Cómo rastreo mi pedido?", a: "Ve a la sección Mis Pedidos e ingresa tu número de teléfono." },
];

export default function SoportePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen pb-24 px-5 pt-5">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10B981]/30 to-[#10B981]/5 flex items-center justify-center shadow-lg shadow-[#10B981]/10 backdrop-blur-xl border border-[#10B981]/20">
          <Headphones size={26} className="text-[#10B981]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Soporte</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Estamos aquí para ayudarte</p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <button className="w-full p-5 rounded-2xl bg-[#1E293B]/70 border border-white/[0.06] flex items-center gap-4 active:scale-[0.98] transition-all duration-300 text-left backdrop-blur-xl hover:border-[#10B981]/30 hover:shadow-lg hover:shadow-[#10B981]/5 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center shrink-0 border border-[#10B981]/10 group-hover:shadow-md group-hover:shadow-[#10B981]/20 transition-all duration-300">
            <MessageCircle size={22} className="text-[#10B981]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#F8FAFC]">Chat en vivo</p>
            <p className="text-xs text-[#64748B] mt-0.5">Respuesta inmediata</p>
          </div>
          <ChevronRight size={16} className="text-[#64748B] shrink-0 group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all duration-300" />
        </button>

        <button className="w-full p-5 rounded-2xl bg-[#1E293B]/70 border border-white/[0.06] flex items-center gap-4 active:scale-[0.98] transition-all duration-300 text-left backdrop-blur-xl hover:border-[#10B981]/30 hover:shadow-lg hover:shadow-[#10B981]/5 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center shrink-0 border border-[#10B981]/10 group-hover:shadow-md group-hover:shadow-[#10B981]/20 transition-all duration-300">
            <Phone size={22} className="text-[#10B981]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#F8FAFC]">Llamar</p>
            <p className="text-xs text-[#64748B] mt-0.5">+57 301 234 5678</p>
          </div>
          <ChevronRight size={16} className="text-[#64748B] shrink-0 group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all duration-300" />
        </button>

        <button className="w-full p-5 rounded-2xl bg-[#1E293B]/70 border border-white/[0.06] flex items-center gap-4 active:scale-[0.98] transition-all duration-300 text-left backdrop-blur-xl hover:border-[#10B981]/30 hover:shadow-lg hover:shadow-[#10B981]/5 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center shrink-0 border border-[#10B981]/10 group-hover:shadow-md group-hover:shadow-[#10B981]/20 transition-all duration-300">
            <Mail size={22} className="text-[#10B981]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#F8FAFC]">Email</p>
            <p className="text-xs text-[#64748B] mt-0.5">ayuda@domiumagdalena.com</p>
          </div>
          <ChevronRight size={16} className="text-[#64748B] shrink-0 group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all duration-300" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#10B981] to-[#10B981]/30" />
        <h2 className="font-bold text-base text-[#F8FAFC]">Preguntas frecuentes</h2>
      </div>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <details key={i} className="group rounded-2xl bg-[#1E293B]/70 border border-white/[0.06] overflow-hidden backdrop-blur-xl hover:border-[#10B981]/20 transition-all duration-300">
            <summary className="p-5 text-sm font-semibold text-[#F8FAFC] cursor-pointer list-none flex items-center justify-between hover:bg-white/[0.02] transition-colors duration-300">
              <span className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] opacity-60 group-open:opacity-100 transition-opacity" />
                {faq.q}
              </span>
              <ChevronRight size={14} className="text-[#64748B] group-open:text-[#10B981] group-open:rotate-90 transition-all duration-300 shrink-0" />
            </summary>
            <div className="px-5 pb-5 pl-8">
              <p className="text-xs text-[#64748B] leading-relaxed">{faq.a}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
