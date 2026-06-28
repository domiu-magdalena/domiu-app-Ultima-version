'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getBrowserClient } from '@/lib/db/supabase';
import { submitCourierApplicationAction, getMyCourierApplication } from '@/app/actions/client-applications';
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, Bike, Loader2 } from 'lucide-react';

const VEHICLE_TYPES = [
  { value: 'bike', label: 'Bicicleta' },
  { value: 'motorcycle', label: 'Moto' },
  { value: 'car', label: 'Carro' },
  { value: 'van', label: 'Camioneta/Van' },
];

type ApplicationData = {
  status: string;
  [key: string]: unknown;
};

export default function RepartidorSolicitudPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getBrowserClient();

  const [existingApp, setExistingApp] = useState<ApplicationData | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    document_id: '',
    birth_date: '',
    phone: '',
    whatsapp: '',
    city: '',
    neighborhood: '',
    address: '',
    vehicle_type: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_color: '',
    vehicle_plate: '',
    payment_method: '',
    payment_account_number: '',
    emergency_contact: '',
    emergency_phone: '',
    accepted_terms: false,
    accepted_privacy: false,
    document_photo: '',
    license: '',
    soat: '',
    techno_review: '',
    vehicle_photo: '',
    profile_photo: '',
  });

  const [files, setFiles] = useState<Record<string, File | null>>({
    document_photo: null,
    license: null,
    soat: null,
    techno_review: null,
    vehicle_photo: null,
    profile_photo: null,
  });

  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading || !profile) return;
    const load = async () => {
      try {
        const app = await getMyCourierApplication();
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

    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${profile?.id}/${field}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('courier-documents')
        .upload(path, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from('courier-documents')
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
      const fileFields = ['document_photo', 'license', 'soat', 'techno_review', 'vehicle_photo', 'profile_photo'];

      for (const field of fileFields) {
        if (files[field]) {
          const url = await uploadFile(field);
          if (url) uploadedUrls[field] = url;
        }
      }

      const result = await submitCourierApplicationAction({
        ...form,
        vehicle_type: form.vehicle_type as 'bike' | 'motorcycle' | 'car' | 'van',
        document_photo: uploadedUrls.document_photo || form.document_photo,
        license: uploadedUrls.license || form.license,
        soat: uploadedUrls.soat || form.soat,
        techno_review: uploadedUrls.techno_review || form.techno_review,
        vehicle_photo: uploadedUrls.vehicle_photo || form.vehicle_photo,
        profile_photo: uploadedUrls.profile_photo || form.profile_photo,
      } as Parameters<typeof submitCourierApplicationAction>[0]);

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
            <h1 className="text-base font-bold text-foreground">Solicitud de Repartidor</h1>
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
            <div className="mb-4 flex justify-center">{statusIcons[existingApp.status] || <Bike className="h-8 w-8" />}</div>
            <h2 className="text-xl font-bold mb-2">{statusLabels[existingApp.status] || 'Estado desconocido'}</h2>
            <p className="text-sm opacity-80">{statusDescriptions[existingApp.status] || ''}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-base font-bold text-foreground">Ser Repartidor</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Personal Data */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Datos Personales</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nombre completo *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Tu nombre completo" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Documento de identidad *</label>
              <input value={form.document_id} onChange={e => setForm(f => ({ ...f, document_id: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Cédula / NIT" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Fecha de nacimiento *</label>
              <input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Teléfono *</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="300 123 4567" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">WhatsApp</label>
              <input type="tel" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="300 123 4567" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Ciudad *</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Santa Marta" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Barrio</label>
              <input value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Barrio" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Dirección *</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Calle 1 # 2-3" required />
            </div>
          </div>
        </motion.div>

        {/* Vehicle Data */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Vehículo</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tipo de vehículo *</label>
              <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" required>
                <option value="">Seleccionar...</option>
                {VEHICLE_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Marca</label>
              <input value={form.vehicle_brand} onChange={e => setForm(f => ({ ...f, vehicle_brand: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Marca" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Modelo</label>
              <input value={form.vehicle_model} onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Modelo" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Color</label>
              <input value={form.vehicle_color} onChange={e => setForm(f => ({ ...f, vehicle_color: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Color" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Placa</label>
              <input value={form.vehicle_plate} onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="ABC-123" />
            </div>
          </div>
        </motion.div>

        {/* Documents */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Documentos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { key: 'document_photo', label: 'Foto del documento' },
              { key: 'license', label: 'Licencia de conducción' },
              { key: 'soat', label: 'SOAT' },
              { key: 'techno_review', label: 'Revisión técnico-mecánica' },
              { key: 'vehicle_photo', label: 'Foto del vehículo' },
              { key: 'profile_photo', label: 'Foto de perfil' },
            ].map(doc => (
              <div key={doc.key}>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{doc.label}</label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 ${files[doc.key] ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">{files[doc.key] ? files[doc.key]!.name : 'Seleccionar archivo'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange(doc.key, e.target.files?.[0] || null)} />
                  {uploading[doc.key] && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                </label>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Datos de pago</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Método de pago</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="">Seleccionar...</option>
                <option value="nequi">Nequi</option>
                <option value="bancolombia">Bancolombia</option>
                <option value="daviplata">Daviplata</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Número de cuenta</label>
              <input value={form.payment_account_number} onChange={e => setForm(f => ({ ...f, payment_account_number: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Número de cuenta" />
            </div>
          </div>
        </motion.div>

        {/* Emergency Contact */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Contacto de emergencia</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nombre del contacto</label>
              <input value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Nombre del contacto" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Teléfono del contacto</label>
              <input type="tel" value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))} className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Teléfono" />
            </div>
          </div>
        </motion.div>

        {/* Terms */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.accepted_terms} onChange={e => setForm(f => ({ ...f, accepted_terms: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-muted-foreground">Acepto los <span className="text-primary font-medium">términos y condiciones</span> del servicio de reparto</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.accepted_privacy} onChange={e => setForm(f => ({ ...f, accepted_privacy: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-muted-foreground">Acepto las <span className="text-primary font-medium">políticas de privacidad</span> y tratamiento de datos</span>
          </label>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <button
            type="submit"
            disabled={isDisabled || !form.accepted_terms || !form.accepted_privacy}
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
