'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Bell,
  Eye,
  History,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminCouriersAction,
  getCourierAdminHistoryAction,
  sendCourierAdminNotificationAction,
  setCourierAdminStatusAction,
  softDeleteCourierAdminAction,
  updateCourierAdminAction,
  verifyCourierAdminAction,
} from '@/app/actions/admin-couriers';

type CourierRow = any;

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  busy: 'Ocupado',
  offline: 'Offline',
  on_break: 'En descanso',
  suspended: 'Suspendido',
};

function statusClass(status: string) {
  if (status === 'available') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (status === 'busy') return 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30';
  if (status === 'suspended') return 'bg-red-500/15 text-red-700 border-red-500/30';
  return 'bg-slate-500/15 text-slate-700 border-slate-500/30';
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold text-foreground">{value || '—'}</div>
    </div>
  );
}

export default function AdminRepartidoresPage() {
  const [rows, setRows] = useState<CourierRow[]>([]);
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [detail, setDetail] = useState<CourierRow | null>(null);
  const [edit, setEdit] = useState<CourierRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CourierRow | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<CourierRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<CourierRow | null>(null);

  const [deleteText, setDeleteText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [history, setHistory] = useState<any | null>(null);

  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);

    const res: any = await getAdminCouriersAction(search, includeDeleted);

    if (res.error) {
      toast.error(res.error);
    }

    setRows(res.data || []);
    setLoading(false);
  }, [search, includeDeleted]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      verified: rows.filter(r => r.is_verified).length,
      active: rows.filter(r => r.is_active && !r.deleted_at).length,
      deleted: rows.filter(r => r.deleted_at).length,
    };
  }, [rows]);

  const runAction = async (id: string, action: () => Promise<any>, success: string) => {
    setProcessingId(id);

    try {
      const res: any = await action();

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(success);
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Error ejecutando acción');
    } finally {
      setProcessingId(null);
    }
  };

  const openEdit = (row: CourierRow) => {
    setEdit(row);
    setForm({
      first_name: row.profile?.first_name || '',
      last_name: row.profile?.last_name || '',
      phone: row.profile?.phone || '',
      license_number: row.driver?.license_number || '',
      vehicle_type: row.driver?.vehicle_type || '',
      vehicle_plate: row.driver?.vehicle_plate || '',
      vehicle_model: row.driver?.vehicle_model || '',
      status: row.driver?.status || 'offline',
      is_verified: !!row.driver?.is_verified,
      is_active: row.driver?.is_active !== false,
      is_available: !!row.driver?.is_available,
    });
  };

  const openHistory = async (row: CourierRow) => {
    setHistoryTarget(row);
    setHistory(null);

    const res: any = await getCourierAdminHistoryAction(row.user_id);

    if (res.error) {
      toast.error(res.error);
    }

    setHistory(res);
  };

  const saveEdit = async () => {
    if (!edit) return;

    await runAction(
      edit.user_id,
      () => updateCourierAdminAction(edit.user_id, form),
      'Repartidor actualizado',
    );

    setEdit(null);
  };

  const deleteCourier = async () => {
    if (!removeTarget) return;

    if (deleteText !== 'ELIMINAR') {
      toast.error('Debes escribir ELIMINAR para confirmar');
      return;
    }

    if (!deleteReason.trim()) {
      toast.error('Debes indicar un motivo');
      return;
    }

    await runAction(
      removeTarget.user_id,
      () => softDeleteCourierAdminAction(removeTarget.user_id, deleteReason),
      'Repartidor eliminado de forma segura',
    );

    setRemoveTarget(null);
    setDeleteText('');
    setDeleteReason('');
  };

  const sendNotification = async () => {
    if (!notifyTarget) return;

    await runAction(
      notifyTarget.user_id,
      () => sendCourierAdminNotificationAction(notifyTarget.user_id, notifyTitle, notifyMessage),
      'Notificación enviada',
    );

    setNotifyTarget(null);
    setNotifyTitle('');
    setNotifyMessage('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Repartidores</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Administra, verifica, edita, suspende y elimina repartidores de forma segura.
            </p>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
            Actualizar
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <InfoBox label="Total" value={stats.total} />
          <InfoBox label="Verificados" value={stats.verified} />
          <InfoBox label="Activos" value={stats.active} />
          <InfoBox label="Eliminados" value={stats.deleted} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo, teléfono, placa, licencia..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={e => setIncludeDeleted(e.target.checked)}
            />
            Mostrar eliminados
          </label>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando repartidores...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No hay repartidores para mostrar.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map(row => (
            <article
              key={row.user_id}
              className={'rounded-2xl border bg-card p-5 shadow-sm ' + (row.deleted_at ? 'border-red-300 opacity-70' : 'border-border')}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{row.name}</h2>

                  <span className={'rounded-full border px-2 py-0.5 text-xs font-semibold ' + statusClass(row.status)}>
                    {statusLabels[row.status] || row.status}
                  </span>

                  {row.is_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="h-3 w-3" />
                      Verificado
                    </span>
                  ) : (
                    <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                      Sin verificar
                    </span>
                  )}

                  {row.deleted_at && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Eliminado
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-muted-foreground">{row.email}</p>
                <p className="text-sm text-muted-foreground">{row.phone || 'Sin teléfono'}</p>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p><strong>Vehículo:</strong> {row.vehicle_type || '—'}</p>
                  <p><strong>Placa:</strong> {row.vehicle_plate || '—'}</p>
                  <p><strong>Modelo:</strong> {row.vehicle_model || '—'}</p>
                  <p><strong>Licencia:</strong> {row.license_number || '—'}</p>
                  <p><strong>Entregas:</strong> {row.completed_deliveries}/{row.total_deliveries}</p>
                  <p><strong>Rating:</strong> {Number(row.rating || 0).toFixed(1)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button onClick={() => setDetail(row)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                  <Eye className="mr-1 inline h-4 w-4" /> Ver
                </button>

                <button onClick={() => openEdit(row)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                  <Pencil className="mr-1 inline h-4 w-4" /> Editar
                </button>

                <button onClick={() => openHistory(row)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                  <History className="mr-1 inline h-4 w-4" /> Historial
                </button>

                <button
                  onClick={() => {
                    setNotifyTarget(row);
                    setNotifyTitle('Mensaje de DomiU');
                    setNotifyMessage('');
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                >
                  <Bell className="mr-1 inline h-4 w-4" /> Notificar
                </button>

                {!row.is_verified && !row.deleted_at && (
                  <button
                    disabled={processingId === row.user_id}
                    onClick={() => runAction(row.user_id, () => verifyCourierAdminAction(row.user_id), 'Repartidor verificado')}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <ShieldCheck className="mr-1 inline h-4 w-4" /> Verificar
                  </button>
                )}

                {!row.deleted_at && (
                  <>
                    <button
                      disabled={processingId === row.user_id}
                      onClick={() => runAction(row.user_id, () => setCourierAdminStatusAction(row.user_id, 'available'), 'Repartidor disponible')}
                      className="rounded-xl border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      Disponible
                    </button>

                    <button
                      disabled={processingId === row.user_id}
                      onClick={() => runAction(row.user_id, () => setCourierAdminStatusAction(row.user_id, 'offline'), 'Repartidor offline')}
                      className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                    >
                      Offline
                    </button>

                    <button
                      disabled={processingId === row.user_id}
                      onClick={() => runAction(row.user_id, () => setCourierAdminStatusAction(row.user_id, 'suspended'), 'Repartidor suspendido')}
                      className="rounded-xl border border-yellow-500/40 px-3 py-2 text-sm font-semibold text-yellow-700 hover:bg-yellow-50 disabled:opacity-60"
                    >
                      <UserX className="mr-1 inline h-4 w-4" /> Suspender
                    </button>

                    <button
                      onClick={() => setRemoveTarget(row)}
                      className="rounded-xl border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-1 inline h-4 w-4" /> Eliminar
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {detail && (
        <Modal title="Detalle del repartidor" onClose={() => setDetail(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBox label="Nombre" value={detail.name} />
            <InfoBox label="Correo" value={detail.email} />
            <InfoBox label="Teléfono" value={detail.phone} />
            <InfoBox label="Rol" value={detail.profile?.role} />
            <InfoBox label="Estado" value={statusLabels[detail.status] || detail.status} />
            <InfoBox label="Verificado" value={detail.is_verified ? 'Sí' : 'No'} />
            <InfoBox label="Activo" value={detail.is_active ? 'Sí' : 'No'} />
            <InfoBox label="Disponible" value={detail.is_available ? 'Sí' : 'No'} />
            <InfoBox label="Vehículo" value={detail.vehicle_type} />
            <InfoBox label="Placa" value={detail.vehicle_plate} />
            <InfoBox label="Modelo" value={detail.vehicle_model} />
            <InfoBox label="Licencia" value={detail.license_number} />
            <InfoBox label="Entregas completadas" value={detail.completed_deliveries} />
            <InfoBox label="Total entregas" value={detail.total_deliveries} />
          </div>
        </Modal>
      )}

      {edit && (
        <Modal title="Editar repartidor" onClose={() => setEdit(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['first_name', 'Nombre'],
              ['last_name', 'Apellido'],
              ['phone', 'Teléfono'],
              ['license_number', 'Licencia'],
              ['vehicle_type', 'Tipo de vehículo'],
              ['vehicle_plate', 'Placa'],
              ['vehicle_model', 'Modelo'],
            ].map(([key, label]) => (
              <label key={key} className="text-sm font-medium text-foreground">
                {label}
                <input
                  value={form[key] || ''}
                  onChange={e => setForm((prev: any) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </label>
            ))}

            <label className="text-sm font-medium text-foreground">
              Estado
              <select
                value={form.status || 'offline'}
                onChange={e => setForm((prev: any) => ({ ...prev, status: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="available">Disponible</option>
                <option value="busy">Ocupado</option>
                <option value="offline">Offline</option>
                <option value="on_break">En descanso</option>
                <option value="suspended">Suspendido</option>
              </select>
            </label>

            <div className="rounded-xl border border-border p-3">
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_verified} onChange={e => setForm((p: any) => ({ ...p, is_verified: e.target.checked }))} />
                Verificado
              </label>
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_active} onChange={e => setForm((p: any) => ({ ...p, is_active: e.target.checked }))} />
                Activo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_available} onChange={e => setForm((p: any) => ({ ...p, is_available: e.target.checked }))} />
                Disponible
              </label>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button onClick={saveEdit} className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Guardar cambios
            </button>
            <button onClick={() => setEdit(null)} className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-bold">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {removeTarget && (
        <Modal title="Eliminar repartidor" onClose={() => setRemoveTarget(null)}>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
            Esta acción desactiva el repartidor de forma segura. No borra pedidos, historial ni ganancias.
          </div>

          <label className="mt-4 block text-sm font-medium">
            Motivo de eliminación
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              placeholder="Ejemplo: documentos inválidos, solicitud duplicada, baja voluntaria..."
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Escribe ELIMINAR para confirmar
            <input
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-red-300 bg-background px-3 text-center text-sm font-bold outline-none"
              placeholder="ELIMINAR"
            />
          </label>

          <div className="mt-5 flex gap-2">
            <button onClick={deleteCourier} className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">
              Confirmar eliminación
            </button>
            <button onClick={() => setRemoveTarget(null)} className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-bold">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {notifyTarget && (
        <Modal title="Enviar notificación" onClose={() => setNotifyTarget(null)}>
          <label className="block text-sm font-medium">
            Título
            <input
              value={notifyTitle}
              onChange={e => setNotifyTitle(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Mensaje
            <textarea
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              placeholder="Escribe el mensaje para el repartidor..."
            />
          </label>

          <div className="mt-5 flex gap-2">
            <button onClick={sendNotification} className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Enviar
            </button>
            <button onClick={() => setNotifyTarget(null)} className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-bold">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {historyTarget && (
        <Modal title="Historial del repartidor" onClose={() => { setHistoryTarget(null); setHistory(null); }}>
          {!history ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando historial...
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 font-bold">Pedidos recientes</h3>
                {(history.orders || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin pedidos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {history.orders.map((order: any) => (
                      <div key={order.id} className="rounded-xl border border-border p-3 text-sm">
                        <strong>{order.order_number || order.id.slice(0, 8)}</strong>
                        {' — '}
                        {order.status}
                        {' — '}
                        {'$' + Number(order.total_amount || 0).toLocaleString('es-CO')}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-bold">Ganancias recientes</h3>
                {(history.earnings || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin ganancias registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {history.earnings.map((earning: any) => (
                      <div key={earning.id} className="rounded-xl border border-border p-3 text-sm">
                        {'$' + Number(earning.total_earned || 0).toLocaleString('es-CO')}
                        {' — '}
                        {earning.status}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-bold">Incidentes</h3>
                {(history.incidents || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin incidentes registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {history.incidents.map((incident: any) => (
                      <div key={incident.id} className="rounded-xl border border-border p-3 text-sm">
                        <strong>{incident.incident_type}</strong> — {incident.severity}
                        <p className="text-muted-foreground">{incident.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
