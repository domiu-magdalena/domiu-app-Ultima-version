import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server-auth';
import { getServiceClient } from '@/lib/db/supabase';
import {
  detectDomiIntent,
  detectMemoryCandidate,
  evaluateDomiSecurity,
  isMemoryConfirmation,
  isMemoryRejection,
  memoryKey,
  type DomiMemoryCandidate,
  type DomiRiskLevel,
} from '@/lib/domi/security';
import { buildDomiServerContext, type DomiServerContext } from '@/lib/domi/server-context';
import {
  enforceDomiRateLimit,
  findIdempotentDomiResponse,
  getPendingMemoryCandidate,
  markMemoryCandidate,
  writeDomiAudit,
} from '@/lib/domi/server-security';
import { executeDomiCustomerTool } from '@/lib/domi/tools/customer-read';
import { planDomiCustomerTool } from '@/lib/domi/tools/planner';
import type { DomiNavigationLink } from '@/lib/domi/tools/types';

export const runtime = 'nodejs';
export const maxDuration = 15;

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
}).strict();

const clientContextSchema = z.object({
  path: z.string().max(240).optional(),
  module: z.string().max(60).optional(),
  screen: z.string().max(80).optional(),
  locale: z.string().max(24).optional(),
  timezone: z.string().max(64).optional(),
  cart: z.object({
    businessId: z.string().uuid().nullable().optional(),
    items: z.array(cartItemSchema).max(25).optional(),
  }).strict().nullable().optional(),
}).strict();

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  context: clientContextSchema.optional(),
}).strict();

const ROLE_INTRO: Record<string, string> = {
  customer: 'Puedo ayudarte a buscar productos, verificar tu carrito y consultar exclusivamente tus pedidos.',
  merchant: 'Puedo ayudarte con jornadas, pedidos, catálogo, inventario y métricas de tu comercio.',
  courier: 'Puedo ayudarte con jornadas, pedidos asignados, rutas, ganancias y liquidaciones.',
  admin: 'Puedo ayudarte con la operación, pedidos, comercios, repartidores, reportes, finanzas y auditoría.',
};

interface DomiAssistantResponse {
  message: string;
  intent: string;
  role: string;
  requiresTool: boolean;
  tool: string | null;
  toolArguments: Record<string, unknown> | null;
  toolData: Record<string, unknown> | null;
  requiresConfirmation: boolean;
  riskLevel: DomiRiskLevel;
  memoryCandidate: DomiMemoryCandidate | null;
  suggestedActions: string[];
  navigation: DomiNavigationLink[];
  escalateToHuman: boolean;
}

function responseHeaders(requestId: string, extra?: Record<string, string>) {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'X-Domi-Request-Id': requestId,
    ...extra,
  };
}

function assistantPayload(args: {
  message: string;
  intent: string;
  context: DomiServerContext;
  riskLevel?: DomiRiskLevel;
  requiresConfirmation?: boolean;
  memoryCandidate?: DomiMemoryCandidate | null;
  suggestedActions?: string[];
  navigation?: DomiNavigationLink[];
  tool?: string | null;
  toolArguments?: Record<string, unknown> | null;
  toolData?: Record<string, unknown> | null;
}): DomiAssistantResponse {
  return {
    message: args.message,
    intent: args.intent,
    role: args.context.role,
    requiresTool: Boolean(args.tool),
    tool: args.tool || null,
    toolArguments: args.toolArguments || null,
    toolData: args.toolData || null,
    requiresConfirmation: Boolean(args.requiresConfirmation),
    riskLevel: args.riskLevel || 'low',
    memoryCandidate: args.memoryCandidate || null,
    suggestedActions: args.suggestedActions || [],
    navigation: args.navigation || [],
    escalateToHuman: false,
  };
}

