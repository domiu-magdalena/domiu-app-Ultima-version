'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getSupportTickets,
  getSupportTicketDetail,
  respondToTicketAction,
  updateTicketPriorityAction,
  updateTicketStatusAction,
} from '@/app/actions/admin-support';
import type { SupportTicketSummary, SupportTicketDetail } from '@/app/actions/admin-support';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  RefreshCw,
  MessageSquare,
  ExternalLink,
  Clock,
  User,
  Mail,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'closed', label: 'Cerrados' },
];

const ROLE_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'customer', label: 'Cliente' },
  { value: 'courier', label: 'Repartidor' },
  { value: 'business', label: 'Negocio' },
];

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ROLE_LABELS: Record<string, string> = {
  customer: 'Cliente',
  courier: 'Repartidor',
  business: 'Negocio',
  merchant: 'Negocio',
};

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    open: 'Abierto',
    in_review: 'En revisión',
    resolved: 'Resuelto',
    rejected: 'Rechazado',
    closed: 'Cerrado',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const labels: Record<string, string> = {
    low: 'Baja',
    normal: 'Normal',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority] || 'bg-gray-100 text-gray-700'}`}>
      {labels[priority] || priority}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    customer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    courier: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    business: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    merchant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function UserAvatar({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) {
  const initials = ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-xs font-bold text-primary shrink-0">
      {initials}
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export default function AdminSoporte() {
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [roleFilter, setRoleFilter] = useState('todos');

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      const data = await getSupportTickets(
        search || undefined,
        statusFilter !== 'todos' ? statusFilter : undefined,
        roleFilter !== 'todos' ? roleFilter : undefined,
      );
      setTickets(data);
    } catch {
      toast.error('Error al cargar tickets');
    }
  }, [search, statusFilter, roleFilter]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      try { await loadTickets(); }
      finally { if (!cancelled) setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [loadTickets]);

  const openDetail = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setDetailLoading(true);
    setAdminResponse('');
    setNewStatus('');
    try {
      const detail = await getSupportTicketDetail(ticketId);
      setTicketDetail(detail);
      setAdminResponse(detail?.admin_response || '');
      setNewStatus(detail?.status || '');
    } catch {
      toast.error('Error al cargar detalle del ticket');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedTicketId || !adminResponse.trim()) {
      toast.error('Escribe una respuesta');
      return;
    }
    setSending(true);
    try {
      const result = await respondToTicketAction(selectedTicketId, adminResponse.trim(), newStatus || undefined);
      if (result.success) {
        toast.success('Respuesta enviada correctamente');
        setSelectedTicketId(null);
        setTicketDetail(null);
        loadTickets();
      } else {
        toast.error(result.error || 'Error al enviar respuesta');
      }
    } catch {
      toast.error('Error al enviar respuesta');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      const result = await updateTicketStatusAction(ticketId, status);
      if (result.success) {
        toast.success('Estado actualizado');
        loadTickets();
        if (ticketDetail) {
          setTicketDetail({ ...ticketDetail, status });
        }
      } else {
        toast.error(result.error || 'Error al actualizar estado');
      }
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const handlePriorityChange = async (ticketId: string, priority: string) => {
    try {
      const result = await updateTicketPriorityAction(ticketId, priority);
      if (result.success) {
        toast.success('Prioridad actualizada');
        loadTickets();
        if (ticketDetail) {
          setTicketDetail({ ...ticketDetail, priority });
        }
      } else {
        toast.error(result.error || 'Error al actualizar prioridad');
      }
    } catch {
      toast.error('Error al actualizar prioridad');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Soporte</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona los tickets de soporte de la plataforma</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTickets}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Actualizar
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por asunto o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_OPTIONS}
          className="w-full sm:w-40"
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={ROLE_OPTIONS}
          className="w-full sm:w-36"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <TicketSkeleton key={i} />)
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">No hay tickets de soporte</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {search || statusFilter !== 'todos' || roleFilter !== 'todos'
                ? 'Intenta con otros filtros'
                : 'Aún no se han creado tickets'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tickets.map((ticket) => (
              <motion.div
                key={ticket.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                onClick={() => openDetail(ticket.id)}
                className="group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <UserAvatar firstName={ticket.user_first_name} lastName={ticket.user_last_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {ticket.subject || 'Sin asunto'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[ticket.user_first_name, ticket.user_last_name].filter(Boolean).join(' ') || ticket.user_email}
                  </p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <RoleBadge role={ticket.role} />
                </div>
                <div className="hidden items-center gap-2 md:flex">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="flex items-center gap-2 sm:hidden">
                  <StatusBadge status={ticket.status} />
                </div>
                <time className="hidden shrink-0 text-xs text-muted-foreground lg:block">
                  {new Date(ticket.created_at).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </time>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <Modal
        open={!!selectedTicketId}
        onClose={() => { setSelectedTicketId(null); setTicketDetail(null); }}
        title={ticketDetail?.subject || 'Detalle del Ticket'}
        className="max-w-2xl"
      >
        {detailLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        ) : ticketDetail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={ticketDetail.status} />
              <PriorityBadge priority={ticketDetail.priority} />
              <RoleBadge role={ticketDetail.role} />
              <Badge variant="outline">{ticketDetail.ticket_type}</Badge>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="whitespace-pre-wrap text-sm text-foreground">{ticketDetail.description}</p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h4 className="mb-3 text-sm font-medium text-foreground">Información del usuario</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {[ticketDetail.user_first_name, ticketDetail.user_last_name].filter(Boolean).join(' ') || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{ticketDetail.user_email}</span>
                </div>
                {ticketDetail.user_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{ticketDetail.user_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {ticketDetail.order_id && (
              <div className="rounded-lg border border-border p-4">
                <h4 className="mb-2 text-sm font-medium text-foreground">Pedido relacionado</h4>
                <a
                  href={`/admin/pedidos?id=${ticketDetail.order_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver pedido #{ticketDetail.order_id.slice(0, 8)}
                </a>
              </div>
            )}

            {ticketDetail.created_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Creado: {new Date(ticketDetail.created_at).toLocaleString('es-CO')}
                {ticketDetail.resolved_at && (
                  <> &middot; Resuelto: {new Date(ticketDetail.resolved_at).toLocaleString('es-CO')}</>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Cambiar estado</label>
                <Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  options={[
                    { value: 'open', label: 'Abierto' },
                    { value: 'in_review', label: 'En revisión' },
                    { value: 'resolved', label: 'Resuelto' },
                    { value: 'rejected', label: 'Rechazado' },
                    { value: 'closed', label: 'Cerrado' },
                  ]}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Prioridad</label>
                <Select
                  value={ticketDetail.priority}
                  onChange={(e) => handlePriorityChange(ticketDetail.id, e.target.value)}
                  options={[
                    { value: 'low', label: 'Baja' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'high', label: 'Alta' },
                    { value: 'urgent', label: 'Urgente' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Respuesta del administrador
              </label>
              <Textarea
                placeholder="Escribe tu respuesta aquí..."
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows={4}
              />
            </div>

            {ticketDetail.admin_response && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Respuesta anterior
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{ticketDetail.admin_response}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleRespond} disabled={sending || !adminResponse.trim()}>
                {sending ? 'Enviando...' : 'Enviar respuesta'}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await handleStatusChange(ticketDetail.id, newStatus || ticketDetail.status);
                }}
              >
                Actualizar estado
              </Button>
              <Button variant="ghost" onClick={() => { setSelectedTicketId(null); setTicketDetail(null); }}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No se pudo cargar el ticket</p>
        )}
      </Modal>
    </div>
  );
}
