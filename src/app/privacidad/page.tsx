'use client';

import Link from 'next/link';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link href="/register" className="mb-8 inline-flex text-sm text-muted-foreground hover:text-foreground">
          &larr; Volver al registro
        </Link>
        <h1 className="mb-6 text-3xl font-bold text-foreground">Política de Privacidad</h1>
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p>En DomiU, nos tomamos muy en serio tu privacidad. Esta política describe cómo recopilamos, usamos y protegemos tu información personal.</p>
          <h2 className="mt-8 text-lg font-semibold text-foreground">1. Información que recopilamos</h2>
          <p>Recopilamos la información que nos proporcionas al registrarte: nombre, correo electrónico, dirección de entrega y método de pago.</p>
          <h2 className="mt-8 text-lg font-semibold text-foreground">2. Cómo usamos tu información</h2>
          <p>Usamos tu información para procesar pedidos, mejorar nuestros servicios y comunicarnos contigo sobre tu cuenta y pedidos.</p>
          <h2 className="mt-8 text-lg font-semibold text-foreground">3. Protección de datos</h2>
          <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tu información contra acceso no autorizado.</p>
          <h2 className="mt-8 text-lg font-semibold text-foreground">4. Contacto</h2>
          <p>Si tienes preguntas sobre esta política, contáctanos en privacidad@domiu.app.</p>
        </div>
      </div>
    </div>
  );
}
