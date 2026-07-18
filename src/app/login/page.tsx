'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials, getDashboardPathForRole } from '@/types/auth';
import { logger } from '@/lib/logger';
import { DomiULogo } from '@/components/brand/DomiULogo';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, profile, error: authError } = useAuth();

  useEffect(() => {
    if (isAuthenticated && profile?.role) {
      const path = getDashboardPathForRole(profile.role);
      logger.debug('[LoginPage] already authenticated, redirecting', { role: profile.role, path });
      router.replace(path);
    }
  }, [isAuthenticated, profile, router]);

  const [formData, setFormData] = useState<LoginCredentials>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.email) {
      setFormError('Ingresa tu email');
      return;
    }
    if (!formData.password) {
      setFormError('Ingresa tu contraseña');
      return;
    }

    logger.debug('[LoginPage] handleSubmit', { email: formData.email });
    try {
      const sessionProfile = await login(formData);
      const path = getDashboardPathForRole(sessionProfile.role);
      logger.debug('[LoginPage] login OK', { role: sessionProfile.role, redirectTo: path, currentPathname: window.location.pathname });
      await new Promise((resolve) => setTimeout(resolve, 0));
      router.replace(path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.debug('[LoginPage] login FAIL', { message: msg });
      setFormError(msg);
    }
  };

  const displayError = formError || authError;

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <div className="relative hidden overflow-hidden border-r border-primary/10 bg-[#1A1D21] p-12 lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="relative max-w-lg">
          <DomiULogo className="mb-10" markClassName="h-16 w-16" variant="dark" showTagline />
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-primary">Bienvenido a DomiU Magdalena</p>
          <h1 className="mb-4 font-heading text-4xl font-black tracking-tight text-white">Pide, gestiona o entrega desde un solo ecosistema.</h1>
          <p className="mb-10 text-lg leading-relaxed text-[#8A9099]">Conectamos clientes, negocios y repartidores con pedidos organizados, rutas visibles y una operación local más rápida.</p>
          <div className="space-y-3">
            <div className="domiu-brand-surface flex items-start gap-4 rounded-xl p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">🍕</div>
              <div><p className="text-sm font-bold text-white">Comercio local en un solo lugar</p><p className="text-xs text-[#8A9099]">Restaurantes, farmacias, supermercados y negocios de Santa Marta.</p></div>
            </div>
            <div className="domiu-brand-surface flex items-start gap-4 rounded-xl p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">⚡</div>
              <div><p className="text-sm font-bold text-white">Entrega con seguimiento</p><p className="text-xs text-[#8A9099]">Consulta el estado, la ruta y la ubicación de tu pedido.</p></div>
            </div>
            <div className="domiu-brand-surface flex items-start gap-4 rounded-xl p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">🔒</div>
              <div><p className="text-sm font-bold text-white">Operación segura por perfiles</p><p className="text-xs text-[#8A9099]">Cada usuario accede únicamente a las funciones que le corresponden.</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-9 lg:hidden">
            <DomiULogo markClassName="h-12 w-12" variant="dark" showTagline />
          </div>

          <div className="mb-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">Acceso seguro</p>
            <h2 className="font-heading text-3xl font-black text-foreground">Iniciar sesión</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="font-bold text-primary hover:underline">Regístrate gratis</Link>
            </p>
          </div>

          {displayError && (
            <div className="mb-6 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-foreground">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="h-12 w-full rounded-xl border border-border bg-[#24282E] pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-foreground">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-border bg-[#24282E] pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border accent-[#FFC400]" />
                <span className="text-xs text-muted-foreground">Recordarme</span>
              </label>
              <Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="domiu-brand-glow flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition-all hover:brightness-105 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Iniciando sesión...
                </span>
              ) : (
                <span className="flex items-center gap-2">Iniciar sesión <ArrowRight className="h-4 w-4" /></span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Al iniciar sesión aceptas nuestros{' '}
              <Link href="/terminos" className="text-primary hover:underline">Términos</Link> y{' '}
              <Link href="/privacidad" className="text-primary hover:underline">Política de Privacidad</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
