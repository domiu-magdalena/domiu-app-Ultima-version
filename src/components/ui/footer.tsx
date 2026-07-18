import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone, Globe, ExternalLink, AtSign } from 'lucide-react';
import { DomiULogo } from '@/components/brand/DomiULogo';

const QUICK_LINKS = [
  { label: 'Restaurantes', href: '/cliente' },
  { label: 'Categorías', href: '/cliente/categories' },
  { label: 'Ofertas', href: '/cliente/search' },
  { label: 'Mis pedidos', href: '/cliente/pedidos' },
];

const LEGAL_LINKS = [
  { label: 'Términos de servicio', href: '/terminos' },
  { label: 'Política de privacidad', href: '/privacidad' },
  { label: 'Política de cookies', href: '/privacidad' },
  { label: 'Trabaja con nosotros', href: '/register' },
];

const SOCIAL_LINKS = [
  { icon: AtSign, href: 'mailto:domiumagdalena@gmail.com', label: 'Email' },
  { icon: Globe, href: 'https://domiu-app-ultima-version.vercel.app', label: 'Web' },
  { icon: ExternalLink, href: 'https://instagram.com/domiumagdalena', label: 'Instagram' },
];

export function Footer() {
  return (
    <footer className="border-t border-primary/10 bg-[#1A1D21]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="mb-5 inline-flex" aria-label="DomiU Magdalena">
              <DomiULogo variant="dark" markClassName="h-12 w-12" showTagline />
            </Link>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              La plataforma local que conecta clientes, negocios y repartidores en una operación rápida, visible y organizada.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Enlaces rápidos</h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Legal</h4>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                Santa Marta, Magdalena, Colombia
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:domiumagdalena@gmail.com" className="transition-colors hover:text-primary">
                  domiumagdalena@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+573113748405" className="transition-colors hover:text-primary">
                  +57 311 374 8405
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-primary/10 pt-7 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DomiU Magdalena. Pide fácil, recibe rápido.
          </p>
        </div>
      </div>
    </footer>
  );
}
