'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, ArrowLeft, Mail, Phone, Shield, Lock, X, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getBusinessFullDetail, generatePasswordResetLinkAction, setUserPasswordAction, reassignBusinessOwnerAction, searchProfilesAction } from '@/app/actions/admin-business';

export default function BusinessUsuariosPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [owner, setOwner] = useState<any>(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState<'link' | 'password'>('link');
  const [tempPassword, setTempPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [associating, setAssociating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await getBusinessFullDetail(id);
        if (d) {
          setBusinessName(d.business.name);
          setOwner(d.owner);
        }
      } catch { toast.error('Error al cargar'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleResetAccess = useCallback(async () => {
    if (!owner?.email) { toast.error('El propietario no tiene email'); return; }
    setResetting(true);
    try {
      if (resetType === 'link') {
        const r = await generatePasswordResetLinkAction(owner.email);
        if (r.error) { toast.error(r.error); return; }
        toast.success('Link de restablecimiento generado. Se ha registrado en la auditoría.');
      } else {
        if (!tempPassword || tempPassword.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); setResetting(false); return; }
        const r = await setUserPasswordAction(owner.id, tempPassword);
        if (r.error) { toast.error(r.error); return; }
        toast.success(`Contraseña restablecida. Nueva contraseña: ${tempPassword}`);
      }
      setShowResetModal(false);
      setTempPassword('');
    } catch { toast.error('Error al restablecer acceso'); }
    setResetting(false);
  }, [owner, resetType, tempPassword]);

  const handleSearch = useCallback(async (term: string) => {
    if (term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const r = await searchProfilesAction(term);
    if (r.success) setSearchResults(r.data);
    else toast.error(r.error);
    setSearching(false);
  }, []);

  const handleAssociate = useCallback(async (newOwnerId: string) => {
    setAssociating(true);
    const r = await reassignBusinessOwnerAction(id, newOwnerId);
    if (r.success) {
      toast.success('Propietario reasignado exitosamente');
      setShowAssociateModal(false);
      setSearchTerm('');
      setSearchResults([]);
      const d = await getBusinessFullDetail(id);
      if (d) setOwner(d.owner);
    } else toast.error(r.error);
    setAssociating(false);
  }, [id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/admin/negocios/${id}`)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/50">
          <User className="h-5 w-5 text-success" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">{businessName}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Propietario / Responsable</h3>
        {owner ? (
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/15 text-success text-lg font-bold">
              {((owner.first_name || '')[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-base font-medium text-foreground">
                {[owner.first_name, owner.last_name].filter(Boolean).join(' ') || 'Sin nombre'}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {owner.email}</span>
                {owner.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {owner.phone}</span>}
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Rol: {owner.role}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${owner.status === 'active' ? 'bg-success/15 text-success' : 'bg-warning/20 text-warning'}`}>
                  {owner.status}
                </span>
              </div>
            </div>
            <button onClick={() => setShowResetModal(true)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs text-foreground/80 hover:text-foreground transition-colors">
              <Lock className="h-3.5 w-3.5 inline mr-1" /> Resetear acceso
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin propietario asignado</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gestión de Acceso</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          El propietario actual tiene acceso al panel de negocio con su cuenta existente. Para crear usuarios adicionales o modificar accesos, usa las siguientes opciones:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button onClick={() => router.push(`/admin/usuarios`)} className="rounded-lg border border-border bg-card p-4 text-left hover:border-success/30 transition-all group">
            <p className="text-sm font-medium text-foreground group-hover:text-success">Ir a Usuarios</p>
            <p className="text-xs text-muted-foreground mt-1">Administrar usuarios desde el panel general</p>
          </button>
          <button onClick={() => setShowAssociateModal(true)} className="rounded-lg border border-border bg-card p-4 text-left hover:border-success/30 transition-all group">
            <p className="text-sm font-medium text-foreground group-hover:text-success">Asociar usuario existente</p>
            <p className="text-xs text-muted-foreground mt-1">Vincular un usuario ya registrado al local</p>
          </button>
          <button onClick={() => { setResetType('password'); setTempPassword(Math.random().toString(36).slice(2, 10)); setShowResetModal(true); }} className="rounded-lg border border-border bg-card p-4 text-left hover:border-success/30 transition-all group">
            <p className="text-sm font-medium text-foreground group-hover:text-success">Restablecer contraseña</p>
            <p className="text-xs text-muted-foreground mt-1">Generar nueva contraseña temporal para el propietario</p>
          </button>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowResetModal(false)}>
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">
                {resetType === 'link' ? 'Resetear acceso' : 'Restablecer contraseña'}
              </h3>
              <button onClick={() => setShowResetModal(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {resetType === 'link'
                ? `Se generará un link de recuperación para ${owner?.email}.`
                : `Se asignará una nueva contraseña a ${owner?.email}.`}
            </p>
            {resetType === 'password' && (
              <div className="mb-4">
                <label className="mb-1 block text-xs text-muted-foreground">Nueva contraseña</label>
                <input value={tempPassword} onChange={e => setTempPassword(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground font-mono" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowResetModal(false)} className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleResetAccess} disabled={resetting} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
                {resetting ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : resetType === 'link' ? 'Generar link' : 'Restablecer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssociateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAssociateModal(false)}>
          <div className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Asociar usuario existente</h3>
              <button onClick={() => setShowAssociateModal(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); handleSearch(e.target.value); }} placeholder="Buscar por email o nombre..." className="h-10 w-full rounded-xl border border-border bg-background/50 pl-9 pr-3 text-sm text-foreground" />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searching && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
              {!searching && searchResults.length === 0 && searchTerm.length >= 2 && (
                <p className="text-center text-xs text-muted-foreground py-4">No se encontraron usuarios</p>
              )}
              {searchResults.map((u: any) => (
                <button key={u.id} onClick={() => handleAssociate(u.id)} disabled={associating} className="w-full flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3 text-left hover:border-primary/30 transition-all disabled:opacity-50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Sin nombre'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {associating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <p className="text-xs font-semibold text-primary">Asignar</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