function buildKnowledgeAnswer(
  context: DomiServerContext,
  message: string,
  knowledge: Array<{ title: string; content: string }>,
) {
  const normalized = message.toLocaleLowerCase('es');
  const words = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((word) => word.length >= 5)
    .slice(0, 16);
  const relevant = knowledge.find((article) => {
    const haystack = `${article.title} ${article.content}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es');
    return words.some((word) => haystack.includes(word));
  });
  if (relevant) return `${relevant.title}: ${relevant.content}`;

  if (normalized.includes('ganancia') || normalized.includes('liquid')) {
    return context.role === 'courier'
      ? 'Tu ganancia neta corresponde a tu parte del domicilio. En Liquidaciones puedes revisar por separado cuánto debe pagarte DomiU y cuánto debes entregar cuando recibiste pagos en efectivo.'
      : 'Una liquidación compara quién recibió el dinero con los valores que pertenecen al comercio, al repartidor y a DomiU. Cada movimiento debe conservar relación con su pedido.';
  }

  if (normalized.includes('abrir') || normalized.includes('jornada') || normalized.includes('turno')) {
    return context.role === 'merchant'
      ? 'Abre la jornada desde el panel principal de tu comercio. Mientras esté cerrada, el sistema debe impedir pedidos nuevos.'
      : context.role === 'courier'
        ? 'Inicia tu jornada desde el panel principal. Debes tener la jornada abierta y aparecer disponible para aceptar pedidos.'
        : 'Las jornadas permiten organizar horas, pedidos y movimientos financieros de cada día de trabajo.';
  }

  const firstName = context.name.split(' ')[0] || 'Hola';
  const screen = context.client.path ? ` Estás en ${context.client.path}.` : '';
  return `${firstName}, soy Domi. ${ROLE_INTRO[context.role]}${screen} No inventaré datos que no estén registrados o verificados.`;
}

async function saveMemory(
  supabase: ReturnType<typeof getServiceClient>,
  context: DomiServerContext,
  candidate: DomiMemoryCandidate,
) {
  const { error } = await supabase.from('domi_user_memory').upsert(
    {
      user_id: context.userId,
      memory_key: memoryKey(candidate.text),
      memory_value: { text: candidate.text },
      memory_type: candidate.type,
      confidence: 1,
      source: 'explicit',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,memory_key' },
  );
  if (error) throw new Error('memory_write_failed');
}

async function insertAssistantMessage(args: {
  supabase: ReturnType<typeof getServiceClient>;
  context: DomiServerContext;
  conversationId: string;
  assistant: DomiAssistantResponse;
  memoryState?: 'pending' | 'saved' | 'cancelled';
  mode?: 'knowledge' | 'memory' | 'security' | 'tool';
}) {
  const mode = args.mode || (args.assistant.tool ? 'tool' : 'knowledge');
  const { error } = await args.supabase.from('domi_messages').insert({
    conversation_id: args.conversationId,
    user_id: args.context.userId,
    role: 'assistant',
    content: args.assistant.message,
    model: mode === 'tool' ? 'domi-secure-tools-v1' : 'domi-secure-knowledge-v2',
    metadata: {
      mode,
      requestId: args.context.requestId,
      sessionId: args.context.sessionId,
      response: args.assistant,
      memoryCandidate: args.assistant.memoryCandidate,
      memoryState: args.memoryState || null,
    },
  });
  if (error) throw new Error('assistant_message_write_failed');
}

async function touchConversation(
  supabase: ReturnType<typeof getServiceClient>,
  conversationId: string,
  userId: string,
) {
  await supabase
    .from('domi_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId);
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let context: DomiServerContext | null = null;
  let conversationId: string | null = null;
  let intent = 'general_question';
  let messageLength = 0;

  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status, headers: responseHeaders('unauthenticated') },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Solicitud inválida' },
      { status: 400, headers: responseHeaders('invalid-json') },
    );
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Escribe un mensaje válido y vuelve a intentarlo' },
      { status: 400, headers: responseHeaders('invalid-payload') },
    );
  }

  const supabase = getServiceClient();
  messageLength = parsed.data.message.length;
  intent = detectDomiIntent(parsed.data.message);

  try {
    context = await buildDomiServerContext({
      request,
      supabase,
      profile: auth.session.profile,
      user: auth.session.user,
      clientContext: parsed.data.context,
      requestId: parsed.data.requestId,
    });

    if (context.accountStatus !== 'active') {
      await writeDomiAudit({
        supabase,
        context,
        result: 'blocked',
        intent,
        messageLength,
        reason: 'inactive_account',
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: 'Tu cuenta no está activa. Comunícate con soporte para revisar el acceso.' },
        { status: 403, headers: responseHeaders(context.requestId) },
      );
    }

    const duplicate = await findIdempotentDomiResponse(supabase, context.userId, context.requestId);
    if (duplicate) {
      const previousResponse = duplicate.metadata.response as DomiAssistantResponse | undefined;
      const previousMode = typeof duplicate.metadata.mode === 'string' ? duplicate.metadata.mode : 'knowledge';
      return NextResponse.json(
        {
          conversationId: duplicate.conversationId,
          answer: duplicate.answer,
          assistant: previousResponse || assistantPayload({ message: duplicate.answer, intent, context }),
          mode: previousMode,
          model: previousMode === 'tool' ? 'domi-secure-tools-v1' : 'domi-secure-knowledge-v2',
          requestId: context.requestId,
          idempotent: true,
        },
        { headers: responseHeaders(context.requestId, { 'X-Domi-Idempotent': 'true' }) },
      );
    }

    const rateLimit = await enforceDomiRateLimit(supabase, context.userId);
    if (!rateLimit.allowed) {
      await writeDomiAudit({
        supabase,
        context,
        result: 'blocked',
        intent,
        messageLength,
        reason: 'rate_limit',
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: 'Has enviado varios mensajes muy rápido. Espera un momento y vuelve a intentarlo.' },
        {
          status: 429,
          headers: responseHeaders(context.requestId, {
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          }),
        },
      );
    }

    if (parsed.data.conversationId) {
      const { data: ownedConversation } = await supabase
        .from('domi_conversations')
        .select('id,user_id,role,status')
        .eq('id', parsed.data.conversationId)
        .maybeSingle();

      if (!ownedConversation || ownedConversation.user_id !== context.userId) {
        await writeDomiAudit({
          supabase,
          context,
          result: 'blocked',
          intent,
          messageLength,
          conversationId: parsed.data.conversationId,
          reason: 'conversation_not_owned',
          durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
          { error: 'La conversación no está disponible para esta cuenta.' },
          { status: 404, headers: responseHeaders(context.requestId) },
        );
      }
      if (ownedConversation.status !== 'active') {
        return NextResponse.json(
          { error: 'Esta conversación ya está cerrada.' },
          { status: 409, headers: responseHeaders(context.requestId) },
        );
      }
      conversationId = String(ownedConversation.id);
    }

    if (!conversationId) {
      const { data: conversation, error } = await supabase
        .from('domi_conversations')
        .insert({
          user_id: context.userId,
          role: context.role,
          title: parsed.data.message.slice(0, 80),
          metadata: {
            tenantId: context.tenantId,
            tenantType: context.tenantType,
            path: context.client.path,
            locale: context.client.locale,
          },
        })
        .select('id')
        .single();
      if (error || !conversation) throw new Error('conversation_create_failed');
      conversationId = String(conversation.id);
    }

    const security = evaluateDomiSecurity(parsed.data.message);
    const { error: userMessageError } = await supabase.from('domi_messages').insert({
      conversation_id: conversationId,
      user_id: context.userId,
      role: 'user',
      content: security.blocked ? `[Mensaje bloqueado por seguridad: ${security.reason}]` : parsed.data.message,
      metadata: {
        requestId: context.requestId,
        sessionId: context.sessionId,
        tenantType: context.tenantType,
        intent,
        path: context.client.path,
        securityReason: security.reason || null,
      },
    });
    if (userMessageError) throw new Error('user_message_write_failed');

    if (security.blocked) {
      const assistant = assistantPayload({
        message: security.message || 'No puedo completar esa solicitud.',
        intent: 'security_refusal',
        context,
        riskLevel: security.riskLevel,
        suggestedActions: ['Continuar con una función permitida para tu perfil'],
      });
      await insertAssistantMessage({ supabase, context, conversationId, assistant, mode: 'security' });
      await writeDomiAudit({
        supabase,
        context,
        result: 'blocked',
        intent: 'security_refusal',
        messageLength,
        conversationId,
        reason: security.reason,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          conversationId,
          answer: assistant.message,
          assistant,
          mode: 'security',
          model: 'domi-secure-knowledge-v2',
          requestId: context.requestId,
        },
        { headers: responseHeaders(context.requestId) },
      );
    }

    const pendingMemory = await getPendingMemoryCandidate(supabase, context.userId, conversationId);
    if (pendingMemory && isMemoryConfirmation(parsed.data.message)) {
      await saveMemory(supabase, context, { ...pendingMemory.candidate, explicitConsent: true });
      await markMemoryCandidate(supabase, pendingMemory.messageId, 'saved');
      const assistant = assistantPayload({
        message: `Listo, ${context.name.split(' ')[0]}. Guardé esa preferencia para ayudarte mejor en próximas conversaciones.`,
        intent: 'memory_saved',
        context,
        suggestedActions: ['Preguntar qué recuerda Domi'],
      });
      await insertAssistantMessage({ supabase, context, conversationId, assistant, memoryState: 'saved', mode: 'memory' });
      await writeDomiAudit({
        supabase,
        context,
        result: 'success',
        intent: 'memory_saved',
        messageLength,
        conversationId,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { conversationId, answer: assistant.message, assistant, mode: 'memory', model: 'domi-secure-knowledge-v2', requestId: context.requestId },
        { headers: responseHeaders(context.requestId) },
      );
    }

    if (pendingMemory && isMemoryRejection(parsed.data.message)) {
      await markMemoryCandidate(supabase, pendingMemory.messageId, 'cancelled');
      const assistant = assistantPayload({
        message: 'Entendido. No guardaré esa información en tu memoria personal.',
        intent: 'memory_cancelled',
        context,
      });
      await insertAssistantMessage({ supabase, context, conversationId, assistant, memoryState: 'cancelled', mode: 'memory' });
      await writeDomiAudit({
        supabase,
        context,
        result: 'success',
        intent: 'memory_cancelled',
        messageLength,
        conversationId,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { conversationId, answer: assistant.message, assistant, mode: 'memory', model: 'domi-secure-knowledge-v2', requestId: context.requestId },
        { headers: responseHeaders(context.requestId) },
      );
    }

    const memoryCandidate = detectMemoryCandidate(parsed.data.message);
    if (memoryCandidate?.explicitConsent) {
      await saveMemory(supabase, context, memoryCandidate);
      const assistant = assistantPayload({
        message: `Listo. Guardé esta preferencia con tu autorización: “${memoryCandidate.text}”.`,
        intent: 'memory_saved',
        context,
        suggestedActions: ['Preguntar qué recuerda Domi'],
      });
      await insertAssistantMessage({ supabase, context, conversationId, assistant, memoryState: 'saved', mode: 'memory' });
      await writeDomiAudit({
        supabase,
        context,
        result: 'success',
        intent: 'memory_saved',
        messageLength,
        conversationId,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { conversationId, answer: assistant.message, assistant, mode: 'memory', model: 'domi-secure-knowledge-v2', requestId: context.requestId },
        { headers: responseHeaders(context.requestId) },
      );
    }

    if (memoryCandidate) {
      const assistant = assistantPayload({
        message: `Entendí que prefieres “${memoryCandidate.text}”. ¿Autorizas que lo guarde para futuras conversaciones? Responde “sí” o “no”.`,
        intent: 'memory_confirmation',
        context,
        requiresConfirmation: true,
        riskLevel: 'medium',
        memoryCandidate,
        suggestedActions: ['Sí, recuérdalo', 'No lo guardes'],
      });
      await insertAssistantMessage({ supabase, context, conversationId, assistant, memoryState: 'pending', mode: 'memory' });
      await writeDomiAudit({
        supabase,
        context,
        result: 'success',
        intent: 'memory_confirmation',
        messageLength,
        conversationId,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { conversationId, answer: assistant.message, assistant, mode: 'memory', model: 'domi-secure-knowledge-v2', requestId: context.requestId },
        { headers: responseHeaders(context.requestId) },
      );
    }

    const toolPlan = planDomiCustomerTool(context, parsed.data.message);
    if (toolPlan) {
      intent = toolPlan.intent;
      const toolResult = await executeDomiCustomerTool(supabase, context, toolPlan);
      const assistant = assistantPayload({
        message: toolResult.message,
        intent,
        context,
        tool: toolResult.name,
        toolArguments: toolPlan.arguments,
        toolData: toolResult.data,
        suggestedActions: toolResult.suggestedActions,
        navigation: toolResult.navigation,
      });
      await insertAssistantMessage({ supabase, context, conversationId, assistant, mode: 'tool' });
      await touchConversation(supabase, conversationId, context.userId);
      await writeDomiAudit({
        supabase,
        context,
        result: toolResult.success ? 'success' : 'blocked',
        intent,
        messageLength,
        conversationId,
        reason: toolResult.success ? null : 'tool_denied',
        durationMs: Date.now() - startedAt,
        toolName: toolResult.name,
        toolRecordCount: toolResult.recordCount,
        toolSuccess: toolResult.success,
      });
      return NextResponse.json(
        {
          conversationId,
          answer: assistant.message,
          assistant,
          mode: 'tool',
          model: 'domi-secure-tools-v1',
          requestId: context.requestId,
        },
        { headers: responseHeaders(context.requestId, { 'X-Domi-Tool': toolResult.name }) },
      );
    }

    const { data: knowledge, error: knowledgeError } = await supabase
      .from('domi_knowledge_articles')
      .select('title,content')
      .eq('is_active', true)
      .or(`audience_role.is.null,audience_role.eq.${context.role}`)
      .limit(30);
    if (knowledgeError) throw new Error('knowledge_read_failed');

    const knowledgeRows = (knowledge ?? []).map((item) => ({
      title: String(item.title),
      content: String(item.content),
    }));
    const answer = buildKnowledgeAnswer(context, parsed.data.message, knowledgeRows);
    const assistant = assistantPayload({
      message: answer,
      intent,
      context,
      suggestedActions: context.role === 'admin'
        ? ['Revisar pedidos', 'Consultar liquidaciones']
        : context.role === 'merchant'
          ? ['Revisar pedidos', 'Consultar inventario']
          : context.role === 'courier'
            ? ['Revisar pedidos asignados', 'Consultar ganancias']
            : ['Buscar productos', 'Consultar mis pedidos', 'Consultar mi carrito'],
    });

    await insertAssistantMessage({ supabase, context, conversationId, assistant, mode: 'knowledge' });
    await touchConversation(supabase, conversationId, context.userId);
    await writeDomiAudit({
      supabase,
      context,
      result: 'success',
      intent,
      messageLength,
      conversationId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        conversationId,
        answer: assistant.message,
        assistant,
        context: {
          role: context.role,
          permissions: context.permissions,
          path: context.client.path,
          locale: context.client.locale,
          timezone: context.client.timezone,
          tenantType: context.tenantType,
        },
        mode: 'knowledge',
        model: 'domi-secure-knowledge-v2',
        requestId: context.requestId,
      },
      { headers: responseHeaders(context.requestId) },
    );
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'unknown_error';
    console.error('[Domi] Secure chat failed:', reason);
    if (context) {
      await writeDomiAudit({
        supabase,
        context,
        result: 'error',
        intent,
        messageLength,
        conversationId,
        reason,
        durationMs: Date.now() - startedAt,
      });
    }
    return NextResponse.json(
      { error: 'Domi no pudo completar la solicitud. Inténtalo nuevamente.' },
      { status: 500, headers: responseHeaders(context?.requestId || 'server-error') },
    );
  }
}
