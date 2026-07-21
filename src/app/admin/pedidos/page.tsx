'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SkeletonTable } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import type { EnterpriseColumn, EnterpriseTableProps } from '@/components/admin/enterprise-table';
import type { AdminPanelOrder } from '@/lib/orders/order-panel-types';
import {
  getAdminOrdersForPanelAction,
  updateAdminOrderStatusAction,
} from '@/app/actions/order-panel';

const EnterpriseTable = dynamic(
  () => import('@/components/admin/enterprise-table').then((module) => ({ default: module.EnterpriseTable })),
  {
    ssr: false,
    loading: () => <SkeletonTable columns={5} rows={8} />,
  },
) as <T>(props: EnterpriseTableProps<T>) => React.JSX.Element;

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { Plus, RefreshCw } from 'lucide-react';

const statusConfig: Record<string, 'warning' | 'info' | 'success' | 'destructive' | 'default'> = {
  pending: 'warning',
  assigned: 'info',
  accepted: 'info',
  confirmed: 'info',
  preparing: 'info',
  ready: 'info',
  picked_up: 'info',
  in_transit: 'default',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'destructive',
};

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'assigned',
  'accepted',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled',
  'refunded',
];

const SALES_CHANNEL_LABEL: Record<string, string> = {
  app: 'Aplicación',
  whatsapp: 'WhatsApp',
  phone: 'Llamada',
  in_person: 'Presencial',
  instagram: 'Instagram',
  facebook: 'Facebook',
  direct_message: 'Mensaje directo',
  other: 'Otro',
};

const formatCurrency = (value: number) =>
  '$' + value.toLocaleString('es-CO', { minimumFractionDigits: 0 });

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminPanelOrder[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminPanelOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const reloadOrders = useCallback(async () => {
    const result = await getAdminOrdersForPanelAction(search, statusFilter);
    if (!result.success) {
      setAlert({ type: 'error', msg: result.error || 'No se pudieron cargar los pedidos' });
      return;
    }
    setOrders(result.orders);
  }, [search, statusFilter]);

  useEffect(() => {
    void (async () => {
      await reloadOrders();
      setLoading(false);
    })();
  }, [reloadOrders]);

  useEffect(() => {
    const id = window.setInterval(() => void reloadOrders(), 15_000);
    return () => window.clearInterval(id);
  }, [reloadOrders]);

  const handleStatusChange = async () => {
    if (!newStatus || !selected) return;
    const result = await updateAdminOrderStatusAction(selected.id, newStatus);
    if (!result.success) {
      setAlert({ type: 'error', msg: result.error || 'No se pudo actualizar el pedido' });
      return;
    }

    setAlert({
      type: 'success',
      msg: `Pedido #${selected.orderNumber} actualizado a ${newStatus}`,
    });
    setSelected(null);
    setNewStatus('');
    await reloadOrders();
  };

  const columns: EnterpriseColumn<AdminPanelOrder>[] = [
    { key: 'orderNumber', header: '# Pedido', sortable: true },
    { key: 'customerName', header: 'Cliente', render: (order) => order.customerName || '—' },
    { key: 'businessName', header: 'Negocio', sortable: true },
    {
      key: 'orderType',
      header: 'Tipo',
      render: (order) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={order.createdManually ? 'warning' : 'default'}>
            {order.createdManually ? 'Manual' : 'Aplicación'}
          </Badge>
          {order.createdManually && (
            <Badge variant="default">
              {SALES_CHANNEL_LABEL[order.salesChannel] || order.salesChannel}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (order) => (
        <Badge variant={statusConfig[order.status] || 'default'}>
          {order.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Pago',
      render: (order) => (
        <Badge variant={order.paymentStatus === 'completed' ? 'success' : 'warning'}>
          {order.paymentStatus}
        </Badge>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (order) => formatCurrency(order.totalAmount),
      sortable: true,
    },
    {
      key: 'courierEarnings',
      header: 'Gan. Repartidor',
      render: (order) =>
        order.courierEarnings != null ? formatCurrency(order.courierEarnings) : '—',
    },
    {
      key: 'platformEarnings',
      header: 'Gan. DomiU',
      render: (order) =>
        order.platformEarnings != null ? formatCurrency(order.platformEarnings) : '—',
    },
    { key: 'courierName', header: 'Repartidor', render: (order) => order.courierName || '—' },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (order) => new Date(order.createdAt).toLocaleString('es-CO'),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (order) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelected(order);
            setNewStatus(order.status);
          }}
        >
          Gestionar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Gestión de Pedidos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualiza pedidos de la aplicación y pedidos manuales con trazabilidad de origen.
          </p>
        </div>
        <Link
          href="/admin/pedidos/crear"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
        >
          <Plus className="h-4 w-4" /> Crear pedido manual
        </Link>
      </div>

      {alert && (
        <Alert
          variant={alert.type}
          title={alert.msg}
          dismissible
          onDismiss={() => setAlert(null)}
        />
      )}

      <EnterpriseTable
        columns={columns}
        data={orders}
        keyExtractor={(order) => order.id}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar pedidos..."
        loading={loading}
        emptyMessage="No hay pedidos"
        exportable
        exportFilename="pedidos"
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: 'all', label: 'Todos los estados' },
                ...ORDER_STATUSES.map((status) => ({
                  value: status,
                  label: status.replace('_', ' '),
                })),
              ]}
              className="w-44"
            />
            <Button variant="outline" size="sm" onClick={() => void reloadOrders()}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Actualizar
            </Button>
          </>
        }
      />

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Pedido #${selected?.orderNumber || ''}`}
      >
        {selected && (
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Cliente:</span>{' '}
              <span className="font-medium">{selected.customerName || '—'}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Negocio:</span>{' '}
              <span className="font-medium">{selected.businessName}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tipo:</span>{' '}
              <Badge variant={selected.createdManually ? 'warning' : 'default'}>
                {selected.createdManually
                  ? `Manual · ${SALES_CHANNEL_LABEL[selected.salesChannel] || selected.salesChannel}`
                  : 'Aplicación'}
              </Badge>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Entrega:</span>{' '}
              <span className="font-medium">
                {selected.deliveryType === 'pickup' ? 'Recoger en el local' : 'Domicilio'}
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Estado actual:</span>{' '}
              <Badge variant={statusConfig[selected.status]}>{selected.status}</Badge>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Total:</span>{' '}
              <span className="font-medium">{formatCurrency(selected.totalAmount)}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Repartidor:</span>{' '}
              <span className="font-medium">{selected.courierName || 'Sin asignar'}</span>
            </div>
            {selected.courierEarnings != null && (
              <div>
                <span className="text-sm text-muted-foreground">Ganancia repartidor:</span>{' '}
                <span className="font-medium">{formatCurrency(selected.courierEarnings)}</span>
              </div>
            )}
            {selected.platformEarnings != null && (
              <div>
                <span className="text-sm text-muted-foreground">Ganancia DomiU:</span>{' '}
                <span className="font-medium">{formatCurrency(selected.platformEarnings)}</span>
              </div>
            )}
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Cambiar estado:</p>
              <Select
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value)}
                options={ORDER_STATUSES.map((status) => ({
                  value: status,
                  label: status.replace('_', ' '),
                }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void handleStatusChange()} disabled={newStatus === selected.status}>
                Actualizar Estado
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
