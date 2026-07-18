'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, Eye, EyeOff, LocateFixed, Lock, Mail, MapPin, User } from 'lucide-react';
import { getCurrentExactLocation, type ExactLocation } from '@/lib/maps/geolocation';
import { selfRegisterWithLocationAction } from '@/app/actions/public-registration';
import { SkeletonCard } from '@/components/ui/skeleton';
import { DomiULogo, DomiUMark } from '@/components/brand/DomiULogo';

const PlacesAutocomplete = dynamic(
  () => import('@/components/tracking/maps/PlacesAutocomplete').then((module) => module.PlacesAutocomplete),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const fieldClass = 'h-12 w-full rounded-xl border border-[#DDE1E7] bg-[#F8F9FA] pl-11 pr-4 text-sm font-semibold text-[#25282E] outline-none focus:border-[#FFD400] focus:bg-white focus:ring-2 focus:ring-[#FFD400]/20';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [location, setLocation] = useState<ExactLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const shareLocation = async () => {
    if (locating) return;
    setLocating(true);
    setError('');
    try {
      setLocation(await getCurrentExactLocation());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo obtener la ubicación');
    } finally {
      setLocating(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return setError('Completa todos los datos personales.');
    if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (form.password !== confirmPassword) return setError('Las contraseñas no coinciden.');
    if (!acceptTerms) return setError('Debes aceptar los términos y la política de privacidad.');

    setLoading(true);
    try {
      await selfRegisterWithLocationAction({
        ...form,
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        location: location ? {
          streetAddress: location.formattedAddress,
          city: location.city,
          state: location.state,
          country: location.country,
          postalCode: location.postalCode,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy,
        } : undefined,
      });
      setSuccess(true);
      window.setTimeout(() => router.push('/login'), 1600);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7F8FA] px-4 text-[#17191F]">
        <section className="w-full max-w-md rounded-3xl border border-[#E3E6EB] bg-white p-8 text-center shadow-xl shadow-black/5">
          <DomiUMark className="mx-auto h-20 w-28" />
          <CheckCircle className="mx-auto mt-5 h-12 w-12 text-[#11935B]" />
          <h1 className="mt-4 text-2xl font-black">Cuenta creada</h1>
          <p className="mt-2 text-sm font-medium text-[#68707D]">Tu información quedó guardada. Abriendo el inicio de sesión…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7F8FA] px-4 py-7 text-[#17191F] [--background:#F7F8FA] [--foreground:#17191F] [--card:#FFFFFF] [--card-foreground:#17191F] [--primary:#FFD400] [--primary-foreground:#17191F] [--muted:#EEF0F3] [--muted-foreground:#68707D] [--border:#DDE1E7]">
      <form onSubmit={submit} className="mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E3E6EB] bg-white shadow-[0_26px_80px_-45px_rgba(16,24,40,.38)]">
        <header className="border-b border-[#ECEEF2] bg-gradient-to-r from-[#FFF9DA] to-white p-6 sm:p-8">
          <DomiULogo showTagline />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#947300]">Registro de cliente</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Crear cuenta en DomiU</h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-[#68707D]">Registra tus datos y una ubicación exacta para calcular correctamente la tarifa de entrega.</p>
        </header>

        <div className="space-y-6 p-6 sm:p-8">
          <section>
            <h2 className="text-lg font-black">Datos personales</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label><span className="mb-2 block text-sm font-black">Nombre</span><span className="relative block"><User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89909A]" /><input required value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} className={fieldClass} /></span></label>
              <label><span className="mb-2 block text-sm font-black">Apellido</span><span className="relative block"><User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89909A]" /><input required value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} className={fieldClass} /></span></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-black">Correo electrónico</span><span className="relative block"><Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89909A]" /><input type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={fieldClass} /></span></label>
              <label><span className="mb-2 block text-sm font-black">Contraseña</span><span className="relative block"><Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89909A]" /><input type={showPassword ? 'text' : 'password'} required value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className={`${fieldClass} pr-11`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7C838D]" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></span></label>
              <label><span className="mb-2 block text-sm font-black">Confirmar contraseña</span><span className="relative block"><Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89909A]" /><input type={showPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={fieldClass} /></span></label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E4E7EC] bg-[#FAFBFC] p-5">
            <h2 className="font-black">Ubicación de entrega</h2>
            <p className="mt-1 text-xs font-medium text-[#68707D]">Comparte la ubicación del dispositivo o busca tu dirección manualmente.</p>
            <button type="button" onClick={() => void shareLocation()} disabled={locating} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD400] px-4 py-3 text-sm font-black shadow-md shadow-[#FFD400]/20 disabled:opacity-60"><LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />{locating ? 'Obteniendo ubicación…' : 'Compartir mi ubicación actual'}</button>
            <div className="relative my-4 text-center text-xs font-semibold text-[#858C96] before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t before:border-[#E0E3E8]"><span className="relative bg-[#FAFBFC] px-3">o buscar manualmente</span></div>
            <PlacesAutocomplete defaultValue={location?.formattedAddress || ''} placeholder="Busca tu dirección en Google" onPlaceSelected={(place) => setLocation({ lat: place.lat, lng: place.lng, accuracy: 0, formattedAddress: place.formattedAddress, city: place.city || 'Santa Marta', state: place.state || 'Magdalena', country: place.country || 'Colombia', postalCode: place.postalCode || '' })} />
            <div className={`mt-3 flex gap-2 rounded-xl p-3 text-xs font-semibold ${location ? 'bg-[#EAF8F0] text-[#087443]' : 'bg-[#FFF8D0] text-[#745C00]'}`}><MapPin className="h-4 w-4 shrink-0" /><span>{location ? `${location.formattedAddress} · Coordenadas guardadas` : 'Podrás guardar una ubicación exacta antes de realizar el primer pedido.'}</span></div>
          </section>

          <label className="flex items-start gap-2 text-xs font-medium text-[#68707D]"><input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 accent-[#D8AB00]" /><span>Acepto los <Link href="/terminos" className="font-black text-[#806500]">Términos</Link> y la <Link href="/privacidad" className="font-black text-[#806500]">Política de privacidad</Link>.</span></label>
          {error && <p className="rounded-xl border border-[#F7B4AE] bg-[#FFF1F0] p-3 text-sm font-semibold text-[#B42318]">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#17191F] py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60">{loading ? 'Creando cuenta…' : 'Crear cuenta'}</button>
          <p className="text-center text-sm font-medium text-[#68707D]">¿Ya tienes cuenta? <Link href="/login" className="font-black text-[#806500]">Inicia sesión</Link></p>
        </div>
      </form>
    </main>
  );
}
