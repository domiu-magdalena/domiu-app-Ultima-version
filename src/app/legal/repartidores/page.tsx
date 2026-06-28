'use client';

import Link from 'next/link';

export default function RepartidoresPage() {
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
            <h1 className="text-3xl font-bold text-foreground">Condiciones para Repartidores</h1>
            <p className="mt-2 text-sm text-muted-foreground">Última actualización: junio de 2026</p>
          </div>

          <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
            <p>
              Estas condiciones establecen los términos bajo los cuales los repartidores pueden utilizar la plataforma <strong>DomiU</strong> para ofrecer servicios de entrega. Al registrarte como repartidor, aceptas cumplir con todas las disposiciones aquí descritas.
            </p>

            <h2>1. Requisitos para ser repartidor</h2>
            <p>Para registrarte como repartidor en DomiU debes cumplir con los siguientes requisitos:</p>
            <ul>
              <li>Ser mayor de edad (18 años o más).</li>
              <li>Contar con un documento de identidad vigente (cédula de ciudadanía o equivalente).</li>
              <li>Disponer de un medio de transporte propio (bicicleta, motocicleta o vehículo) en buen estado.</li>
              <li>Contar con un teléfono inteligente compatible con la aplicación.</li>
              <li>No tener antecedentes penales por delitos que afecten la confianza requerida para el servicio.</li>
              <li>Aprobar el proceso de verificación de DomiU.</li>
            </ul>

            <h2>2. Verificación de documentos</h2>
            <p>
              Como parte del proceso de registro, deberás proporcionar y mantener actualizados los siguientes documentos:
            </p>
            <ul>
              <li>Cédula de ciudadanía o documento de identidad equivalente.</li>
              <li>Licencia de conducción vigente (si aplica según el tipo de vehículo).</li>
              <li>SOAT y revisión técnico-mecánica al día (para vehículos motorizados).</li>
              <li>Certificado de antecedentes judiciales.</li>
              <li>Foto tipo selfie para verificación de identidad.</li>
            </ul>
            <p>
              DomiU se reserva el derecho de rechazar solicitudes que no cumplan con los requisitos o cuya documentación no sea verificable.
            </p>

            <h2>3. Código de conducta</h2>
            <p>Como repartidor de DomiU, te comprometes a:</p>
            <ul>
              <li>Tratar a los clientes y al personal de los negocios con respeto y cordialidad.</li>
              <li>Presentarte con una apariencia limpia y profesional.</li>
              <li>Utilizar el uniforme o identificación proporcionada por DomiU si corresponde.</li>
              <li>No consumir alcohol, drogas ni sustancias psicoactivas durante tu jornada de trabajo.</li>
              <li>Cumplir con todas las normas de tránsito y seguridad vial.</li>
              <li>No solicitar propinas adicionales fuera de la plataforma.</li>
              <li>No compartir tu cuenta con otras personas.</li>
            </ul>

            <h2>4. Estructura de ingresos</h2>
            <p>
              Los repartidores reciben una compensación por cada entrega completada. La estructura de ingresos es la siguiente:
            </p>
            <ul>
              <li>El repartidor recibe el <strong>80%</strong> del valor del servicio de entreja.</li>
              <li>DomiU retiene el <strong>20%</strong> como comisión por el uso de la plataforma.</li>
              <li>Las propinas otorgadas por los clientes son 100% para el repartidor.</li>
              <li>Los pagos se realizan semanalmente a través de los métodos habilitados en la plataforma.</li>
            </ul>

            <h2>5. Estándares de entrega</h2>
            <p>Al aceptar un pedido, el repartidor se compromete a:</p>
            <ul>
              <li>Dirigirse al negocio dentro del tiempo estimado para la recogida.</li>
              <li>Verificar que el pedido esté completo antes de salir del negocio.</li>
              <li>Mantener los productos en condiciones adecuadas durante el transporte.</li>
              <li>Entregar el pedido en la dirección proporcionada por el cliente.</li>
              <li>Contactar al cliente si hay problemas para encontrar la dirección.</li>
              <li>No abrir, inspeccionar ni consumir los productos del pedido.</li>
              <li>Reportar cualquier incidente o retraso a través de la aplicación.</li>
            </ul>

            <h2>6. Seguros y responsabilidad</h2>
            <p>
              DomiU recomienda que los repartidores cuenten con un seguro personal y de responsabilidad civil. DomiU no proporciona cobertura de seguro para los repartidores ni para sus vehículos. El repartidor es responsable por daños o pérdidas que ocurran durante el transporte de los pedidos, incluyendo:
            </p>
            <ul>
              <li>Daños a los productos durante la entrega.</li>
              <li>Pérdida o robo de los productos.</li>
              <li>Accidentes de tránsito durante la realización del servicio.</li>
              <li>Multas o infracciones de tránsito.</li>
            </ul>

            <h2>7. Suspensión y terminación de cuenta</h2>
            <p>
              DomiU se reserva el derecho de suspender o terminar la cuenta de un repartidor por las siguientes causas:
            </p>
            <ul>
              <li>Incumplimiento reiterado de los tiempos de entrega.</li>
              <li>Mala conducta documentada con clientes o negocios.</li>
              <li>Fraude o manipulación de la plataforma.</li>
              <li>Documentación vencida o no válida.</li>
              <li>Calificación promedio por debajo del mínimo establecido por DomiU.</li>
              <li>Violación de cualquiera de estas condiciones.</li>
            </ul>
            <p>
              En caso de terminación, los pagos pendientes por entregas completadas serán liquidados según el ciclo de pago regular.
            </p>

            <h2>8. Reporte de incidentes</h2>
            <p>
              Los repartidores deben reportar cualquier incidente a través de la plataforma o contactando a soporte en{' '}
              <a href="mailto:domiumagdalena@gmail.com" className="text-info hover:underline">domiumagdalena@gmail.com</a>.
              Los incidentes incluyen accidentes, quejas de clientes, problemas con vehículos, o cualquier situación que afecte la capacidad de realizar entregas.
            </p>

            <h2>9. Uso de la plataforma</h2>
            <p>
              El repartidor se compromete a utilizar la plataforma DomiU exclusivamente para los fines previstos. No está permitido:
            </p>
            <ul>
              <li>Utilizar la aplicación de formas que puedan dañar, deshabilitar o sobrecargar los servidores.</li>
              <li>Intentar acceder a datos de otros usuarios sin autorización.</li>
              <li>Realizar entregas fuera del área de cobertura designada.</li>
              <li>Subcontratar o ceder las entregas a terceros no registrados.</li>
            </ul>

            <h2>10. Contacto</h2>
            <p>
              Para cualquier pregunta sobre estas condiciones, contáctanos en:
              <br />
              Correo: <a href="mailto:domiumagdalena@gmail.com" className="text-info hover:underline">domiumagdalena@gmail.com</a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-4">
            <Link
              href="/legal/privacidad"
              className="text-sm text-info hover:underline"
            >
              &larr; Política de Privacidad
            </Link>
            <Link
              href="/legal/negocios"
              className="text-sm text-info hover:underline"
            >
              Condiciones para Negocios &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
