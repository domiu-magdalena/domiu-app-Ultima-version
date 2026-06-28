'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getBrowserClient } from '@/lib/db/supabase';
import { submitBusinessApplicationAction, getMyBusinessApplication } from '@/app/actions/client-applications';
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, Store, Loader2 } from 'lucide-react';
import { STORAGE_BUCKETS } from '@/lib/storage';

type ApplicationData = {
  status: string;
  [key: string]: unknown;
};

export default function NegocioSolicitudPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getBrowserClient();

  const [existingApp, setExistingApp] = useState<ApplicationData | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    business_name: '',
    business_type: '',
    category: '',
    description: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    address: '',
    owner_name: '',
    owner_document: '',
    avg_prep_time_minutes: 15,
    accepts_delivery: true,
    accepts_pickup: true,
    accepted_terms: false,
    accepted_privacy: false,
    accepted_commission: false,
  });

  const [files, setFiles] = useState<Record<string, File | null>>({
    logo_url: null,
    banner_url: null,
    rut_url: null,
  });

  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading || !profile) return;
    const load = async () => {
      try {
        const app = await getMyBusinessApplication();
        if (app) setExistingApp(app);
      } catch {
        // ignore
      } finally {
        setLoadingApp(false);
      }
    };
    load();
  }, [profile, authLoading]);

  const handleFileChange = useCallback((field: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  }, []);

  const uploadFile = async (field: string): Promise<string> => {
    const file = files[field];
    if (!file) return '';

    const bucketMap: Record<string, string> = {
      logo_url: STORAGE_BUCKETS.BUSINESS_LOGOS,
      banner_url: STORAGE_BUCKETS.BUSINESS_BANNERS,
      rut_url: STORAGE_BUCKETS.COURIER_DOCUMENTS,
    };
    const bucket = bucketMap[field] || STORAGE_BUCKETS.COURIER_DOCUMENTS;

    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${profile?.id}/${field}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return urlData?.publicUrl || '';
    } catch (err) {
      throw err;
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    try {
      const uploadedUrls: Record<string, string> = {};

      for (const field of ['logo_url', 'banner_url', 'rut_url']) {
        if (files[field]) {
          const url = await uploadFile(field);
          if (url) uploadedUrls[field] = url;
        }
      }

      const result = await submitBusinessApplicationAction({
        ...form,
        lat: undefined,
        lng: undefined,
        logo_url: uploadedUrls.logo_url || '',
        banner_url: uploadedUrls.banner_url || '',
        rut_url: uploadedUrls.rut_url || '',
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Solicitud enviada con éxito');
      router.push('/cliente/solicitudes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar solicitud');
    } finally {
      setSubmitting(false);
    }
  }, [profile, form, files, uploadFile, router]);

  const isUploading = Object.values(uploading).some(Boolean);
  const isDisabled = submitting || isUploading;

  if (authLoading || loadingApp) {
    return (
      <div className="min-h-screen bg-background pb-16 lg:pb-0">
        <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
            <h1 className="text-base font-bold text-foreground">Registrar mi Negocio</h1>
          </div>
        </div>
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          {[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />)}
        </div>
      </div>
    );
  }

  if (existingApp) {
    const statusStyles: Record<string, string> = {
      pendiente: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
      aprobado: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
      rechazado: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
    };
    const statusIcons: Record<string, React.ReactNode> = {
      pendiente: <Clock className="h-8 w-8" />,
      aprobado: <CheckCircle className="h-8 w-8" />,
      rechazado: <XCircle className="h-8 w-8" />,
    };
    const statusLabels: Record<string, string> = {
      pendiente: 'Pendiente de revisión',
      aprobado: '¡Solicitud aprobada!',
      rechazado: 'Solicitud rechazada',
    };
    const statusDescriptions: Record<string, string> = {
      pendiente: 'Tu solicitud está siendo evaluada por nuestro equipo. Te notificaremos cuando haya una respuesta.',
      aprobado: 'Felicidades, tu solicitud ha sido aprobada. Revisa tu correo para los siguientes pasos.',
      rechazado: 'Lo sentimos, tu solicitud no ha sido aprobada. Si crees que es un error, contacta a soporte.',
    };

    return (
      <div className="min-h-screen bg-background pb-16 lg:pb-0">
        <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button onClick={() => router.push('/cliente/solicitudes')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
            <h1 className="text-base font-bold text-foreground">Mi Solicitud</h1>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-2xl border p-8 text-center ${statusStyles[existingApp.status] || 'bg-muted text-muted-foreground'}`}>
            <div className="mb-4 flex justify-center">{statusIcons[existingApp.status] || <Store className="h-8 w-8" />}</div>
            <h2 className="text-xl font-bold mb-2">{statusLabels[existingApp.status] || 'Estado desconocido'}</h2>
            <p className="text-sm opacity-80">{statusDescriptions[existingApp.status] || ''}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";
  const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-base font-bold text-foreground">Registrar mi Negocio</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Business Data */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Datos del Negocio</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nombre del negocio *</label>
              <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} className={inputClass} placeholder="Nombre de tu negocio" required />
            </div>
            <div>
              <label className={labelClass}>Tipo de negocio *</label>
              <select value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))} className={inputClass} required>
                <option value="">Seleccionar...</option>
                <option value="restaurant">Restaurante</option>
                <option value="cafe">Cafetería</option>
                <option value="fast_food">Comida rápida</option>
                <option value="bakery">Panadería</option>
                <option value="ice_cream">Heladería</option>
                <option value="bar">Bar</option>
                <option value="store">Tienda</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Categoría</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass} placeholder="Ej: Comida colombiana" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Descripción</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} min-h-[80px] resize-none`} placeholder="Describe tu negocio..." />
            </div>
            <div>
              <label className={labelClass}>Teléfono *</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="300 123 4567" required />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input type="tel" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className={inputClass} placeholder="300 123 4567" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="correo@negocio.com" />
            </div>
            <div>
              <label className={labelClass}>Ciudad *</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} placeholder="Santa Marta" required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Dirección *</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputClass} placeholder="Calle 1 # 2-3" required />
            </div>
          </div>
        </motion.div>

        {/* Images */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Imágenes</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { key: 'logo_url', label: 'Logo del negocio' },
              { key: 'banner_url', label: 'Imagen de portada' },
              { key: 'rut_url', label: 'RUT / Cámara de comercio' },
            ].map(doc => (
              <div key={doc.key}>
                <label className={labelClass}>{doc.label}</label>
                <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 ${files[doc.key] ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <Upload className="h-6 w-6" />
                  <span className="text-center truncate max-w-full">{files[doc.key] ? files[doc.key]!.name : 'Seleccionar archivo'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange(doc.key, e.target.files?.[0] || null)} />
                  {uploading[doc.key] && <Loader2 className="h-4 w-4 animate-spin" />}
                </label>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Owner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Datos del Propietario</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre del propietario *</label>
              <input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} className={inputClass} placeholder="Nombre completo" required />
            </div>
            <div>
              <label className={labelClass}>Documento del propietario *</label>
              <input value={form.owner_document} onChange={e => setForm(f => ({ ...f, owner_document: e.target.value }))} className={inputClass} placeholder="Cédula / NIT" required />
            </div>
          </div>
        </motion.div>

        {/* Config */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Configuración</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Tiempo promedio de preparación (min)</label>
              <input type="number" min={0} value={form.avg_prep_time_minutes} onChange={e => setForm(f => ({ ...f, avg_prep_time_minutes: parseInt(e.target.value) || 0 }))} className={inputClass} />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.accepts_delivery} onChange={e => setForm(f => ({ ...f, accepts_delivery: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                <span className="text-sm text-foreground font-medium">Acepta delivery</span>
              </label>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.accepts_pickup} onChange={e => setForm(f => ({ ...f, accepts_pickup: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                <span className="text-sm text-foreground font-medium">Acepta recogida</span>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Terms */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.accepted_terms} onChange={e => setForm(f => ({ ...f, accepted_terms: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-muted-foreground">Acepto los <span className="text-primary font-medium">términos y condiciones</span> del servicio</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.accepted_privacy} onChange={e => setForm(f => ({ ...f, accepted_privacy: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-muted-foreground">Acepto las <span className="text-primary font-medium">políticas de privacidad</span> y tratamiento de datos</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.accepted_commission} onChange={e => setForm(f => ({ ...f, accepted_commission: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-muted-foreground">Acepto la <span className="text-primary font-medium">comisión</span> establecida por DomiU por cada pedido</span>
          </label>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <button
            type="submit"
            disabled={isDisabled || !form.accepted_terms || !form.accepted_privacy || !form.accepted_commission}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDisabled && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
          </button>
        </motion.div>
      </form>
    </div>
  );
}
