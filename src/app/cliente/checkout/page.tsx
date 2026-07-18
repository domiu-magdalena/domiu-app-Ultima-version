'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Info,
  Landmark,
  MapPin,
  Paperclip,
  Route,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, type CartCustomization } from '@/contexts/CartContext';
import { getBrowserClient } from '@/lib/db/supabase';
import { formatCOP } from '@/lib/money';
import { addressService, type DeliveryAddress } from '@/services/addresses';
import {
  attachTransferProofAction,
  createCustomerOrderAction,
  quoteCustomerDeliveryAction,
} from '@/app/actions/customer-orders';

type PaymentMethod = 'cash' | 'transfer';

type DeliveryQuote = {
  distanceKm: number;
  durationMinutes: number;
  deliveryFee: number;
  serviceFee: number;
  totalAmount: number;
  financialVersion: string;
  routeSource: string;
  pickupAddress: string;
};

type BusinessLocation = {
  id: string;
  name: string;
  formattedAddress: string;
  isPrimary: boolean;
};

type BusinessPaymentMethod = {
  method: PaymentMethod;
  displayName: string;
  provider: string | null;
  accountHolder: string | null;
  accountIdentifier: string | null;
  instructions: string | null;
};

const PAYMENT_PRESENTATION: Record<PaymentMethod, { title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  cash: {
    title: 'Efectivo contra entrega',
    description: 'Paga el valor total al repartidor cuando recibas el pedido.',
    icon: Banknote,
  },
  transfer: {
    title: 'Transferencia',
    description: 'Transfiere al comercio y adjunta el comprobante para validación.',
    icon: Landmark,
  },
};

function customizationSummary(customization?: CartCustomization) {
  if (!customization) return [];
  const rows: string[] = [];
  if (customization.style) rows.push(`Estilo: ${customization.style}`);
  if (customization.sauces?.length) rows.push(`Salsas: ${customization.sauces.join(', ')}`);
  if (customization.saucePresentation) rows.push(`Presentación: ${customization.saucePresentation === 'aparte' ? 'salsas aparte' : 'bañadas en salsa'}`);
  if (customization.extras?.length) {
    const extras = customization.extras.filter((extra) => extra.quantity > 0).map((extra) => `${extra.quantity}x ${extra.name}`);
    if (extras.length) rows.push(`Adicionales: ${extras.join(', ')}`);
  }
  if (customization.preparationNote?.trim()) rows.push(`Nota: ${customization.preparationNote.trim()}`);
  return rows;
}

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

