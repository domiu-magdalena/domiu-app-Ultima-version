'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CourierProvider, useCourier } from '@/contexts/CourierContext';
import { courierProService, getCourierLevel } from '@/services/courier-pro';
import { reviewService } from '@/services/reviews';
import { getBrowserClient } from '@/lib/db/supabase';
import { LoadingState } from '@/components/ui/loading-state';
import { User, Star, Bike, Shield, Award, Calendar, Phone, Mail, Clock } from 'lucide-react';

const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

function PerfilContent() {
  const { profile } = useAuth();
  const { courier, loading, monthEarnings, totalEarnings } = useCourier();
  const [reviews, setReviews] = useState<{ id: string; author_name: string; rating: number; review: string | null; created_at: string }[]>([]);
  const [stats, setStats] = useState<{ avg_rating: number; total_ratings: number; total_deliveries: number } | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ type: 'motorcycle', plate: '', model: '' });
  const [docForm, setDocForm] = useState({ licenseNumber: '', licenseExpiry: '' });
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingDocs, setSavingDocs] = useState(false);

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const [revs, st, supabase] = await Promise.all([
        reviewService.getCourierReviews(profile.id),
        reviewService.getCourierStats(profile.id),
        getBrowserClient(),
      ]);
      setReviews(revs);
      setStats(st);
      const { data: driver } = await supabase.from('drivers').select('vehicle_type, vehicle_plate, vehicle_model, license_number, license_expiry').eq('id', profile.id).single();
      if (driver) {
        setVehicleForm({ type: driver.vehicle_type || 'motorcycle', plate: driver.vehicle_plate || '', model: driver.vehicle_model || '' });
        setDocForm({ licenseNumber: driver.license_number || '', licenseExpiry: driver.license_expiry || '' });
      }
    })();
  }, [profile?.id]);

  const handleSaveVehicle = async () => {
    if (!profile?.id) return;
    setSavingVehicle(true);
    await courierProService.updateVehicle(profile.id, vehicleForm);
    setSavingVehicle(false);
  };

  const handleSaveDocs = async () => {
    if (!profile?.id) return;
    setSavingDocs(true);
    await courierProService.updateDocuments(profile.id, docForm);
    setSavingDocs(false);
  };

  if (loading) return <LoadingState />;

  const level = courier ? getCourierLevel(courier.total_deliveries) : null;
  const avgRating = stats?.avg_rating || courier?.rating || 0;

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-warning/5 p-6 shadow-card overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-warning/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-warning to-orange-500 text-2xl font-bold text-white shadow-xl shadow-warning/20">
            {profile?.first_name?.[0] || profile?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            {profile?.first_name || ''} {profile?.last_name || ''}
          </h2>
          <div className="flex items-center gap-1 mt-1">
            <Bike className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Repartidor Pro</span>
          </div>
          {level && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-3 py-1">
              <span>{level.icon}</span>
              <span className="text-[10px] font-semibold text-foreground">Nivel {level.level} — {level.title}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Rating', value: avgRating.toFixed(1), icon: Star, color: 'text-warning', sub: `${stats?.total_ratings || 0} calificaciones` },
          { label: 'Entregas', value: String(stats?.total_deliveries || courier?.total_deliveries || 0), icon: Award, color: 'text-primary', sub: 'completadas' },
          { label: 'Mes', value: formatCurrency(monthEarnings), icon: Clock, color: 'text-success', sub: 'este mes' },
          { label: 'Total', value: formatCurrency(totalEarnings), icon: Calendar, color: 'text-info', sub: 'histórico' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-3 shadow-card">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`h-3 w-3 ${s.color}`} />
              <span className="text-[9px] font-medium text-muted-foreground uppercase">{s.label}</span>
            </div>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 shadow-card">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Información Personal</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Nombre', value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || '—', icon: User },
            { label: 'Email', value: profile?.email || '—', icon: Mail },
            { label: 'Teléfono', value: profile?.phone || '—', icon: Phone },
            { label: 'Rol', value: 'Repartidor', icon: Shield },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl bg-background/30 px-3 py-2.5">
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className="text-xs font-medium text-foreground truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 shadow-card">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Vehículo</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">Tipo</label>
            <select value={vehicleForm.type} onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground">
              <option value="motorcycle">Motocicleta</option>
              <option value="bike">Bicicleta</option>
              <option value="car">Carro</option>
              <option value="van">Camioneta</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">Placa</label>
            <input value={vehicleForm.plate} onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })} placeholder="ABC-123" maxLength={10} className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground uppercase" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">Modelo</label>
            <input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="Ej: Honda CB 190" className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground" />
          </div>
        </div>
        <button onClick={handleSaveVehicle} disabled={savingVehicle} className="mt-3 rounded-xl bg-gradient-to-r from-warning to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-warning/20 transition-all hover:shadow-xl disabled:opacity-50">
          {savingVehicle ? 'Guardando...' : 'Guardar Vehículo'}
        </button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 shadow-card">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Documentos y Licencia</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">Número de Licencia</label>
            <input value={docForm.licenseNumber} onChange={(e) => setDocForm({ ...docForm, licenseNumber: e.target.value })} placeholder="Ingresa tu número de licencia" className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">Vencimiento</label>
            <input value={docForm.licenseExpiry} onChange={(e) => setDocForm({ ...docForm, licenseExpiry: e.target.value })} type="date" className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-xs text-foreground" />
          </div>
        </div>
        <button onClick={handleSaveDocs} disabled={savingDocs} className="mt-3 rounded-xl bg-gradient-to-r from-info to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-info/20 transition-all hover:shadow-xl disabled:opacity-50">
          {savingDocs ? 'Guardando...' : 'Guardar Documentos'}
        </button>
      </div>

      {reviews.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Calificaciones Recibidas</h3>
            <span className="text-[10px] text-muted-foreground">{reviews.length} reseñas</span>
          </div>
          <div className="space-y-3">
            {reviews.slice(0, 5).map((r) => (
              <div key={r.id} className="rounded-xl border border-border/30 bg-background/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                      {r.author_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{r.author_name}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString('es-CO')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
                {r.review && <p className="mt-2 text-[10px] text-muted-foreground">{r.review}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RepartidorPerfil() {
  const { profile } = useAuth();
  return (
    <CourierProvider courierId={profile?.id}>
      <PerfilContent />
    </CourierProvider>
  );
}
