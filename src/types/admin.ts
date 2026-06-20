// src/types/admin.ts
// RBAC: roles, permissions, admin profile types

export type AdminRole =
  | 'super_admin'
  | 'admin_general'
  | 'admin_comercial'
  | 'admin_operativo'
  | 'admin_financiero'
  | 'admin_soporte';

export type Permission =
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'business.read'
  | 'business.create'
  | 'business.update'
  | 'business.delete'
  | 'courier.read'
  | 'courier.update'
  | 'courier.delete'
  | 'orders.read'
  | 'orders.update'
  | 'orders.delete'
  | 'wallet.read'
  | 'wallet.update'
  | 'reports.read'
  | 'settings.update'
  | 'audit.read'
  | 'security.read'
  | 'security.update'
  | 'super_admin';

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin_general: 'Administrador General',
  admin_comercial: 'Administrador Comercial',
  admin_operativo: 'Administrador Operativo',
  admin_financiero: 'Administrador Financiero',
  admin_soporte: 'Administrador de Soporte',
};

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ['*' as unknown as Permission],
  admin_general: [
    'users.read', 'users.create', 'users.update',
    'business.read', 'business.create', 'business.update',
    'courier.read', 'courier.update',
    'orders.read', 'orders.update',
    'wallet.read',
    'reports.read',
    'settings.update',
    'audit.read',
    'security.read',
  ],
  admin_comercial: [
    'business.read', 'business.create', 'business.update',
    'courier.read',
    'orders.read',
    'reports.read',
  ],
  admin_operativo: [
    'courier.read', 'courier.update',
    'orders.read', 'orders.update',
    'business.read',
  ],
  admin_financiero: [
    'wallet.read', 'wallet.update',
    'orders.read',
    'reports.read',
    'business.read',
  ],
  admin_soporte: [
    'users.read',
    'business.read',
    'courier.read',
    'orders.read',
    'audit.read',
  ],
};

export interface AdminSession {
  id: string;
  admin_id: string;
  ip_address: string | null;
  browser: string | null;
  device: string | null;
  os: string | null;
  location_city: string | null;
  location_country: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  browser: string | null;
  device: string | null;
  os: string | null;
  location_city: string | null;
  location_country: string | null;
  result: 'success' | 'error';
  created_at: string;
}

export interface AdminHistory {
  id: string;
  admin_id: string;
  event_type: 'login' | 'logout' | 'permission_change' | 'role_change' | 'user_create' | 'config_change';
  ip_address: string | null;
  browser: string | null;
  device: string | null;
  os: string | null;
  location_city: string | null;
  location_country: string | null;
  details: string | null;
  created_at: string;
}

export interface SystemStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number | null;
  last_check: string;
  details: string | null;
}

export const SUPER_ADMIN_EMAIL = 'domiumagdalena@gmail.com';
