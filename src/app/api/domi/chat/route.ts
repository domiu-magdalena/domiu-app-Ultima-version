import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server-auth';
import { getServiceClient } from '@/lib/db/supabase';
import { ADMIN_ROLES } from '@/types/auth';

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  conversationId: z.string().uuid().optional(),
  allowMemory: z.boolean().default(false),
});

type RoleScope = 'customer' | 'merchant' | 'courier' | 'admin';

type Context = {
  roleScope: RoleScope;
  facts: Record<string, unknown>;
  suggestions: string[];
};

function roleScopeFor(role: string): RoleScope {
  if (ADMIN_ROLES.includes(role)) return 'admin';
  if (role === 'business') return 'merchant';
  if (role === 'courier') return 'courier';
  return 'customer';
}

function cop(value: unknown) {
  const amount = Number(value ?? 0);
  return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(
    Number.isFinite(amount) ? Math.round(amount) : 0,
  )}`;
}

async function buildContext(userId: string, roleScope: RoleScope): Promise<Context> {
  const supabase = getServiceClient();

  if (roleScope === 'courier') {
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
      roleScope,
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

  if (roleScope === 'merchant') {
    const { data: business } = await supabase
      .from('businesses')
      .select('id,name,is_open,owner_id')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .maybeSingle();
    const businessId = business?.id ? String(business.id) : '';
    const [qualityResult, ordersResult] = await Promise.all([
      businessId
        ? supabase
            .from('merchant_catalog_quality_v')
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      businessId
        ? supabase
            .from('orders')
            .select('status,subtotal,business_earnings,created_at')
            .eq('business_id', businessId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const delivered = (ordersResult.data ?? []).filter((order) => order.status === 'delivered');
    const productSales = delivered.reduce(
      (sum, order) => sum + Number(order.business_earnings ?? order.subtotal ?? 0),
      0,
    );
    return {
      roleScope,
      facts: {
        business: business ?? null,
        catalog: qualityResult.data ?? null,
        deliveredOrders: delivered.length,
        productSales,
      },
      suggestions: [
        'Revisa mi inventario y catálogo',
        '¿Cuánto he vendido en productos?',
        '¿Cómo abro o cierro el comercio?',
      ],
    };
  }

  if (roleScope === 'admin') {
    const today = new Date().toISOString().slice(0, 10);
    const [summaryResult, openBusinessesResult, activeOrdersResult] = await Promise.all([
      supabase
        .from('daily_company_operations_v')
        .select('*')
        .eq('operation_date', today)
        .maybeSingle(),
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
      roleScope,
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

  const { data: orders } = await supabase
    .from('orders')
    .select('id,order_number,status,business_id,total_amount,created_at')
    .eq('customer_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  const orderIds = (orders ?? []).map((order) => String(order.id));
  const { data: items } = orderIds.length
    ? await supabase
        .from('order_items')
        .select('product_id,quantity,products(name,business_id)')
        .in('order_id', orderIds)
    : { data: [] };
  const productFrequency = new Map<string, { name: string; quantity: number }>();
  for (const item of items ?? []) {
    const relation = item.products as { name?: string } | Array<{ name?: string }> | null;
    const name = Array.isArray(relation) ? relation[0]?.name : relation?.name;
    if (!name) continue;
    const current = productFrequency.get(name) ?? { name, quantity: 0 };
    current.quantity += Number(item.quantity ?? 0);
    productFrequency.set(name, current);
  }
  return {
    roleScope,
    facts: {
      recentOrders: orders ?? [],
      favoriteProducts: [...productFrequency.values()]
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

function answer(message: string, context: Context): string {
  const normalized = message.toLowerCase();
  const facts = context.facts;

  if (context.roleScope === 'courier') {
    const balance = (facts.balance ?? {}) as Record<string, unknown>;
    const today = (facts.today ?? {}) as Record<string, unknown>;
    if (normalized.includes('saldo') || normalized.includes('debo') || normalized.includes('debe')) {
      const companyOwes = Number(balance.company_owes_courier_cop ?? 0);
      const courierOwes = Number(balance.courier_owes_company_cop ?? 0);
      if (companyOwes > 0) {
        return `DomiU te debe ${cop(companyOwes)}. Ese saldo proviene de tus ganancias registradas menos los pagos y el efectivo que hayas cobrado.`;
      }
      if (courierOwes > 0) {
        return `Debes entregar ${cop(courierOwes)} a DomiU. Normalmente ocurre cuando cobras pedidos en efectivo: el sistema descuenta tu ganancia y deja pendiente únicamente el dinero de la empresa y del comercio.`;
      }
      return 'Tu saldo con DomiU está en cero. No hay una obligación pendiente registrada entre la empresa y tú.';
    }
    if (normalized.includes('gan') || normalized.includes('hoy')) {
      return `Hoy tienes ${Number(today.completed_deliveries ?? 0)} domicilios completados y una ganancia neta registrada de ${cop(
        today.courier_net_earnings_cop,
      )}. El efectivo cobrado a clientes es ${cop(today.cash_collected_cop)}.`;
    }
    if (normalized.includes('cerr') || normalized.includes('jornada')) {
      return 'Para cerrar tu jornada cambia tu estado a “Fuera de línea”. DomiU no permitirá el cierre mientras tengas un domicilio asignado, recogido o en tránsito.';
    }
    return 'Puedo explicarte tus ganancias, saldo, efectivo cobrado, jornada, pedidos activos y uso del mapa. Nunca modificaré una liquidación por mi cuenta.';
  }

  if (context.roleScope === 'merchant') {
    const business = (facts.business ?? {}) as Record<string, unknown>;
    const catalog = (facts.catalog ?? {}) as Record<string, unknown>;
    if (normalized.includes('invent') || normalized.includes('stock') || normalized.includes('catálogo') || normalized.includes('catalogo')) {
      return `Tu catálogo tiene ${Number(catalog.total_products ?? 0)} productos: ${Number(
        catalog.available_products ?? 0,
      )} disponibles, ${Number(catalog.low_stock_products ?? 0)} con inventario bajo, ${Number(
        catalog.out_of_stock_products ?? 0,
      )} agotados y ${Number(catalog.products_without_image ?? 0)} sin imagen. Te recomiendo corregir primero agotados, precios inválidos e imágenes pendientes de aprobación.`;
    }
    if (normalized.includes('vend') || normalized.includes('gan')) {
      return `El comercio ha registrado ${Number(facts.deliveredOrders ?? 0)} pedidos entregados y ${cop(
        facts.productSales,
      )} en ventas de productos. Esa cifra no incluye domicilio ni tarifa de servicio.`;
    }
    if (normalized.includes('abr') || normalized.includes('cerr') || normalized.includes('jornada')) {
      return `El comercio aparece ${business.is_open ? 'abierto' : 'cerrado'}. Usa el control de operación del dashboard. Si está cerrado no podrá recibir pedidos; tampoco podrás cerrarlo mientras existan pedidos activos.`;
    }
    return 'Puedo revisar tu catálogo, inventario, imágenes, ventas de productos, pedidos y estado de la jornada. Los cambios de inventario o menú siempre requerirán tu confirmación.';
  }

  if (context.roleScope === 'admin') {
    const today = (facts.today ?? {}) as Record<string, unknown>;
    if (normalized.includes('resumen') || normalized.includes('hoy') || normalized.includes('oper')) {
      return `Hoy hay ${Number(facts.activeOrders ?? 0)} pedidos activos y ${Number(
        facts.openBusinesses ?? 0,
      )} comercios abiertos. Se han creado ${Number(today.orders_created ?? 0)} pedidos, entregado ${Number(
        today.orders_delivered ?? 0,
      )} y cancelado ${Number(today.orders_cancelled ?? 0)}.`;
    }
    if (normalized.includes('gan') || normalized.includes('dinero') || normalized.includes('ingreso')) {
      return `La ganancia registrada de DomiU hoy es ${cop(today.domiu_earnings_cop)}: incluye comisión del domicilio y tarifa de servicio. Los comercios acumulan ${cop(
        today.business_earnings_cop,
      )} y los repartidores ${cop(today.courier_earnings_cop)}.`;
    }
    if (normalized.includes('liquid')) {
      return 'En Liquidaciones puedes ver cada jornada, ganancia neta, efectivo cobrado y saldo. Un pago no edita el saldo: crea un asiento auditable que lo compensa.';
    }
    return 'Puedo resumir la operación, explicar cifras, revisar comercios abiertos, pedidos, reportes y liquidaciones. Las acciones administrativas sensibles siempre necesitan confirmación humana.';
  }

  const recentOrders = (facts.recentOrders ?? []) as Array<Record<string, unknown>>;
  const favorites = (facts.favoriteProducts ?? []) as Array<{ name: string; quantity: number }>;
  if (normalized.includes('recom') || normalized.includes('comer') || normalized.includes('gusta')) {
    if (favorites.length) {
      return `Según tus pedidos recientes, sueles elegir ${favorites
        .slice(0, 3)
        .map((item) => item.name)
        .join(', ')}. Puedo usar esas preferencias para recomendarte productos disponibles, sin mostrarte opciones agotadas ni comercios cerrados.`;
    }
    return 'Todavía no tengo suficiente historial para personalizar una recomendación. Cuando hagas pedidos, podré aprender tus preferencias si activas la memoria de Domi.';
  }
  if (normalized.includes('último') || normalized.includes('ultimo') || normalized.includes('pedido')) {
    const latest = recentOrders[0];
    if (!latest) return 'Aún no tienes pedidos registrados.';
    return `Tu pedido más reciente es ${latest.order_number} y su estado actual es “${latest.status}”. El total registrado es ${cop(
      latest.total_amount,
    )}.`;
  }
  if (normalized.includes('tarifa') || normalized.includes('servicio')) {
    return 'La tarifa de servicio DomiU aparece antes de confirmar la compra. Ayuda a sostener la plataforma, soporte y seguimiento. Es independiente del domicilio y nunca se cobra de forma oculta.';
  }
  return 'Puedo ayudarte a encontrar productos, explicar precios, seguir pedidos y recomendar opciones según tus preferencias autorizadas.';
}

function extractFoodPreference(message: string): string | null {
  const match = message.match(/(?:me gusta|me encantan|prefiero)\s+(.{2,80})/i);
  return match?.[1]?.replace(/[.!?]+$/, '').trim() || null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const userId = auth.session.user.id;
  const roleScope = roleScopeFor(auth.session.profile.role);
  const context = await buildContext(userId, roleScope);
  const reply = answer(parsed.data.message, context);

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const { data: existing } = await supabase
      .from('domi_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (!existing) conversationId = undefined;
  }
  if (!conversationId) {
    const { data: conversation, error } = await supabase
      .from('domi_conversations')
      .insert({
        user_id: userId,
        role_scope: roleScope,
        title: parsed.data.message.slice(0, 80),
        context_snapshot: { role_scope: roleScope },
      })
      .select('id')
      .single();
    if (!error) conversationId = String(conversation.id);
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

  if (parsed.data.allowMemory && roleScope === 'customer') {
    const preference = extractFoodPreference(parsed.data.message);
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
  }

  return NextResponse.json({
    conversationId,
    reply,
    suggestions: context.suggestions,
    roleScope,
    memoryEnabled: parsed.data.allowMemory,
  });
}
