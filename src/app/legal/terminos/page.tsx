'use client';

import Link from 'next/link';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 animate-fade-in">
        <Link
          href="/legal"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Todos los documentos legales
        </Link>

        <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-card sm:p-10">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Términos y Condiciones de Uso</h1>
            <p className="mt-2 text-sm text-muted-foreground">Última actualización: junio de 2026</p>
          </div>

          <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
            <p>
              Bienvenido a <strong>DomiU</strong>. Estos Términos y Condiciones rigen el uso de la plataforma DomiU, una aplicación que conecta a clientes, negocios (restaurantes, farmacias, supermercados, etc.) y repartidores para la solicitud y entrega de productos a domicilio.
            </p>
            <p>
              Al acceder o utilizar la plataforma, aceptas estar sujeto a estos términos. Si no estás de acuerdo, no debes usar nuestros servicios.
            </p>

            <h2>1. Descripción del servicio</h2>
            <p>
              DomiU actúa como un intermediario tecnológico que facilita la conexión entre clientes que desean adquirir productos, negocios que los ofrecen y repartidores que los entregan. No somos responsables por la calidad de los productos ni por el servicio de entrega una vez asignado.
            </p>

            <h2>2. Cuentas de usuario</h2>
            <p>
              Para usar DomiU debes crear una cuenta proporcionando información veraz y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad que ocurra en tu cuenta. Debes notificarnos inmediatamente sobre cualquier uso no autorizado.
            </p>
            <p>
              DomiU se reserva el derecho de suspender o cancelar cuentas que proporcionen información falsa o que violen estos términos.
            </p>

            <h2>3. Responsabilidades del usuario</h2>
            <p>Como usuario de DomiU, aceptas:</p>
            <ul>
              <li>Proporcionar información precisa al registrarte y al realizar pedidos.</li>
              <li>No utilizar la plataforma para actividades ilícitas o fraudulentas.</li>
              <li>No interferir con el funcionamiento de la plataforma ni con otros usuarios.</li>
              <li>Cumplir con todas las leyes aplicables en Colombia.</li>
              <li>No realizar pedidos falsos o sin intención de pago.</li>
            </ul>

            <h2>4. Actividades prohibidas</h2>
            <p>Está estrictamente prohibido:</p>
            <ul>
              <li>Crear múltiples cuentas con el propósito de obtener beneficios indebidos.</li>
              <li>Manipular precios, calificaciones o reseñas.</li>
              <li>Utilizar bots, scrapers u otras herramientas automatizadas sin autorización.</li>
              <li>Publicar contenido ofensivo, discriminatorio o ilegal.</li>
              <li>Suplantar la identidad de otra persona o entidad.</li>
            </ul>

            <h2>5. Limitación de responsabilidad</h2>
            <p>
              DomiU no será responsable por daños indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de usar la plataforma. Nuestra responsabilidad máxima será el valor del pedido realizado. DomiU no garantiza disponibilidad ininterrumpida del servicio.
            </p>

            <h2>6. Propiedad intelectual</h2>
            <p>
              Todos los derechos de propiedad intelectual sobre la plataforma DomiU, incluyendo su diseño, logotipos, código fuente y contenido, son propiedad de DomiU. No está permitida su reproducción, distribución o modificación sin autorización expresa.
            </p>

            <h2>7. Modificaciones de los términos</h2>
            <p>
              DomiU se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados a través de la plataforma o por correo electrónico. El uso continuado después de las modificaciones constituye aceptación de los nuevos términos.
            </p>

            <h2>8. Ley aplicable y jurisdicción</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa será sometida a los tribunales competentes de la ciudad de Santa Marta, Colombia.
            </p>

            <h2>9. Contacto</h2>
            <p>
              Si tienes preguntas sobre estos términos, puedes contactarnos en:
              <br />
              <a href="mailto:domiumagdalena@gmail.com" className="text-info hover:underline">domiumagdalena@gmail.com</a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <Link
              href="/legal/privacidad"
              className="text-sm text-info hover:underline"
            >
              Ver Política de Privacidad &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
