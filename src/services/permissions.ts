// src/services/permissions.ts
// RBAC permission checking service

'use client';

import type { AdminRole, Permission } from '@/types/admin';
import { ADMIN_ROLE_PERMISSIONS, SUPER_ADMIN_EMAIL } from '@/types/admin';

export const permissionsService = {
  hasPermission(role: AdminRole | null, permission: Permission, email?: string): boolean {
    if (email === SUPER_ADMIN_EMAIL) return true;
    if (!role) return false;
    const perms = ADMIN_ROLE_PERMISSIONS[role];
    if (!perms) return false;
    if (perms.includes('*' as unknown as Permission)) return true;
    return perms.includes(permission);
  },

  hasAnyPermission(role: AdminRole | null, permissions: Permission[], email?: string): boolean {
    return permissions.some((p) => this.hasPermission(role, p, email));
  },

  hasAllPermissions(role: AdminRole | null, permissions: Permission[], email?: string): boolean {
    return permissions.every((p) => this.hasPermission(role, p, email));
  },

  getPermissions(role: AdminRole | null): Permission[] {
    if (!role) return [];
    return ADMIN_ROLE_PERMISSIONS[role] || [];
  },

  can(required: Permission): (role: AdminRole | null, email?: string) => boolean {
    return (role, email) => this.hasPermission(role, required, email);
  },
};
