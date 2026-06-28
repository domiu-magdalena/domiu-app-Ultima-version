'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
    if (isDuplicateEmail) setIsDuplicateEmail(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsDuplicateEmail(false);

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setFormError('Todos los campos son requeridos');
      return;
    }
    if (formData.password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!acceptTerms) {
      setFormError('Debes aceptar los términos y condiciones');
      return;
    }

    try {
      setIsLoading(true);
      const { selfRegisterAction } = await import('@/app/actions/auth');
      await selfRegisterAction({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Register error', err);
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('duplicate email') || msg.toLowerCase().includes('already exists')) {
        setIsDuplicateEmail(true);
        setFormError('Este correo ya está registrado. Inicia sesión o recupera tu contraseña.');
      } else {
        setFormError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">¡Cuenta creada!</h2>
          <p className="mb-4 text-muted-foreground">
            Bienvenido a DomiU, <strong>{formData.firstName}</strong>. Ya puedes iniciar sesión.
          </p>
          <div className="mx-auto h-1.5 w-48 animate-pulse rounded-full bg-muted" />
          <p className="mt-2 text-xs text-muted-foreground">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/5 via-background to-primary/10 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--color-primary)_0%,_transparent_60%)] opacity-[0.03]" />
        <div className="relative max-w-lg">
          <div className="mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">D</div>
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">Únete a DomiU</h1>
          <p className="mb-10 text-lg text-muted-foreground">Crea tu cuenta y empieza a disfrutar de la mejor comida a domicilio en Santa Marta.</p>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">📱</div>
              <div>
                <p className="text-sm font-medium text-foreground">Registro en 1 minuto</p>
                <p className="text-xs text-muted-foreground">Solo nombre, email y contraseña. Sin complicaciones</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-lg">🛡️</div>
              <div>
                <p className="text-sm font-medium text-foreground">Seguro y confiable</p>
                <p className="text-xs text-muted-foreground">Tus datos protegidos con encriptación de nivel bancario</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-lg">🎯</div>
              <div>
                <p className="text-sm font-medium text-foreground">¿Eres negocio o repartidor?</p>
                <p className="text-xs text-muted-foreground">Regístrate como cliente y luego solicita tu cambio de rol desde tu perfil</p>
              </div>
            </div>
          </div>
          <p className="mt-10 text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">D</div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Crear cuenta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">Inicia sesión</Link>
            </p>
          </div>

          {formError && (
            <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm font-medium text-destructive">{formError}</p>
              {isDuplicateEmail && (
                <div className="mt-2 flex gap-2 text-xs">
                  <Link href="/login" className="font-semibold text-primary hover:underline">Iniciar sesión</Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/forgot-password" className="font-semibold text-primary hover:underline">Recuperar contraseña</Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Te registras como <strong>Cliente</strong>. Más tarde podrás solicitar ser repartidor o registrar tu negocio.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-foreground">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input id="firstName" name="firstName" type="text" required value={formData.firstName} onChange={handleChange} placeholder="Kevin"
                    className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 transition-all" />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-foreground">Apellido</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input id="lastName" name="lastName" type="text" required value={formData.lastName} onChange={handleChange} placeholder="Leiva"
                    className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} placeholder="tu@email.com"
                  className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={formData.password} onChange={handleChange} placeholder="••••••••"
                    className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-foreground">Confirmar</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                    className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 transition-all" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border text-primary" />
              <span className="text-xs text-muted-foreground">
                Acepto los{' '}
                <Link href="/terminos" className="text-primary hover:underline" target="_blank">Términos de uso</Link> y la{' '}
                <Link href="/privacidad" className="text-primary hover:underline" target="_blank">Política de privacidad</Link>
              </span>
            </label>

            <button type="submit" disabled={isLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Creando cuenta...
                </span>
              ) : (
                <span className="flex items-center gap-2">Crear cuenta gratis <ArrowRight className="h-4 w-4" /></span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Al registrarte aceptas nuestros{' '}
              <Link href="/terminos" className="text-primary hover:underline">Términos</Link> y{' '}
              <Link href="/privacidad" className="text-primary hover:underline">Política de Privacidad</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
