'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Home, LocateFixed, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { MapsProvider } from '@/contexts/MapsContext';
import { addressService, type DeliveryAddress } from '@/services/addresses';
import { getCurrentExactLocation, isCoordinateFallback } from '@/lib/maps/geolocation';
import { SkeletonCard } from '@/components/ui/skeleton';
import { LocationMapPicker } from '@/components/tracking/maps/LocationMapPicker';

const PlacesAutocomplete = dynamic(
  () => import('@/components/tracking/maps/PlacesAutocomplete').then((module) => module.PlacesAutocomplete),
  { ssr: false, loading: () => <SkeletonCard /> },
);

type AddressForm = {
  type: string;
  label: string;
  streetAddress: string;
  formattedAddress: string;
  placeId: string;
  city: string;
  state: string;
  neighborhood: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isPrimary: boolean;
  instructions: string;
};

const EMPTY_FORM: AddressForm = {
  type: 'home',
  label: 'Casa',
  streetAddress: '',
  formattedAddress: '',
  placeId: '',
  city: 'Santa Marta',
  state: 'Magdalena',
  neighborhood: '',
  postalCode: '',
  country: 'Colombia',
  latitude: null,
  longitude: null,
  accuracy: null,
  isPrimary: true,
  instructions: '',
};

function AddressSettingsContent() {
  const { profile } = useAuth();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      setAddresses(await addressService.list(profile.id));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudieron cargar las direcciones');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditingId(undefined);
    setForm({ ...EMPTY_FORM, isPrimary: addresses.length === 0 });
    setShowForm(true);
  };

  const edit = (address: DeliveryAddress) => {
    setEditingId(address.id);
    setForm({
      type: address.type,
      label: address.label || 'Dirección',
      streetAddress: address.street_address,
      formattedAddress: address.formatted_address || address.street_address,
      placeId: address.place_id || '',
      city: address.city,
      state: address.state_province || 'Magdalena',
      neighborhood: address.neighborhood || '',
      postalCode: address.postal_code || '',
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      accuracy: address.location_accuracy_meters,
      isPrimary: address.is_primary,
      instructions: address.instructions || '',
    });
    setShowForm(true);
  };

  const shareLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const location = await getCurrentExactLocation();
      setForm((current) => ({
        ...current,
        streetAddress:
          isCoordinateFallback(location.formattedAddress) && current.streetAddress.trim()
            ? current.streetAddress
            : location.formattedAddress,
        formattedAddress:
          isCoordinateFallback(location.formattedAddress) && current.formattedAddress.trim()
            ? current.formattedAddress
            : location.formattedAddress,
        placeId: '',
        city: location.city || current.city,
        state: location.state || current.state,
        postalCode: location.postalCode || current.postalCode,
        country: location.country || current.country,
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
      }));
      toast.success('GPS capturado. Ajusta el marcador sobre la entrada exacta.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo obtener la ubicación');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!profile?.id || saving) return;
    if (!form.streetAddress.trim() || !form.city.trim()) {
      toast.error('Escribe una dirección válida');
      return;
    }
    if (form.latitude == null || form.longitude == null) {
      toast.error('Selecciona una dirección o comparte tu GPS para guardar las coordenadas exactas');
      return;
    }

    setSaving(true);
    try {
      await addressService.save(
        profile.id,
        {
          type: form.type,
          label: form.label,
          streetAddress: form.streetAddress,
          formattedAddress: form.formattedAddress || form.streetAddress,
          placeId: form.placeId,
          city: form.city,
          state: form.state,
          neighborhood: form.neighborhood,
          postalCode: form.postalCode,
          country: form.country,
          latitude: form.latitude,
          longitude: form.longitude,
          accuracy: form.accuracy ?? undefined,
          isPrimary: form.isPrimary,
          instructions: form.instructions,
        },
        editingId,
      );
      setShowForm(false);
      setEditingId(undefined);
      setForm({ ...EMPTY_FORM });
      toast.success('Dirección exacta guardada permanentemente');
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo guardar la dirección');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (address: DeliveryAddress) => {
    if (!profile?.id) return;
    try {
      await addressService.remove(profile.id, address.id);
      await load();
      toast.success('Dirección eliminada');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo eliminar');
    }
  };

  const setAsPrimary = async (address: DeliveryAddress) => {
    if (!profile?.id || address.is_primary) return;
    try {
      await addressService.setPrimary(profile.id, address.id);
      await load();
      toast.success('Dirección principal actualizada');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo actualizar la dirección principal');
    }
  };

  return (
    <main className="space-y-5 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Direcciones y ubicación</h1>
          <p className="text-sm text-muted-foreground">Guarda cada punto exacto para calcular correctamente rutas, tarifas y entregas.</p>
        </div>
        <button type="button" onClick={openNew} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> Nueva
        </button>
      </header>

      {showForm && (
        <section className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{editingId ? 'Editar dirección' : 'Nueva dirección'}</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
          <button type="button" onClick={() => void shareLocation()} disabled={locating} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-60">
            <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
            {locating ? 'Obteniendo coordenadas exactas…' : 'Compartir mi ubicación actual'}
          </button>
          <div className="relative my-4 text-center text-xs text-muted-foreground before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t"><span className="relative bg-card px-3">buscar con Google Maps</span></div>
          <div className="space-y-3">
            <PlacesAutocomplete
              defaultValue={form.streetAddress}
              placeholder="Escribe calle, carrera, edificio o barrio"
              onValueChange={(streetAddress) =>
                setForm((current) =>
                  streetAddress === current.streetAddress
                    ? current
                    : {
                        ...current,
                        streetAddress,
                        formattedAddress: streetAddress,
                        placeId: '',
                        latitude: null,
                        longitude: null,
                        accuracy: null,
                      },
                )
              }
              onPlaceSelected={(place) =>
                setForm((current) => ({
                  ...current,
                  streetAddress: place.formattedAddress,
                  formattedAddress: place.formattedAddress,
                  placeId: place.placeId || '',
                  city: place.city || current.city,
                  state: place.state || current.state,
                  neighborhood: place.neighborhood || current.neighborhood,
                  postalCode: place.postalCode || current.postalCode,
                  country: place.country || current.country,
                  latitude: place.lat,
                  longitude: place.lng,
                  accuracy: null,
                }))
              }
            />

            <LocationMapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              label={form.label || 'Dirección de entrega'}
              onLocationChange={(location) =>
                setForm((current) => ({
                  ...current,
                  latitude: location.lat,
                  longitude: location.lng,
                  streetAddress: location.formattedAddress || current.streetAddress,
                  formattedAddress: location.formattedAddress || current.formattedAddress,
                  placeId: location.placeId || current.placeId,
                  city: location.city || current.city,
                  state: location.state || current.state,
                  neighborhood: location.neighborhood || current.neighborhood,
                  country: location.country || current.country,
                  postalCode: location.postalCode || current.postalCode,
                  accuracy: null,
                }))
              }
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Nombre: Casa, Trabajo…" className="rounded-xl border bg-background px-3 py-2.5 text-sm" />
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="rounded-xl border bg-background px-3 py-2.5 text-sm"><option value="home">Casa</option><option value="work">Trabajo</option><option value="other">Otra</option></select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Ciudad" className="rounded-xl border bg-background px-3 py-2.5 text-sm" />
              <input value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} placeholder="Departamento" className="rounded-xl border bg-background px-3 py-2.5 text-sm" />
            </div>
            <input value={form.neighborhood} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="Barrio o sector" className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
            <textarea value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Apartamento, torre, referencia, color de la casa o indicaciones" className="min-h-20 w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPrimary} onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))} /> Usar como dirección principal</label>
            <div className={`rounded-xl p-3 text-xs font-semibold ${form.latitude != null ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{form.latitude != null ? `Coordenadas confirmadas: ${form.latitude.toFixed(6)}, ${form.longitude?.toFixed(6)}` : 'Busca la dirección o comparte tu GPS para confirmar las coordenadas.'}</div>
            <button type="button" onClick={() => void save()} disabled={saving || locating} className="w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-60">{saving ? 'Guardando y verificando…' : 'Guardar dirección exacta'}</button>
          </div>
        </section>
      )}

      {loading ? <SkeletonCard /> : addresses.length === 0 ? (
        <section className="rounded-3xl border border-dashed p-10 text-center"><MapPin className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-bold">No tienes direcciones guardadas</p><button type="button" onClick={openNew} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Agregar mi primera dirección</button></section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <article key={address.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Home className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="font-bold">{address.label || 'Dirección'}</h2>{address.is_primary && <Star className="h-4 w-4 fill-primary text-primary" />}</div><p className="mt-1 text-sm text-muted-foreground">{address.formatted_address || address.street_address}</p>{address.neighborhood && <p className="mt-1 text-xs text-muted-foreground">{address.neighborhood}</p>}<p className={`mt-2 text-xs font-semibold ${address.latitude != null ? 'text-success' : 'text-warning'}`}>{address.latitude != null ? 'Ubicación exacta guardada' : 'Faltan coordenadas'}</p></div></div>
              <div className="mt-4 flex gap-2 border-t pt-3"><button type="button" onClick={() => edit(address)} className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold"><Pencil className="h-3 w-3" /> Editar</button>{!address.is_primary && <button type="button" onClick={() => void setAsPrimary(address)} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold">Principal</button>}<button type="button" onClick={() => void remove(address)} className="ml-auto rounded-lg bg-destructive/10 p-2 text-destructive"><Trash2 className="h-4 w-4" /></button></div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default function CustomerAddressSettingsPage() {
  return <MapsProvider><AddressSettingsContent /></MapsProvider>;
}
