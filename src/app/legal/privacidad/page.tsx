'use client';

import Link from 'next/link';

export default function PrivacidadPage() {
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
            <h1 className="text-3xl font-bold text-foreground">Política de Privacidad</h1>
            <p className="mt-2 text-sm text-muted-foreground">Última actualización: junio de 2026</p>
          </div>

          <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
            <p>
              En <strong>DomiU</strong> nos tomamos muy en serio tu privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos tu información personal cuando utilizas nuestra plataforma.
            </p>

            <h2>1. Datos que recopilamos</h2>
            <p>Podemos recopilar la siguiente información cuando utilizas DomiU:</p>
            <ul>
              <li><strong>Información de registro:</strong> nombre completo, correo electrónico, número de teléfono y dirección.</li>
              <li><strong>Datos de ubicación:</strong> ubicación en tiempo real para rastrear y coordinar entregas.</li>
              <li><strong>Información del dispositivo:</strong> modelo, sistema operativo, identificadores únicos y versión de la aplicación.</li>
              <li><strong>Datos de pago:</strong> información de transacciones procesada a través de nuestros proveedores de pago. DomiU no almacena números completos de tarjetas de crédito.</li>
              <li><strong>Datos de uso:</strong> historial de pedidos, preferencias, reseñas y comportamiento en la plataforma.</li>
              <li><strong>Documentos de identidad:</strong> para repartidores y negocios, podemos solicitar documentos de identificación y verificación.</li>
            </ul>

            <h2>2. Cómo usamos tus datos</h2>
            <p>Utilizamos la información recopilada para los siguientes fines:</p>
            <ul>
              <li>Procesar y gestionar tus pedidos y entregas.</li>
              <li>Mejorar y personalizar tu experiencia en la plataforma.</li>
              <li>Comunicarnos contigo sobre tu cuenta, pedidos y promociones.</li>
              <li>Garantizar la seguridad de la plataforma y prevenir fraudes.</li>
              <li>Cumplir con obligaciones legales y regulatorias en Colombia.</li>
              <li>Realizar análisis estadísticos y de mercado.</li>
            </ul>

            <h2>3. Compartir información con terceros</h2>
            <p>Podemos compartir tu información con:</p>
            <ul>
              <li><strong>Negocios:</strong> cuando realizas un pedido, compartimos tu nombre, dirección y datos de contacto necesarios para la entrega.</li>
              <li><strong>Repartidores:</strong> compartimos tu ubicación y datos de contacto necesarios para coordinar la entrega.</li>
              <li><strong>Proveedores de pago:</strong> para procesar las transacciones de forma segura.</li>
              <li><strong>Autoridades:</strong> cuando sea requerido por ley o para proteger nuestros derechos legales.</li>
            </ul>
            <p>No vendemos tu información personal a terceros.</p>

            <h2>4. Tus derechos</h2>
            <p>De acuerdo con la legislación colombiana (Ley 1581 de 2012 y sus decretos reglamentarios), tienes los siguientes derechos sobre tus datos personales:</p>
            <ul>
              <li><strong>Acceso:</strong> solicitar información sobre los datos que tenemos de ti.</li>
              <li><strong>Corrección:</strong> solicitar la actualización o corrección de tus datos.</li>
              <li><strong>Eliminación:</strong> solicitar la eliminación de tus datos cuando ya no sean necesarios.</li>
              <li><strong>Portabilidad:</strong> solicitar una copia de tus datos en formato estructurado.</li>
              <li><strong>Revocación:</strong> revocar tu autorización para el tratamiento de datos.</li>
            </ul>
            <p>
              Para ejercer estos derechos, escríbenos a{' '}
              <a href="mailto:domiumagdalena@gmail.com" className="text-info hover:underline">domiumagdalena@gmail.com</a>.
            </p>

            <h2>5. Retención de datos</h2>
            <p>
              Conservamos tus datos personales mientras mantengas una cuenta activa en DomiU. Una vez que elimines tu cuenta, conservaremos cierta información durante el tiempo necesario para cumplir con obligaciones legales, fiscales o de auditoría.
            </p>

            <h2>6. Seguridad de los datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información contra acceso no autorizado, pérdida, alteración o divulgación. Estas incluyen cifrado de datos, firewalls, controles de acceso y auditorías periódicas de seguridad.
            </p>

            <h2>7. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos sobre cambios significativos a través de la plataforma o por correo electrónico. Te recomendamos revisar esta página regularmente.
            </p>

            <h2>8. Contacto para asuntos de privacidad</h2>
            <p>
              Si tienes preguntas, inquietudes o deseas ejercer tus derechos de privacidad, contáctanos:
              <br />
              Correo: <a href="mailto:domiumagdalena@gmail.com" className="text-info hover:underline">domiumagdalena@gmail.com</a>
              <br />
              Ubicación: Santa Marta, Colombia
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-4">
            <Link
              href="/legal/terminos"
              className="text-sm text-info hover:underline"
            >
              &larr; Términos y Condiciones
            </Link>
            <Link
              href="/legal/repartidores"
              className="text-sm text-info hover:underline"
            >
              Condiciones para Repartidores &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
