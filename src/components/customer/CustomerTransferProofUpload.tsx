'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileCheck2, Landmark, Loader2, Paperclip, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { getBrowserClient } from '@/lib/db/supabase';
import { attachTransferProofAction } from '@/app/actions/customer-orders';

function safeFileName(name: string) {
  const parts = name.split('.');
  const extension = parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
  const base = parts
    .join('.')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'comprobante'}${extension}`;
}

function validateFile(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type)) throw new Error('El comprobante debe ser JPG, PNG, WEBP o PDF');
  if (file.size > 5 * 1024 * 1024) throw new Error('El comprobante no puede superar 5 MB');
}

export function CustomerTransferProofUpload({
  orderId,
  customerId,
  paymentStatus,
  onUpdated,
}: {
  orderId: string;
  customerId: string;
  paymentStatus: string | null | undefined;
  onUpdated?: () => void;
}) {
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('proof_url')
        .eq('order_id', orderId)
        .eq('customer_id', customerId)
        .maybeSingle();
      if (error) throw error;
      const path = data?.proof_url ? String(data.proof_url) : null;
      setProofPath(path);
      if (path) {
        const { data: signed } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(path, 300);
        setSignedUrl(signed?.signedUrl || null);
      } else {
        setSignedUrl(null);
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo consultar el comprobante');
    } finally {
      setLoading(false);
    }
  }, [customerId, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async () => {
    if (!file || uploading) return;
    try {
      validateFile(file);
      setUploading(true);
      const supabase = getBrowserClient();
      const path = `${customerId}/${orderId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);

      const attached = await attachTransferProofAction({ orderId, proofPath: path });
      if (!attached.success) {
        await supabase.storage.from('payment-proofs').remove([path]);
        throw new Error(attached.error);
      }

      if (proofPath && proofPath !== path) {
        await supabase.storage.from('payment-proofs').remove([proofPath]);
      }

      setFile(null);
      toast.success('Comprobante adjuntado. El negocio ya puede verificarlo.');
      await load();
      onUpdated?.();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo subir el comprobante');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Consultando comprobante…</div>;
  }

  const canReplace = !['completed', 'refunded'].includes(String(paymentStatus || ''));

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary"><Landmark className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Comprobante de transferencia</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {proofPath ? 'El comprobante está guardado de forma privada.' : 'Adjúntalo para que el negocio pueda verificar el pago.'}
          </p>
        </div>
        {proofPath && <FileCheck2 className="h-5 w-5 shrink-0 text-success" />}
      </div>

      {signedUrl && (
        <a href={signedUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs font-bold"><ExternalLink className="h-3.5 w-3.5" />Ver comprobante actual</a>
      )}

      {canReplace && (
        <div className="mt-3 space-y-2">
          <label className="block cursor-pointer rounded-xl border border-dashed bg-background p-3">
            <div className="flex items-center gap-3"><Paperclip className="h-5 w-5 text-primary" /><div className="min-w-0"><p className="text-xs font-bold">{proofPath ? 'Reemplazar comprobante' : 'Seleccionar comprobante'}</p><p className="truncate text-[10px] text-muted-foreground">{file?.name || 'JPG, PNG, WEBP o PDF · máximo 5 MB'}</p></div></div>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0] || null; if (!selected) return setFile(null); try { validateFile(selected); setFile(selected); } catch (cause) { setFile(null); toast.error(cause instanceof Error ? cause.message : 'Archivo no válido'); } }} />
          </label>
          <button type="button" onClick={() => void upload()} disabled={!file || uploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-black text-primary-foreground disabled:opacity-50"><UploadCloud className="h-4 w-4" />{uploading ? 'Subiendo comprobante…' : 'Guardar comprobante'}</button>
        </div>
      )}
    </section>
  );
}
