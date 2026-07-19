import { describe, expect, it } from 'vitest';
import {
  planDomiAdminTool,
  planDomiCourierTool,
  planDomiCustomerTool,
  planDomiMerchantTool,
  planDomiTool,
} from '@/lib/domi/tools/planner';

const customer = {
  role: 'customer' as const,
  permissions: ['business.search', 'products.search', 'cart.read', 'orders.read', 'memory.manage', 'support.create'],
};

const merchant = {
  role: 'merchant' as const,
  permissions: [
    'business.read',
    'orders.read',
    'orders.update',
    'catalog.read',
    'inventory.read',
    'inventory.update',
    'reports.read',
    'reviews.read',
    'memory.manage',
    'support.create',
  ],
};

const courier = {
  role: 'courier' as const,
  permissions: [
    'assignments.read',
    'assignments.accept',
    'delivery.read',
    'delivery.update',
    'route.read',
    'earnings.read',
    'memory.manage',
    'support.create',
  ],
};

const admin = {
  role: 'admin' as const,
  permissions: [
    'operation.read',
    'orders.read',
    'business.read',
    'courier.read',
    'reports.read',
    'finance.read',
    'audit.read',
    'memory.manage',
    'support.create',
  ],
};

const actionId = '550e8400-e29b-41d4-a716-446655440000';

describe('Domi multirole tool planner', () => {
  it('planifica confirmación y cancelación por identificador', () => {
    expect(planDomiTool(customer, `Confirmar acción ${actionId}`)).toEqual({
      name: 'action.confirm',
      intent: 'action_confirm',
      arguments: { actionId },
    });
    expect(planDomiTool(admin, `Cancelar acción ${actionId}`)?.name).toBe('action.cancel');
  });

  it('planifica controles de memoria para cualquier perfil autorizado', () => {
    expect(planDomiTool(customer, '¿Qué recuerdas de mí?')?.name).toBe('memory.list');
    expect(planDomiTool(merchant, 'Desactiva la memoria')?.name).toBe('memory.set_enabled');
    expect(planDomiTool(courier, 'Activa la memoria')?.arguments).toEqual({ enabled: true });
    expect(planDomiTool(admin, 'Borra toda mi memoria')?.name).toBe('memory.delete_all');
  });

  it('prepara tickets explícitos de soporte', () => {
    expect(planDomiTool(customer, 'Crear ticket de soporte porque no llegó mi pedido')?.name)
      .toBe('support.create_ticket');
    expect(planDomiTool(admin, 'Escalar esta incidencia a un asesor humano')?.name)
      .toBe('support.create_ticket');
  });

  it('planifica búsqueda de catálogo y limpia la consulta del cliente', () => {
    expect(planDomiCustomerTool(customer, 'Buscar hamburguesas')).toEqual({
      name: 'customer.search_catalog',
      intent: 'customer_search_catalog',
      arguments: { query: 'hamburguesas' },
    });
  });

  it('diferencia carrito, historial y seguimiento del cliente', () => {
    expect(planDomiTool(customer, '¿Qué tengo agregado en el carrito?')?.name)
      .toBe('customer.cart_summary');
    expect(planDomiTool(customer, 'Consultar mis pedidos')?.name)
      .toBe('customer.list_orders');
    expect(planDomiTool(customer, '¿Dónde está mi último pedido?')?.name)
      .toBe('customer.track_order');
  });

  it('planifica lecturas y cambios confirmados del negocio', () => {
    expect(planDomiMerchantTool(merchant, 'Muéstrame el inventario bajo')?.name)
      .toBe('merchant.inventory_summary');
    expect(planDomiTool(merchant, 'Cuánto vendimos este mes')?.name)
      .toBe('merchant.sales_summary');
    expect(planDomiTool(merchant, 'Resume las reseñas recientes')?.name)
      .toBe('merchant.reviews_summary');
    expect(planDomiTool(merchant, 'Muéstrame los pedidos demorados')?.name)
      .toBe('merchant.list_orders');
    expect(planDomiTool(merchant, 'Marca el pedido DU-1234 como listo')).toEqual({
      name: 'merchant.update_order_status',
      intent: 'merchant_update_order_status',
      arguments: { reference: 'DU-1234', targetStatus: 'ready' },
    });
    expect(planDomiTool(merchant, 'Pon el stock del producto Perfume Árabe en 12')?.name)
      .toBe('merchant.update_product');
  });

  it('planifica lecturas y cambios confirmados del repartidor', () => {
    expect(planDomiCourierTool(courier, 'Cuáles son mis pedidos asignados')?.name)
      .toBe('courier.assignments');
    expect(planDomiTool(courier, 'Muéstrame pedidos disponibles')?.name)
      .toBe('courier.available_orders');
    expect(planDomiTool(courier, 'Cuánto he ganado')?.name)
      .toBe('courier.earnings_summary');
    expect(planDomiTool(courier, 'Ver historial de entregas completadas')?.name)
      .toBe('courier.delivery_history');
    expect(planDomiTool(courier, 'Acepta el pedido DU-5678')).toEqual({
      name: 'courier.accept_order',
      intent: 'courier_accept_order',
      arguments: { reference: 'DU-5678' },
    });
    expect(planDomiTool(courier, 'Marca el pedido DU-5678 como entregado')?.name)
      .toBe('courier.update_order_status');
  });

  it('planifica métricas, pedidos, negocios, repartidores y auditoría del administrador', () => {
    expect(planDomiAdminTool(admin, 'Estado general de la plataforma')?.name)
      .toBe('admin.platform_metrics');
    expect(planDomiTool(admin, 'Pedidos detenidos')?.name)
      .toBe('admin.order_summary');
    expect(planDomiTool(admin, 'Resumen de negocios')?.name)
      .toBe('admin.business_summary');
    expect(planDomiTool(admin, 'Estado de los repartidores')?.name)
      .toBe('admin.courier_summary');
    expect(planDomiTool(admin, 'Auditoría y errores recientes')?.name)
      .toBe('admin.audit_summary');
  });

  it('no planifica herramientas sin los permisos requeridos', () => {
    expect(planDomiTool({ role: 'customer', permissions: ['orders.read'] }, 'Buscar pizza'))
      .toBeNull();
    expect(planDomiTool({ role: 'merchant', permissions: ['orders.read'] }, 'Ver inventario'))
      .toBeNull();
    expect(planDomiTool({ role: 'merchant', permissions: ['orders.read'] }, 'Marca el pedido DU-1234 como listo'))
      .not.toMatchObject({ name: 'merchant.update_order_status' });
    expect(planDomiTool({ role: 'courier', permissions: ['delivery.read'] }, 'Acepta el pedido DU-5678'))
      .toBeNull();
    expect(planDomiTool({ role: 'admin', permissions: ['orders.read'] }, 'Estado general de la plataforma'))
      .toBeNull();
  });

  it('no cruza herramientas entre perfiles', () => {
    expect(planDomiTool(customer, 'Muéstrame la auditoría')).toBeNull();
    expect(planDomiTool(merchant, 'Muéstrame pedidos disponibles para repartir')).toBeNull();
    expect(planDomiTool(courier, 'Muéstrame ventas del negocio')).toBeNull();
    expect(planDomiTool(admin, 'Qué tengo en mi carrito')).toBeNull();
  });
});