export default function CheckoutPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { items, businessId, businessName, subtotal, isEmpty, clearCart } = useCart();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<BusinessPaymentMethod[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [instructions, setInstructions] = useState('');
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState('');
  const [quoteError, setQuoteError] = useState('');

  const selectedAddress = useMemo(() => addresses.find((address) => address.id === selectedAddressId) ?? null, [addresses, selectedAddressId]);
  const selectedLocation = useMemo(() => locations.find((location) => location.id === selectedLocationId) ?? null, [locations, selectedLocationId]);
  const selectedPayment = useMemo(() => paymentMethods.find((method) => method.method === paymentMethod) ?? null, [paymentMethod, paymentMethods]);

  const loadConfiguration = useCallback(async () => {
    if (!profile?.id || !businessId) return;
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const [addressRows, locationsResult, paymentsResult, businessResult] = await Promise.all([
        addressService.list(profile.id),
        supabase
          .from('business_addresses')
          .select('id,name,street_address,formatted_address,city,state_province,is_primary,latitude,longitude')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .eq('delivery_available', true)
          .is('deleted_at', null)
          .order('is_primary', { ascending: false }),
        supabase
          .from('business_payment_methods')
          .select('method,display_name,provider,account_holder,account_identifier,instructions')
          .eq('business_id', businessId)
          .eq('is_enabled', true)
          .in('method', ['cash', 'transfer']),
        supabase
          .from('businesses')
          .select('is_active,is_verified,is_accepting_orders,operations_status')
          .eq('id', businessId)
          .single(),
      ]);

      if (locationsResult.error) throw new Error(locationsResult.error.message);
      if (paymentsResult.error) throw new Error(paymentsResult.error.message);
      if (businessResult.error) throw new Error(businessResult.error.message);
      if (!businessResult.data?.is_active || !businessResult.data?.is_verified || !businessResult.data?.is_accepting_orders || businessResult.data?.operations_status !== 'open') {
        throw new Error('El comercio está cerrado y no puede recibir pedidos en este momento');
      }

      setAddresses(addressRows);
      const preferredAddress = addressRows.find((row) => row.is_primary) ?? addressRows[0];
      setSelectedAddressId(preferredAddress?.id ?? '');

      const normalizedLocations = (locationsResult.data ?? [])
        .filter((row) => row.latitude != null && row.longitude != null)
        .map((row) => ({
          id: String(row.id),
          name: String(row.name || (row.is_primary ? 'Local principal' : 'Sucursal')),
          formattedAddress: String(row.formatted_address || '').trim() || [row.street_address, row.city, row.state_province].filter(Boolean).join(', '),
          isPrimary: Boolean(row.is_primary),
        }));
      setLocations(normalizedLocations);
      setSelectedLocationId(normalizedLocations.find((row) => row.isPrimary)?.id ?? normalizedLocations[0]?.id ?? '');

      const normalizedPayments = (paymentsResult.data ?? [])
        .filter((row) => row.method === 'cash' || row.method === 'transfer')
        .filter((row) => row.method === 'cash' || Boolean(row.provider && row.account_holder && row.account_identifier))
        .map((row) => ({
          method: row.method as PaymentMethod,
          displayName: String(row.display_name || PAYMENT_PRESENTATION[row.method as PaymentMethod].title),
          provider: row.provider ? String(row.provider) : null,
          accountHolder: row.account_holder ? String(row.account_holder) : null,
          accountIdentifier: row.account_identifier ? String(row.account_identifier) : null,
          instructions: row.instructions ? String(row.instructions) : null,
        }));
      setPaymentMethods(normalizedPayments);
      setPaymentMethod(normalizedPayments.length === 1 ? normalizedPayments[0].method : '');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el checkout');
    } finally {
      setLoading(false);
    }
  }, [businessId, profile?.id]);

  useEffect(() => { void loadConfiguration(); }, [loadConfiguration]);
  useEffect(() => { setPaymentReference(''); setPaymentProof(null); }, [paymentMethod]);

  useEffect(() => {
    if (!businessId || !selectedLocationId || !selectedAddressId || subtotal <= 0) {
      setQuote(null);
      return;
    }
    if (selectedAddress?.latitude == null || selectedAddress.longitude == null) {
      setQuote(null);
      setQuoteError('La dirección seleccionada no tiene coordenadas exactas. Corrígela antes de confirmar.');
      return;
    }

    let active = true;
    const calculate = async () => {
      setQuoteLoading(true);
      setQuoteError('');
      try {
        const result = await quoteCustomerDeliveryAction({
          businessId,
          businessAddressId: selectedLocationId,
          deliveryAddressId: selectedAddressId,
          subtotal: Math.round(subtotal),
        });
        if (!active) return;
        if (!result.success) throw new Error(result.error);
        setQuote({
          distanceKm: result.distanceKm,
          durationMinutes: result.durationMinutes,
          deliveryFee: result.deliveryFee,
          serviceFee: result.serviceFee,
          totalAmount: result.totalAmount,
          financialVersion: result.financialVersion,
          routeSource: result.routeSource,
          pickupAddress: result.pickupAddress,
        });
      } catch (cause) {
        if (active) {
          setQuote(null);
          setQuoteError(cause instanceof Error ? cause.message : 'No se pudo calcular el domicilio');
        }
      } finally {
        if (active) setQuoteLoading(false);
      }
    };
    void calculate();
    return () => { active = false; };
  }, [businessId, selectedAddress?.latitude, selectedAddress?.longitude, selectedAddressId, selectedLocationId, subtotal]);

  const validateProof = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) throw new Error('El comprobante debe ser JPG, PNG, WEBP o PDF');
    if (file.size > 5 * 1024 * 1024) throw new Error('El comprobante no puede superar 5 MB');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !businessId || !businessName || items.length === 0) return setError('El carrito no contiene un pedido válido.');
    if (!selectedLocation || !selectedAddress) return setError('Selecciona el local y la dirección de entrega.');
    if (!paymentMethod || !selectedPayment) return setError('Selecciona cómo vas a pagar.');
    if (!quote) return setError(quoteError || 'Espera mientras calculamos el valor definitivo.');
    if (paymentMethod === 'transfer') {
      if (!paymentReference.trim()) return setError('Escribe la referencia de la transferencia.');
      if (!paymentProof) return setError('Adjunta el comprobante de la transferencia.');
      try { validateProof(paymentProof); } catch (cause) { return setError(cause instanceof Error ? cause.message : 'Comprobante inválido'); }
    }

    setPlacing(true);
    setError('');
    try {
      const result = await createCustomerOrderAction({
        businessId,
        businessAddressId: selectedLocation.id,
        deliveryAddressId: selectedAddress.id,
        paymentMethod,
        paymentReference: paymentMethod === 'transfer' ? paymentReference.trim() : undefined,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: Math.round(item.unitPrice),
          customization: item.customization as Record<string, unknown> | undefined,
          specialInstructions: item.customization?.preparationNote,
        })),
        subtotal: Math.round(subtotal),
        taxAmount: 0,
        instructions: instructions.trim(),
      });
      if (!result.success) throw new Error(result.error);

      if (paymentMethod === 'transfer' && paymentProof) {
        const supabase = getBrowserClient();
        const path = `${profile.id}/${result.orderId}/${crypto.randomUUID()}-${safeFileName(paymentProof.name)}`;
        const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, paymentProof, { upsert: false, contentType: paymentProof.type });
        if (uploadError) throw new Error(`El pedido fue creado, pero el comprobante no se pudo subir: ${uploadError.message}`);
        const attached = await attachTransferProofAction({ orderId: result.orderId, proofPath: path });
        if (!attached.success) throw new Error(`El pedido fue creado, pero el comprobante no se pudo asociar: ${attached.error}`);
      }

      setPlaced(true);
      clearCart();
      window.setTimeout(() => router.push(`/cliente/pedidos/${result.orderId}`), 900);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el pedido.');
      setPlacing(false);
    }
  };

  if (isEmpty && !placed) {
    return <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4"><section className="w-full rounded-3xl border border-dashed bg-card p-10 text-center"><h1 className="text-xl font-black">Tu carrito está vacío</h1><Link href="/cliente" className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Explorar negocios</Link></section></main>;
  }

  if (placed) {
    return <main className="flex min-h-screen items-center justify-center px-4"><section className="max-w-md rounded-3xl border bg-card p-10 text-center shadow-sm"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-9 w-9" /></div><h1 className="text-2xl font-black">¡Pedido confirmado!</h1><p className="mt-2 text-sm text-muted-foreground">Abriendo el seguimiento en vivo.</p></section></main>;
  }

  const total = quote?.totalAmount ?? subtotal;

  return (
    <main className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-5">
        <form onSubmit={submit} className="space-y-5 lg:col-span-3">
          <header><p className="text-xs font-black uppercase tracking-[.16em] text-primary">Compra segura</p><h1 className="mt-1 text-3xl font-black">Confirmar pedido</h1><p className="mt-2 text-sm text-muted-foreground">Revisa la dirección, el pago y el valor completo antes de confirmar.</p></header>

          <section className="rounded-3xl border bg-card p-5">
            <div className="mb-4 flex items-start justify-between"><div><h2 className="font-black">Dirección de entrega</h2><p className="text-xs text-muted-foreground">Debe contener coordenadas exactas.</p></div><Link href="/cliente/configuracion/direcciones" className="text-xs font-bold text-primary">Administrar</Link></div>
            {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : addresses.length ? <div className="space-y-2">{addresses.map((address) => { const exact = address.latitude != null && address.longitude != null; return <label key={address.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${selectedAddressId === address.id ? 'border-primary bg-primary/5' : ''} ${!exact ? 'opacity-60' : ''}`}><input type="radio" checked={selectedAddressId === address.id} onChange={() => setSelectedAddressId(address.id)} /><MapPin className="h-5 w-5 text-primary" /><span><strong className="block text-sm">{address.label || 'Dirección'}</strong><span className="text-xs text-muted-foreground">{address.formatted_address || address.street_address}</span></span></label>; })}</div> : <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">Agrega una dirección para continuar.</p>}
          </section>

          <section className="rounded-3xl border bg-card p-5">
            <h2 className="font-black">Local de origen</h2><p className="mb-4 text-xs text-muted-foreground">La tarifa parte de esta ubicación.</p>
            {locations.length ? <div className="space-y-2">{locations.map((location) => <label key={location.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${selectedLocationId === location.id ? 'border-orange-500 bg-orange-50' : ''}`}><input type="radio" checked={selectedLocationId === location.id} onChange={() => setSelectedLocationId(location.id)} /><Store className="h-5 w-5 text-orange-500" /><span><strong className="block text-sm">{location.name}{location.isPrimary ? ' · principal' : ''}</strong><span className="text-xs text-muted-foreground">{location.formattedAddress}</span></span></label>)}</div> : !loading && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">No existe un local operativo con ubicación exacta.</p>}
          </section>

          <section className="rounded-3xl border bg-card p-5">
            <h2 className="font-black">Método de pago</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{paymentMethods.map((method) => { const presentation = PAYMENT_PRESENTATION[method.method]; const Icon = presentation.icon; const selected = paymentMethod === method.method; return <button key={method.method} type="button" onClick={() => setPaymentMethod(method.method)} className={`relative flex min-h-28 items-start gap-3 rounded-2xl border p-4 text-left ${selected ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : ''}`}><span className={`rounded-xl p-2 ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Icon className="h-5 w-5" /></span><span><strong className="block text-sm">{method.displayName}</strong><span className="mt-1 block text-xs text-muted-foreground">{presentation.description}</span></span>{selected && <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />}</button>; })}</div>
            {paymentMethod === 'transfer' && selectedPayment && <div className="mt-4 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div><p className="text-[10px] font-black uppercase text-muted-foreground">Transferir a</p><p className="mt-1 font-black">{selectedPayment.provider}</p><p className="text-sm">Titular: {selectedPayment.accountHolder}</p><p className="text-sm">Identificador: <strong>{selectedPayment.accountIdentifier}</strong></p>{selectedPayment.instructions && <p className="mt-2 text-xs text-muted-foreground">{selectedPayment.instructions}</p>}</div><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Referencia de la transferencia" className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /><label className="block cursor-pointer rounded-xl border border-dashed bg-background p-4"><div className="flex items-center gap-3"><Paperclip className="h-5 w-5" /><div className="min-w-0"><p className="text-sm font-bold">Adjuntar comprobante</p><p className="truncate text-xs text-muted-foreground">{paymentProof ? paymentProof.name : 'JPG, PNG, WEBP o PDF · máximo 5 MB'}</p></div>{paymentProof && <FileCheck2 className="ml-auto h-5 w-5 text-success" />}</div><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] || null; if (!file) return setPaymentProof(null); try { validateProof(file); setPaymentProof(file); setError(''); } catch (cause) { setPaymentProof(null); setError(cause instanceof Error ? cause.message : 'Archivo inválido'); } }} /></label></div>}
          </section>

          <section className="rounded-3xl border bg-card p-5"><h2 className="font-black">Instrucciones de entrega</h2><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={4} placeholder="Ejemplo: llamar al llegar o entregar en portería." className="mt-3 w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm outline-none" /></section>

          {quoteLoading && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Calculando ruta, domicilio y tarifa de servicio…</p>}
          {quoteError && <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{quoteError}</p>}
          {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={placing || quoteLoading || !quote || !paymentMethod || !selectedLocationId} className="w-full rounded-2xl bg-primary py-4 font-black text-primary-foreground disabled:opacity-50">{placing ? 'Confirmando pedido…' : `Confirmar pedido — ${formatCOP(total)}`}</button>
        </form>

        <aside className="h-fit rounded-3xl border bg-card p-5 shadow-sm lg:sticky lg:top-20 lg:col-span-2">
          <h2 className="font-black">Resumen del pedido</h2><p className="mb-4 text-sm text-muted-foreground">{businessName}</p>
          <div className="space-y-4">{items.map((item) => <article key={item.id} className="border-b pb-4 last:border-0"><div className="flex justify-between gap-3"><span className="font-medium">{item.quantity}x {item.product.name}</span><span className="font-bold">{formatCOP(item.unitPrice * item.quantity)}</span></div>{customizationSummary(item.customization).map((row) => <p key={row} className="mt-1 text-xs text-muted-foreground">{row}</p>)}</article>)}</div>
          <div className="mt-4 space-y-3 border-t pt-4 text-sm"><div className="flex justify-between"><span>Productos</span><span>{formatCOP(subtotal)}</span></div><div className="flex justify-between"><span>Domicilio</span><span>{quote ? formatCOP(quote.deliveryFee) : 'Por calcular'}</span></div><div className="flex justify-between"><span className="inline-flex items-center gap-1">Tarifa de servicio DomiU <Info className="h-3.5 w-3.5 text-muted-foreground" /></span><span>{quote ? formatCOP(quote.serviceFee) : 'Por calcular'}</span></div><div className="flex justify-between"><span>Pago</span><span>{paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'transfer' ? 'Transferencia' : 'Sin seleccionar'}</span></div></div>
          {quote && <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3 text-xs"><div className="flex items-center gap-2"><Route className="h-4 w-4 text-primary" />{quote.distanceKm.toFixed(2)} km</div><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" />aprox. {quote.durationMinutes} min</div><p className="col-span-2 text-[10px] text-muted-foreground">Ruta verificada: {quote.routeSource}</p></div>}
          <div className="mt-4 flex justify-between border-t pt-4 text-xl font-black"><span>Total</span><span>{formatCOP(total)}</span></div>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>El total mostrado incluye todos los cargos calculados antes de confirmar.</span></div>
        </aside>
      </div>
    </main>
  );
}
