import { ManualDeliveryForm } from '@/components/manual-orders/ManualDeliveryForm';
import { ClipboardPaste, MessageCircleMore, Route, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Crear domicilio manual - DomiU Admin',
  description: 'Registra domicilios recibidos por WhatsApp, llamada o atención directa',
};

const benefits = [
  { icon: MessageCircleMore, text: 'Convierte mensajes de WhatsApp en domicilios trazables.' },
  { icon: Route, text: 'Calcula la ruta y la tarifa antes de publicar.' },
  { icon: ShieldCheck, text: 'Valida dirección, negocio, pago y asignación.' },
];

export default function CrearDomicilioAdminPage() {
  return (
    <main className="domiu-page-shell space-y-7">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-[0_28px_90px_-60px_rgba(20,28,38,.45)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFC400] text-[#171a1f] shadow-sm">
                <ClipboardPaste className="h-6 w-6" />
              </div>
              <div>
                <p className="domiu-section-kicker">Operación administrativa</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  Crear domicilio manual
                </h1>
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              Registra solicitudes recibidas por WhatsApp, llamada, redes sociales o atención presencial y
              conviértelas en pedidos visibles para toda la operación de DomiU.
            </p>
          </div>

          <div className="border-t border-border bg-[#171a1f] p-6 text-white lg:border-l lg:border-t-0 lg:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#FFC400]">
              Flujo controlado
            </p>
            <div className="mt-5 space-y-4">
              {benefits.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FFC400]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ManualDeliveryForm panel="admin" />
    </main>
  );
}
