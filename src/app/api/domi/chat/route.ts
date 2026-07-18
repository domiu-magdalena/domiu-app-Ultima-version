import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server-auth';
import { getServiceClient } from '@/lib/db/supabase';
import { isAdminRole } from '@/types/auth';

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  conversationId: z.string().uuid().optional(),
  allowMemory: z.boolean().default(false),
});

type RoleScope = 'customer' | 'merchant' | 'courier' | 'admin';
type AssistantContext = {
  roleScope: RoleScope;
  facts: Record<string, unknown>;
  suggestions: string[];
};

function roleScopeFor(role: string): RoleScope {
  if (isAdminRole(role)) return 'admin';
  if (role === 'business' || role === 'merchant') return 'merchant';
  if (role === 'courier') return 'courier';
  return 'customer';
}

function cop(value: unknown): string {
  const parsed = Number(value ?? 0);
  const amount = Number.isFinite(parsed) ? Math.round(parsed) : 0;
  return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)}`;
}

async function courierContext(userId: string): Promise<AssistantContext> {
  const supabase = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const [balanceResult, dayResult, driverResult] = await Promise.all([
    supabase.from('courier_balance_summary_v').select('*').eq('courier_id', userId).maybeSingle(),
    supabase
      .from('courier_daily_payment_stub_v')
      .select('*')
      .eq('courier_id', userId)
      .eq('work_date', today)
      .maybeSingle(),
    supabase
      .from('drivers')
      .select('status,is_available,total_deliveries,rating')
      .eq('id', userId)
      .maybeSingle(),
  ]);
  return {
    roleScope: 'courier',
    facts: {
      balance: balanceResult.data ?? null,
      today: dayResult.data ?? null,
      driver: driverResult.data ?? null,
    },
    suggestions: [
      'Explícame mi saldo con DomiU',
      '¿Cuánto gané hoy?',
      '¿Cómo cierro mi jornada?',
    ],
  };
}

async function merchantContext(userId: string): Promise<AssistantContext> {
  const supabase = getServiceClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('id,name,is_open,owner_id')
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  const businessId = business?.id ? String(business.id) : '';
  const [qualityResult, ordersResult] = businessId
    ? await Promise.all([
        supabase
          .from('merchant_catalog_quality_v')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle(),
        supabase
          .from('orders')
          .select('status,subtotal,business_earnings,created_at')
          .eq('business_id', businessId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100),
      ])
    : [{ data: null }, { data: [] }];
  const delivered = (ordersResult.data ?? []).filter((order) => order.status === 'delivered');
  return {
    roleScope: 'merchant',
    facts: {
      business: business ?? null,
      catalog: qualityResult.data ?? null,
      deliveredOrders: delivered.length,
      productSales: delivered.reduce(
        (sum, order) => sum + Number(order.business_earnings ?? order.subtotal ?? 0),
        0,
      ),
    },
    suggestions: [
      'Revisa mi inventario y catálogo',
      '¿Cuánto he vendido en productos?',
      '¿Cómo abro o cierro el comercio?',
    ],
  };
}

async function adminContext(): Promise<AssistantContext> {
  const supabase = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const [summaryResult, openBusinessesResult, activeOrdersResult] = await Promise.all([
    supabase.from('daily_company_operations_v').select('*').eq('operation_date', today).maybeSingle(),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('is_open', true)
      .is('deleted_at', null),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'assigned',
        'accepted',
        'picked_up',
        'in_transit',
      ])
      .is('deleted_at', null),
  ]);
  return {
    roleScope: 'admin',
    facts: {
      today: summaryResult.data ?? null,
      openBusinesses: openBusinessesResult.count ?? 0,
      activeOrders: activeOrdersResult.count ?? 0,
    },
    suggestions: [
      'Dame el resumen operativo de hoy',
      '¿Cuánto ganó DomiU hoy?',
      'Explícame las liquidaciones pendientes',
    ],
  };
}

async function customerContext(userId: string): Promise<AssistantContext> {
  const supabase = getServiceClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id,order_number,status,total_amount,created_at')
    .eq('customer_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  const orderIds = (orders ?? []).map((order) => String(order.id));
  const itemsResult = orderIds.length
    ? await supabase
        .from('order_items')
        .select('quantity,products(name)')
        .in('order_id', orderIds)
    : { data: [] };
  const frequency = new Map<string, number>();
  for (const item of itemsResult.data ?? []) {
    const relation = item.products as { name?: string } | Array<{ name?: string }> | null;
    const name = Array.isArray(relation) ? relation[0]?.name : relation?.name;
    if (name) frequency.set(name, (frequency.get(name) ?? 0) + Number(item.quantity ?? 0));
  }
  return {
    roleScope: 'customer',
    facts: {
      recentOrders: orders ?? [],
      favoriteProducts: [...frequency.entries()]
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
    },
    suggestions: [
      'Recomiéndame algo según mis pedidos',
      '¿Cómo va mi último pedido?',
      'Explícame la tarifa de servicio',
    ],
  };
}

async function buildContext(userId: string, roleScope: RoleScope): Promise<AssistantContext> {
  if (roleScope === 'courier') return courierContext(userId);
  if (roleScope === 'merchant') return merchantContext(userId);
  if (roleScope === 'admin') return adminContext();
  return customerContext(userId);
}

function answerCourier(message: string, facts: Record<string, unknown>): string {
  const balance = (facts.balance ?? {}) as Record<string, unknown>;
  const today = (facts.today ?? {}) as Record<string, unknown>;
  if (/saldo|debo|debe/.test(message)) {
    const companyOwes = Number(balance.company_owes_courier_cop ?? 0);
    const courierOwes = Number(balance.courier_owes_company_cop ?? 0);
    if (companyOwes > 0) return `DomiU te debe ${cop(companyOwes)} según el libro contable.`;
    if (courierOwes > 0) {
      return `Debes entregar ${cop(courierOwes)} a DomiU. El sistema ya descontó tu ganancia neta del efectivo cobrado.`;
    }
    return 'Tu saldo con DomiU está en cero.';
  }
  if (/gan|hoy/.test(message)) {
    return `Hoy tienes ${Number(today.completed_deliveries ?? 0)} domicilios completados, una ganancia neta de ${cop(
      today.courier_net_earnings_cop,
    )} y ${cop(today.cash_collected_cop)} en efectivo cobrado.`;
  }
  if (/cerr|jornada/.test(message)) {
    return 'Cambia tu estado a “Fuera de línea”. No podrás cerrar la jornada mientras tengas un domicilio activo.';
  }
  return 'Puedo explicarte ganancias, saldo, efectivo, jornada, pedidos y mapa. No puedo modificar una liquidación.';
}

function answerMerchant(message: string, facts: Record<string, unknown>): string {
  const business = (facts.business ?? {}) as Record<string, unknown>;
  const catalog = (facts.catalog ?? {}) as Record<string, unknown>;
  if (/invent|stock|catálogo|catalogo/.test(message)) {
    return `Tu catálogo tiene ${Number(catalog.total_products ?? 0)} productos: ${Number(
      catalog.available_products ?? 0,
    )} disponibles, ${Number(catalog.low_stock_products ?? 0)} con inventario bajo, ${Number(
      catalog.out_of_stock_products ?? 0,
    )} agotados y ${Number(catalog.products_without_image ?? 0)} sin imagen.`;
  }
  if (/vend|gan/.test(message)) {
    return `Has registrado ${Number(facts.deliveredOrders ?? 0)} pedidos entregados y ${cop(
      facts.productSales,
    )} en ventas de productos. No incluye domicilio ni tarifa DomiU.`;
  }
  if (/abr|cerr|jornada/.test(message)) {
    return `El comercio aparece ${business.is_open ? 'abierto' : 'cerrado'}. Usa el control de operación del dashboard; no podrás cerrar con pedidos activos.`;
  }
  return 'Puedo revisar catálogo, inventario, imágenes, ventas y jornada. Cualquier cambio requiere tu confirmación.';
}

function answerAdmin(message: string, facts: Record<string, unknown>): string {
  const today = (facts.today ?? {}) as Record<string, unknown>;
  if (/resumen|hoy|oper/.test(message)) {
    return `Hay ${Number(facts.activeOrders ?? 0)} pedidos activos y ${Number(
      facts.openBusinesses ?? 0,
    )} comercios abiertos. Hoy se crearon ${Number(today.orders_created ?? 0)}, se entregaron ${Number(
      today.orders_delivered ?? 0,
    )} y se cancelaron ${Number(today.orders_cancelled ?? 0)} pedidos.`;
  }
  if (/gan|dinero|ingreso/.test(message)) {
    return `La ganancia registrada de DomiU hoy es ${cop(today.domiu_earnings_cop)}. Los comercios acumulan ${cop(
      today.business_earnings_cop,
    )} y los repartidores ${cop(today.courier_earnings_cop)}.`;
  }
  if (/liquid/.test(message)) {
    return 'En Liquidaciones puedes ver jornadas, ganancias, efectivo y saldo. Cada pago crea un asiento auditable; el saldo nunca se edita manualmente.';
  }
  return 'Puedo resumir operación, finanzas, pedidos, comercios y liquidaciones. Las acciones críticas requieren confirmación humana.';
}

function answerCustomer(message: string, facts: Record<string, unknown>): string {
  const orders = (facts.recentOrders ?? []) as Array<Record<string, unknown>>;
  const favorites = (facts.favoriteProducts ?? []) as Array<{ name: string; quantity: number }>;
  if (/recom|comer|gusta/.test(message)) {
    if (!favorites.length) {
      return 'Todavía no tengo suficiente historial. Puedo aprender preferencias no sensibles cuando actives la memoria.';
    }
    return `Según tus pedidos, sueles elegir ${favorites
      .slice(0, 3)
      .map((item) => item.name)
      .join(', ')}. Priorizaré opciones disponibles y comercios abiertos.`;
  }
  if (/último|ultimo|pedido/.test(message)) {
    const latest = orders[0];
    if (!latest) return 'Aún no tienes pedidos registrados.';
    return `Tu pedido más reciente es ${latest.order_number}, está en “${latest.status}” y tiene un total de ${cop(
      latest.total_amount,
    )}.`;
  }
  if (/tarifa|servicio/.test(message)) {
    return 'La tarifa de servicio aparece antes de confirmar. Es independiente del domicilio y sostiene plataforma, soporte y seguimiento; nunca se cobra de forma oculta.';
  }
  return 'Puedo ayudarte a elegir productos, explicar precios, seguir pedidos y personalizar recomendaciones autorizadas.';
}

function answer(message: string, context: AssistantContext): string {
  const normalized = message.toLowerCase();
  if (context.roleScope === 'courier') return answerCourier(normalized, context.facts);
  if (context.roleScope === 'merchant') return answerMerchant(normalized, context.facts);
  if (context.roleScope === 'admin') return answerAdmin(normalized, context.facts);
  return answerCustomer(normalized, context.facts);
}

function explicitFoodPreference(message: string): string | null {
  const match = message.match(/(?:me gusta|me encantan|prefiero)\s+(.{2,80})/i);
  return match?.[1]?.replace(/[.!?]+$/, '').trim() || null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 });

  const supabase = getServiceClient();
  const userId = auth.session.user.id;
  const roleScope = roleScopeFor(auth.session.profile.role);
  const context = await buildContext(userId, roleScope);
  const reply = answer(parsed.data.message, context);

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const { data: owned } = await supabase
      .from('domi_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (!owned) conversationId = undefined;
  }
  if (!conversationId) {
    const { data: created } = await supabase
      .from('domi_conversations')
      .insert({
        user_id: userId,
        role_scope: roleScope,
        title: parsed.data.message.slice(0, 80),
        context_snapshot: { role_scope: roleScope },
      })
      .select('id')
      .single();
    if (created?.id) conversationId = String(created.id);
  }

  if (conversationId) {
    await supabase.from('domi_messages').insert([
      {
        conversation_id: conversationId,
        user_id: userId,
        sender_type: 'user',
        content: parsed.data.message,
      },
      {
        conversation_id: conversationId,
        user_id: userId,
        sender_type: 'assistant',
        content: reply,
        tool_result: { facts_used: Object.keys(context.facts) },
      },
    ]);
  }

  await supabase.from('domi_agent_profiles').upsert(
    {
      user_id: userId,
      role_scope: roleScope,
      assistant_name: 'Domi',
      memory_consent: parsed.data.allowMemory,
      personalization_enabled: true,
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  const preference =
    parsed.data.allowMemory && roleScope === 'customer'
      ? explicitFoodPreference(parsed.data.message)
      : null;
  if (preference) {
    await supabase.from('domi_memories').upsert(
      {
        user_id: userId,
        category: 'food_preference',
        memory_key: `explicit:${preference.toLowerCase().slice(0, 50)}`,
        memory_value: { preference },
        confidence: 1,
        source_type: 'explicit_user',
        is_sensitive: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,category,memory_key' },
    );
  }

  return NextResponse.json({
    conversationId,
    reply,
    suggestions: context.suggestions,
    roleScope,
    memoryEnabled: parsed.data.allowMemory,
  });
}
