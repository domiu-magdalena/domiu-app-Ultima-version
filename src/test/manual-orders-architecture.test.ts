import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const schema = read('supabase/migrations/20260721110000_manual_orders_schema.sql');
const pricing = read('supabase/migrations/20260721111000_manual_orders_pricing_inventory.sql');
const rpc = read('supabase/migrations/20260721112000_confirm_manual_order_rpc.sql');
const service = read('src/lib/manual-orders/service.ts');
const security = read('src/lib/manual-orders/security.ts');
const wizard = read('src/components/manual-orders/ManualOrderWizard.tsx');
const adminPage = read('src/app/admin/pedidos/crear/page.tsx');
const merchantPage = read('src/app/negocio/pedidos/crear/page.tsx');

describe('manual orders enterprise architecture', () => {
  it('permite invitados sin crear usuarios de autenticación', () => {
    expect(schema).toContain('alter table public.orders alter column customer_id drop not null');
    expect(schema).toContain('guest_customer jsonb');
    expect(rpc).toContain("'type','guest'");
    expect(rpc).not.toContain('auth.admin.createUser');
    expect(rpc).not.toContain('admin.createUser');
  });

  it('conserva snapshots históricos del cliente dirección negocio y producto', () => {
    for (const field of ['customer_snapshot', 'delivery_address_snapshot', 'business_snapshot']) {
      expect(schema).toContain(field);
      expect(rpc).toContain(field);
    }
    expect(schema).toContain('product_name_snapshot');
    expect(schema).toContain('product_snapshot');
    expect(rpc).toContain("'unitPriceCharged'");
  });

  it('recalcula precios e ignora totales enviados por el navegador', () => {
    expect(service).toContain(".from('products')");
    expect(service).toContain('discount_price');
    expect(service).toContain('service_fee_rate');
    expect(rpc).toContain("select * into v_product from public.products");
    expect(rpc).toContain('v_unit_price := case');
    expect(rpc).not.toContain("p_payload->>'totalAmount'");
    expect(rpc).not.toContain("p_payload->>'subtotal'");
  });

  it('bloquea productos de otros negocios e inventario concurrente', () => {
    expect(rpc).toContain('where id=v_product_id and business_id=v_business_id');
    expect(rpc).toContain('for update');
    expect(rpc).toContain('quantity_available>=v_quantity');
    expect(rpc).toContain('Inventario modificado por otro pedido');
  });

  it('restaura inventario una sola vez al cancelar', () => {
    expect(schema).toContain('unique(order_item_id, movement_type)');
    expect(pricing).toContain('restore_cancelled_manual_order_inventory');
    expect(pricing).toContain("on conflict(order_item_id,movement_type) do nothing");
  });

  it('implementa idempotencia y detecta la misma clave con contenido diferente', () => {
    expect(schema).toContain('idx_orders_manual_idempotency');
    expect(rpc).toContain('v_request_hash := md5(p_payload::text)');
    expect(rpc).toContain('La clave de idempotencia ya fue usada con datos diferentes');
    expect(wizard).toContain("'Idempotency-Key': idempotencyRef.current");
  });

  it('aísla al comercio por propietario y reserva excepciones al administrador', () => {
    expect(rpc).toContain("v_actor.role = 'merchant'::public.user_role and v_business.owner_id <> p_actor_id");
    expect(service).toContain("actor.role === 'merchant'");
    expect(service).toContain(".eq('owner_id', actor.session.user.id)");
    expect(rpc).toContain('v_admin_override');
    expect(rpc).toContain('administrativeReason');
  });

  it('protege las escrituras por origen y limita frecuencia', () => {
    expect(security).toContain("fetchSite === 'cross-site'");
    expect(security).toContain('originHost !== host');
    expect(security).toContain("action: 'confirm'");
    expect(security).toContain(".from('audit_log')");
  });

  it('mantiene borradores sin inventario cobros ni asignación', () => {
    expect(schema).toContain('manual_order_drafts');
    expect(schema).toContain("status text not null default 'draft'");
    expect(service).toContain('saveManualOrderDraft');
    const saveDraft = service.slice(service.indexOf('saveManualOrderDraft'));
    expect(saveDraft).not.toContain(".from('orders').insert");
    expect(saveDraft).not.toContain(".from('products').update");
  });

  it('usa el mismo asistente de creación en admin y comercio', () => {
    expect(adminPage).toContain('<ManualOrderWizard mode="admin" />');
    expect(merchantPage).toContain('<ManualOrderWizard mode="merchant" />');
  });

  it('requiere confirmación explícita y previene doble envío', () => {
    expect(wizard).toContain('Calcular y validar');
    expect(wizard).toContain('Confirmar y crear pedido');
    expect(wizard).toContain('disabled={confirming');
    expect(wizard).toContain('idempotencyRef');
  });

  it('diferencia notas por visibilidad y no las mezcla en el repartidor', () => {
    expect(schema).toContain('kitchen_notes');
    expect(schema).toContain('courier_notes');
    expect(schema).toContain('internal_notes');
    expect(rpc).toContain("p_payload->>'internalNotes'");
    expect(wizard).toContain('Notas internas');
  });

  it('mantiene las operaciones privilegiadas en service role', () => {
    expect(rpc).toContain('revoke all on function public.confirm_manual_order');
    expect(rpc).toContain('grant execute on function public.confirm_manual_order(uuid,jsonb,text) to service_role');
    expect(schema).toContain('alter table public.manual_order_drafts enable row level security');
    expect(schema).toContain('alter table public.manual_order_inventory_movements enable row level security');
  });
});
