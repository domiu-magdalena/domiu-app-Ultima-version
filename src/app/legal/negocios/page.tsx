'use client';

import Link from 'next/link';

export default function NegociosPage() {
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
            <h1 className="text-3xl font-bold text-foreground">Condiciones para Negocios</h1>
            <p className="mt-2 text-sm text-muted-foreground">Última actualización: junio de 2026</p>
          </div>

          <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
            <p>
              Estas condiciones regulan la relación entre <strong>DomiU</strong> y los negocios (restaurantes, farmacias, supermercados y otros comercios) que se registran en la plataforma para ofrecer sus productos a través de nuestro servicio de delivery.
            </p>

            <h2>1. Requisitos para registrarse</h2>
            <p>Para registrar tu negocio en DomiU, debes cumplir con los siguientes requisitos:</p>
            <ul>
              <li>Ser un negocio legalmente constituido o persona natural con actividad comercial registrada.</li>
              <li>Contar con un establecimiento físico ubicado dentro del área de cobertura de DomiU.</li>
              <li>Proporcionar documentación legal vigente: RUT, cámara de comercio y registro de alimentos (si aplica).</li>
              <li>Disponer de un menú o catálogo de productos con precios claros.</li>
              <li>Cumplir con las normas sanitarias y de manipulación de alimentos exigidas por la ley colombiana.</li>
              <li>Aprobar el proceso de verificación de DomiU.</li>
            </ul>

            <h2>2. Comisiones</h2>
            <p>
              DomiU cobra una comisión por cada pedido procesado a través de la plataforma. La estructura de comisiones es la siguiente:
            </p>
            <ul>
              <li>La comisión estándar es del <strong>15%</strong> sobre el valor total del pedido (excluyendo propinas).</li>
              <li>La comisión se descuenta automáticamente antes de la liquidación de pagos al negocio.</li>
              <li>DomiU se reserva el derecho de ajustar las comisiones con previo aviso de 30 días.</li>
              <li>Negocios con alto volumen de pedidos pueden acceder a comisiones preferenciales.</li>
            </ul>

            <h2>3. Estándares para el catálogo de productos</h2>
            <p>Al publicar productos en DomiU, el negocio se compromete a:</p>
            <ul>
              <li>Incluir descripciones precisas y completas de cada producto.</li>
              <li>Utilizar fotografías claras que representen fielmente el producto ofrecido.</li>
              <li>Mantener los precios actualizados en la plataforma.</li>
              <li>Indicar claramente alérgenos e información nutricional cuando sea requerido.</li>
              <li>No publicar productos prohibidos o que requieran regulación especial sin la debida autorización.</li>
              <li>Actualizar el inventario en tiempo real para evitar pedidos de productos agotados.</li>
            </ul>

            <h2>4. Responsabilidades en la preparación y entrega</h2>
            <p>El negocio es responsable de:</p>
            <ul>
              <li>Preparar los pedidos dentro del tiempo estimado indicado en la plataforma.</li>
              <li>Empacar los productos de forma segura para su transporte.</li>
              <li>Verificar que el pedido esté completo antes de entregarlo al repartidor.</li>
              <li>Asegurar la calidad e higiene de todos los productos.</li>
              <li>Notificar a través de la plataforma cuando un producto no esté disponible.</li>
              <li>No cancelar pedidos aceptados sin una razón válida.</li>
            </ul>

            <h2>5. Actualización de menú y precios</h2>
            <p>
              El negocio puede actualizar su menú y precios en cualquier momento a través del panel de administración de DomiU. Sin embargo:
            </p>
            <ul>
              <li>Los precios en la plataforma no pueden ser superiores a los precios en el establecimiento físico.</li>
              <li>Los cambios de precios aplican para pedidos futuros, no para pedidos ya confirmados.</li>
              <li>Se recomienda actualizar el menú al menos cada semana para reflejar disponibilidad real.</li>
            </ul>

            <h2>6. Servicio al cliente</h2>
            <p>
              El negocio es responsable de atender las inquietudes de los clientes relacionadas con la calidad, cantidad o preparación de los productos. DomiU gestiona los temas relacionados con la entrega y el funcionamiento de la plataforma. En caso de disputas, DomiU evaluará cada situación y podrá emitir reembolsos con cargo al negocio cuando la queja sea justificada.
            </p>

            <h2>7. Términos de pago</h2>
            <p>
              DomiU realiza pagos a los negocios de forma regular según el siguiente esquema:
            </p>
            <ul>
              <li>Los pagos se liquidan semanalmente por pedidos completados y confirmados.</li>
              <li>El pago incluye el valor total del pedido menos la comisión de DomiU.</li>
              <li>Los pagos se realizan mediante transferencia bancaria a la cuenta registrada por el negocio.</li>
              <li>DomiU se reserva el derecho de retener pagos en caso de disputas activas o investigaciones por fraude.</li>
            </ul>

            <h2>8. Suspensión y terminación de cuenta</h2>
            <p>DomiU puede suspender o terminar la cuenta de un negocio por las siguientes causas:</p>
            <ul>
              <li>Incumplimiento reiterado en los tiempos de preparación.</li>
              <li>Quejas recurrentes de clientes sobre la calidad de los productos.</li>
              <li>Documentación vencida, no válida o fraudulenta.</li>
              <li>Prácticas comerciales engañosas o publicidad falsa.</li>
              <li>Violación de las normas sanitarias o legales aplicables.</li>
              <li>Manipulación de precios, calificaciones o reseñas.</li>
            </ul>
            <p>
              En caso de terminación, los pagos pendientes por pedidos completados serán liquidados en el siguiente ciclo de pago.
            </p>

            <h2>9. Proceso de revisión</h2>
            <p>
              DomiU se reserva el derecho de realizar revisiones periódicas de los negocios registrados. Durante una revisión, podemos:
            </p>
            <ul>
              <li>Solicitar documentación actualizada.</li>
              <li>Realizar visitas al establecimiento (físicas o virtuales).</li>
              <li>Revisar el cumplimiento de los estándares de calidad.</li>
              <li>Solicitar ajustes en el menú o catálogo de productos.</li>
            </ul>
            <p>
              Los negocios que no superen las revisiones podrán ser suspendidos temporalmente hasta que subsanen las observaciones.
            </p>

            <h2>10. Contacto</h2>
            <p>
              Para cualquier pregunta sobre estas condiciones, contáctanos en:
              <br />
              Correo: <a href="mailto:domiumagdalena@gmail.com" className="text-info hover:underline">domiumagdalena@gmail.com</a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <Link
              href="/legal/repartidores"
              className="text-sm text-info hover:underline"
            >
              &larr; Condiciones para Repartidores
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
