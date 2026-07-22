'use client';

import React, { useEffect, useState } from 'react';
import { SkeletonTable } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import type { EnterpriseColumn, EnterpriseTableProps } from '@/components/admin/enterprise-table';
const EnterpriseTable = dynamic(() => import('@/components/admin/enterprise-table').then(m => ({ default: m.EnterpriseTable })), {
  ssr: false,
  loading: () => <SkeletonTable columns={5} rows={8} />,
}) as <T>(props: EnterpriseTableProps<T>) => React.JSX.Element;
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { adminService } from '@/services/admin';
import { setExactUserRoleAction } from '@/app/actions/admin-user-roles';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminUser } from '@/services/admin';
import { Shield, ShieldOff, RefreshCw, Sparkles } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'domiumagdalena@gmail.com';

const roleBadge: Record<string, 'info' | 'success' | 'warning' | 'destructive' | 'default'> = {
  admin: 'destructive',
  merchant: 'warning',
  courier: 'info',
  customer: 'success',
};

const statusBadge: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  active: 'success',
  inactive: 'warning',
  suspended: 'destructive',
  banned: 'destructive',
};

export default function AdminUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const loadUsers = async () => {
    try { setUsers(await adminService.getUsers(search || undefined, roleFilter)); }
    catch {}
  };

  useEffect(() => {
    (async () => { await loadUsers(); setLoading(false); })();
  }, [search, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusToggle = async (user: AdminUser) => {
    if (user.email === SUPER_ADMIN_EMAIL) {
      setAlert({ type: 'error', msg: 'No puedes modificar el Super Admin' });
      return;
    }
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await adminService.updateUserStatus(user.id, newStatus);
      if (profile) await adminService.logAudit(profile.id, `${profile.first_name} ${profile.last_name}`, newStatus === 'active' ? 'reactivar_usuario' : 'suspender_usuario', 'profile', user.id, `${user.email} -> ${newStatus}`);
      setAlert({ type: 'success', msg: `Usuario ${newStatus === 'active' ? 'reactivado' : 'suspendido'}` });
      await loadUsers();
    } catch {
      setAlert({ type: 'error', msg: 'Error al actualizar usuario' });
    }
  };

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    if (user.email === SUPER_ADMIN_EMAIL) {
      setAlert({ type: 'error', msg: 'No puedes cambiar el rol del Super Admin' });
      return;
    }
    try {
      const result = await setExactUserRoleAction(user.id, newRole);
      if (!result.success) throw new Error(result.error);
      setAlert({ type: 'success', msg: `Cuenta creada correctamente en el rol ${result.role}` });
      setSelectedUser(null);
      await loadUsers();
    } catch (cause) {
      setAlert({
        type: 'error',
        msg: cause instanceof Error ? cause.message : 'Error al cambiar rol',
      });
    }
  };

  const columns: EnterpriseColumn<AdminUser>[] = [
    {
      key: 'name',
      header: 'Usuario',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-xs font-bold text-primary">
            {((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">{[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}</span>
              {user.email === SUPER_ADMIN_EMAIL && (
                <Sparkles className="h-3 w-3 text-amber-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (user) => user.email },
    {
      key: 'role',
      header: 'Rol',
      render: (user) => (
        <Badge variant={roleBadge[user.role]}>
          {user.email === SUPER_ADMIN_EMAIL ? 'Super Admin' : user.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (user) => <Badge variant={statusBadge[user.status] || 'outline'}>{user.status}</Badge>,
    },
    { key: 'phone', header: 'Teléfono', render: (user) => user.phone || '—' },
    {
      key: 'created_at',
      header: 'Registro',
      render: (user) => new Date(user.created_at).toLocaleDateString('es-CO'),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (user) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusToggle(user)}
            className={user.status === 'active' ? 'text-destructive' : 'text-success'}
            disabled={user.email === SUPER_ADMIN_EMAIL}
          >
            {user.status === 'active' ? <><ShieldOff className="mr-1 h-3.5 w-3.5" />Suspender</> : <><Shield className="mr-1 h-3.5 w-3.5" />Activar</>}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Gestión de Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administra todos los usuarios de la plataforma</p>
        </div>
      </div>

      {alert && <Alert variant={alert.type} title={alert.msg} dismissible onDismiss={() => setAlert(null)} />}

      <EnterpriseTable
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar usuarios..."
        loading={loading}
        emptyMessage="No se encontraron usuarios"
        exportable
        exportFilename="usuarios"
        actions={
          <>
            <Select
              value={roleFilter}
              onChange={event => setRoleFilter(event.target.value)}
              options={[
                { value: 'all', label: 'Todos los roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'merchant', label: 'Negocio' },
                { value: 'courier', label: 'Repartidor' },
                { value: 'customer', label: 'Cliente' },
              ]}
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={loadUsers}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Actualizar
            </Button>
          </>
        }
      />

      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="Editar Usuario">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-sm font-bold text-primary">
                {((selectedUser.first_name?.[0] || '') + (selectedUser.last_name?.[0] || '')).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">{[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || '—'}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant={statusBadge[selectedUser.status] || 'outline'}>{selectedUser.status}</Badge>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Cambiar Rol</p>
              <Select
                value={selectedUser.role}
                onChange={event => void handleRoleChange(selectedUser, event.target.value)}
                options={[
                  { value: 'admin', label: 'Admin' },
                  { value: 'merchant', label: 'Negocio' },
                  { value: 'courier', label: 'Repartidor' },
                  { value: 'customer', label: 'Cliente' },
                ]}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                El sistema verificará que la cuenta quede exactamente en el rol seleccionado. Los repartidores también deben recibir su perfil operativo.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => void handleStatusToggle(selectedUser)} className={selectedUser.status === 'active' ? 'text-destructive' : 'text-success'}>
                {selectedUser.status === 'active' ? 'Suspender Usuario' : 'Reactivar Usuario'}
              </Button>
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
