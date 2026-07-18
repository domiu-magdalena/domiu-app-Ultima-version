import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server-auth';
import { getServiceClient } from '@/lib/db/supabase';

export const runtime = 'nodejs';

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

const ROLE_INTRO: Record<string, string> = {
  customer: 'Puedo ayudarte a pedir, seguir pedidos y descubrir productos según tus preferencias guardadas.',
  merchant: 'Puedo ayudarte con jornadas, pedidos, catálogo, inventario, productos agotados y métricas del comercio.',
  courier: 'Puedo ayudarte con jornadas, pedidos, ganancias, comisiones y liquidaciones.',
  admin: 'Puedo ayudarte con operación, seguimiento, comercios, repartidores, reportes, finanzas y liquidaciones.',
};

function buildAnswer(role: string, message: string, knowledge: Array<{ title: string; content: string }>) {
  const normalized = message.toLocaleLowerCase('es');
  const words = normalized.split(/\s+/).filter((word) => word.length >= 5);
  const relevant = knowledge.find((article) => {
    const haystack = `${article.title} ${article.content}`.toLocaleLowerCase('es');
    return words.some((word) => haystack.includes(word));
  });
  if (relevant) return `${relevant.title}: ${relevant.content}`;
  if (normalized.includes('ganancia') || normalized.includes('liquid')) {
    return role === 'courier'
      ? 'Tu ganancia neta es el valor del domicilio menos la comisión operativa de DomiU. En Liquidaciones verás por separado cuánto te debe la empresa y cuánto debes entregar cuando hayas cobrado pedidos en efectivo.'
      : 'Una liquidación compara quién recibió el dinero del cliente con los valores que pertenecen al comercio, al repartidor y a DomiU. Cada movimiento debe quedar relacionado con un pedido.';
  }
  if (normalized.includes('abrir') || normalized.includes('jornada') || normalized.includes('turno')) {
    return role === 'merchant'
      ? 'Abre la jornada desde el panel principal del comercio. Mientras aparezca cerrado, el sistema bloqueará pedidos nuevos.'
      : role === 'courier'
        ? 'Inicia tu jornada desde el panel principal. Solo con jornada abierta y estado Disponible podrás aceptar pedidos.'
        : 'Las jornadas conservan horas, pedidos y movimientos financieros de cada día de trabajo.';
  }
  return `Soy Domi. ${ROLE_INTRO[role] || ROLE_INTRO.customer} Todavía estoy trabajando con el conocimiento verificado de DomiU; no inventaré datos que no existan en el sistema.`;
}

function extractPreference(message: string) {
  const match = message.match(/(?:recuerda que|me gusta|prefiero)\s+(.{3,180})/i);
  return match?.[1]?.trim() || null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Escribe un mensaje válido' }, { status: 400 });

  const supabase = getServiceClient();
  const userId = auth.session.user.id;
  const role = auth.session.profile.role;
  let conversationId = parsed.data.conversationId;

  if (conversationId) {
    const { data: owned } = await supabase
      .from('domi_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!owned) conversationId = undefined;
  }

  if (!conversationId) {
    const { data: conversation, error } = await supabase
      .from('domi_conversations')
      .insert({ user_id: userId, role, title: parsed.data.message.slice(0, 80) })
      .select('id')
      .single();
    if (error || !conversation) {
      return NextResponse.json({ error: error?.message || 'No se pudo abrir la conversación' }, { status: 500 });
    }
    conversationId = conversation.id;
  }

  await supabase.from('domi_messages').insert({
    conversation_id: conversationId,
    user_id: userId,
    role: 'user',
    content: parsed.data.message,
  });

  const preference = extractPreference(parsed.data.message);
  if (preference) {
    await supabase.from('domi_user_memory').upsert(
      {
        user_id: userId,
        memory_key: `preference_${preference.toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, '_').slice(0, 80)}`,
        memory_value: { text: preference },
        memory_type: 'preference',
        confidence: 1,
        source: 'explicit',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,memory_key' },
    );
  }

  const { data: knowledge } = await supabase
    .from('domi_knowledge_articles')
    .select('title,content')
    .eq('is_active', true)
    .or(`audience_role.is.null,audience_role.eq.${role}`)
    .limit(30);

  const knowledgeRows = (knowledge ?? []).map((item) => ({ title: String(item.title), content: String(item.content) }));
  const answer = buildAnswer(role, parsed.data.message, knowledgeRows);

  await supabase.from('domi_messages').insert({
    conversation_id: conversationId,
    user_id: userId,
    role: 'assistant',
    content: answer,
    model: 'domi-knowledge-v1',
    metadata: { mode: 'knowledge' },
  });
  await supabase.from('domi_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

  return NextResponse.json({ conversationId, answer, mode: 'knowledge', model: 'domi-knowledge-v1' });
}
