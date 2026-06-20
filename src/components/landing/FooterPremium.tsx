'use client';

import Link from 'next/link';

const FOOTER_SECTIONS = [
  {
    title: 'Descubre',
    links: [
      { label: 'Restaurantes', href: '/cliente' },
      { label: 'Categorías', href: '/cliente' },
      { label: 'Ofertas', href: '/cliente' },
      { label: 'Ciudades', href: '/cliente' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos', href: '/terminos' },
      { label: 'Privacidad', href: '/privacidad' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'Trabaja con nosotros', href: '/trabajo' },
    ],
  },
  {
    title: 'Contacto',
    links: [
      { label: 'Santa Marta, Magdalena', href: '#' },
      { label: 'hola@domiu.app', href: 'mailto:hola@domiu.app' },
      { label: '+57 300 123 4567', href: 'tel:+573001234567' },
    ],
  },
];

const SOCIAL = [
  { label: 'Instagram', href: '#' },
  { label: 'Facebook', href: '#' },
  { label: 'Twitter', href: '#' },
  { label: 'TikTok', href: '#' },
];

export function FooterPremium() {
  return (
    <footer className="border-t border-border/10 bg-gradient-to-b from-background to-primary/[0.02]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
                D
              </div>
              <span className="text-lg font-bold text-foreground">DomiU</span>
            </Link>
            <p className="mb-6 max-w-xs text-sm text-muted-foreground leading-relaxed">
              La plataforma de delivery más rápida de Santa Marta. Conectamos restaurantes, clientes y repartidores.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/20 bg-background/50 text-xs font-medium text-muted-foreground transition-all hover:border-primary/20 hover:text-primary hover:bg-primary/5"
                  aria-label={s.label}
                >
                  {s.label.charAt(0)}
                </Link>
              ))}
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-foreground">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-border/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DomiU. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terminos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Términos</Link>
              <Link href="/privacidad" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacidad</Link>
              <Link href="/cookies" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
