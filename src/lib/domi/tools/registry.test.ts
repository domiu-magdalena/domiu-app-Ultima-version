import { describe, expect, it } from 'vitest';
import type { DomiServerContext } from '@/lib/domi/server-context';
import { canExecuteDomiTool, DOMI_TOOL_REGISTRY } from '@/lib/domi/tools/registry';
import type { DomiRole } from '@/lib/domi/security';

function context(role: DomiRole, permissions: string[]): DomiServerContext {
  return {
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    sessionId: 'session',
    userId: '123e4567-e89b-42d3-a456-426614174000',
    email: 'usuario@domiu.test',
    name: 'Usuario DomiU',
    role,
    sourceRole: role,
    permissions,
    tenantId: role === 'merchant' ? '123e4567-e89b-42d3-a456-426614174001' : role === 'admin' ? 'platform' : '123e4567-e89b-42d3-a456-426614174000',
    tenantType: role === 'merchant' ? 'business' : role === 'admin' ? 'platform' : 'user',
    tenantLabel: 'DomiU',
    accountStatus: 'active',
    client: {
      path: null,
      module: null,
      screen: null,
      locale: 'es-CO',
      timezone: 'America/Bogota',
      cart: null,
    },
    ipAddress: null,
    userAgent: null,
  };
}

describe('Domi controlled tool registry', () => {
  it('registra herramientas para los cuatro perfiles', () => {
    const roles = new Set(Object.values(DOMI_TOOL_REGISTRY).flatMap((definition) => definition.roles));
    expect(roles).toEqual(new Set(['customer', 'merchant', 'courier', 'admin']));
  });

  it('mantiene todas las herramientas como operaciones idempotentes con timeout', () => {
    for (const definition of Object.values(DOMI_TOOL_REGISTRY)) {
      expect(definition.idempotent).toBe(true);
      expect(definition.timeoutMs).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(definition.riskLevel);
    }
  });

  it('exige confirmación para escrituras y controles destructivos', () => {
    const confirmed = [
      'merchant.update_order_status',
      'merchant.update_product',
      'courier.accept_order',
      'courier.update_order_status',
      'memory.set_enabled',
      'memory.delete_all',
      'support.create_ticket',
    ] as const;

    for (const name of confirmed) {
      expect(DOMI_TOOL_REGISTRY[name].requiresConfirmation).toBe(true);
      expect(DOMI_TOOL_REGISTRY[name].riskLevel).toBe('medium');
      expect(DOMI_TOOL_REGISTRY[name].permissions.length).toBeGreaterThan(0);
    }
  });

  it('mantiene las consultas como bajo riesgo sin confirmación', () => {
    for (const definition of Object.values(DOMI_TOOL_REGISTRY)) {
      if (definition.requiresConfirmation || definition.name.startsWith('action.')) continue;
      expect(definition.riskLevel).toBe('low');
      expect(definition.permissions.length).toBeGreaterThan(0);
    }
  });

  it('permite confirmar o cancelar solo una acción propia ya validada por el ejecutor', () => {
    for (const role of ['customer', 'merchant', 'courier', 'admin'] as const) {
      expect(canExecuteDomiTool(context(role, []), 'action.confirm')).toBe(true);
      expect(canExecuteDomiTool(context(role, []), 'action.cancel')).toBe(true);
    }
  });

  it('exige rol y todos los permisos declarados', () => {
    const merchant = context('merchant', ['inventory.read']);
    expect(canExecuteDomiTool(merchant, 'merchant.inventory_summary')).toBe(true);
    expect(canExecuteDomiTool(merchant, 'merchant.update_product')).toBe(false);
    expect(canExecuteDomiTool(context('merchant', ['inventory.update']), 'merchant.update_product')).toBe(true);
    expect(canExecuteDomiTool(merchant, 'admin.platform_metrics')).toBe(false);

    const adminPartial = context('admin', ['operation.read']);
    expect(canExecuteDomiTool(adminPartial, 'admin.platform_metrics')).toBe(false);
    expect(
      canExecuteDomiTool(context('admin', ['operation.read', 'reports.read']), 'admin.platform_metrics'),
    ).toBe(true);
  });

  it('impide que cliente, negocio y repartidor ejecuten herramientas administrativas', () => {
    expect(canExecuteDomiTool(context('customer', ['audit.read']), 'admin.audit_summary')).toBe(false);
    expect(canExecuteDomiTool(context('merchant', ['audit.read']), 'admin.audit_summary')).toBe(false);
    expect(canExecuteDomiTool(context('courier', ['audit.read']), 'admin.audit_summary')).toBe(false);
  });
});
