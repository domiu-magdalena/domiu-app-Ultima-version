'use client';

import Link from 'next/link';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link href="/register" className="mb-8 inline-flex text-sm text-muted-foreground hover:text-foreground">
          &larr; Volver al registro
        </Link>
        <h1 className="mb-6 text-3xl font-bold text-foreground">Términos y Condiciones</h1>
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p>Al utilizar DomiU, aceptas los siguientes términos y condiciones. Te recomendamos leerlos detenidamente antes de usar nuestros servicios.</p>
          <h2 className="mt-8 text-lg font-semibold text-foreground">1. Uso del servicio</h2>
          <p>DomiU es una plataforma que conecta clientes con restaurantes, farmacias y supermercados para la entrega a domicilio.</p>
          <h2 className="mt-8 text-lg font-semibold text-foreground">2. Responsabilidades</h2>
          <p>Los negocios son responsables de la calidad de sus productos. DomiU actúa únicamente como intermediario en la entrega.</p>
          <h2 className="mt-8 text-lg font-semibold text-foreground">3. Cancelaciones y reembolsos</h2>
          <p>Los pedidos pueden cancelarse antes de que el negocio comience a prepararlos. Una vez en preparación, contacta a soporte.</p>
          <h2 className="mt-8 text-lg font-semibold text-foreground">4. Modificaciones</h2>
          <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos sobre cambios importantes.</p>
        </div>
      </div>
    </div>
  );
}
