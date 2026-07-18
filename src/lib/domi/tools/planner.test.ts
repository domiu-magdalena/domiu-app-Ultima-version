import { describe, expect, it } from 'vitest';
import { planDomiCustomerTool } from '@/lib/domi/tools/planner';

const customer = {
  role: 'customer' as const,
  permissions: ['business.search', 'products.search', 'cart.read', 'orders.read'],
};

const courier = {
  role: 'courier' as const,
  permissions: ['assignments.read', 'delivery.read'],
};

describe('Domi phase 2 customer tool planner', () => {
  it('planifica búsqueda de catálogo y limpia la consulta', () => {
    expect(planDomiCustomerTool(customer, 'Buscar hamburguesas')).toEqual({
      name: 'customer.search_catalog',
      intent: 'customer_search_catalog',
      arguments: { query: 'hamburguesas' },
    });
  });

  it('solicita la herramienta de carrito', () => {
    expect(planDomiCustomerTool(customer, '¿Qué tengo agregado en el carrito?')?.name)
      .toBe('customer.cart_summary');
  });

  it('diferencia historial y seguimiento de pedidos', () => {
    expect(planDomiCustomerTool(customer, 'Consultar mis pedidos')?.name)
      .toBe('customer.list_orders');
    expect(planDomiCustomerTool(customer, '¿Dónde está mi último pedido?')?.name)
      .toBe('customer.track_order');
  });

  it('no habilita herramientas de cliente a otros roles', () => {
    expect(planDomiCustomerTool(courier, 'Buscar hamburguesas')).toBeNull();
  });

  it('no planifica una herramienta sin el permiso requerido', () => {
    expect(planDomiCustomerTool({ role: 'customer', permissions: ['orders.read'] }, 'Buscar pizza'))
      .toBeNull();
  });
});
