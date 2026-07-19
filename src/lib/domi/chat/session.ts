import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth/server-auth';
import { getServiceClient } from '@/lib/db/supabase';
import { detectDomiIntent, evaluateDomiSecurity } from '@/lib/domi/security';
import { buildDomiServerContext, type DomiServerContext } from '@/lib/domi/server-context';
import {
  enforceDomiRateLimit,
  findIdempotentDomiResponse,
  writeDomiAudit,
} from '@/lib/domi/server-security';
import {
  buildDomiAssistantPayload,
  domiChatRequestSchema,
  domiModelForAssistant,
  domiResponseHeaders,
  insertDomiAssistantMessage,
  touchDomiConversation,
  type DomiAssistantResponse,
} from '@/lib/domi/chat/protocol';

export interface PreparedDomiChat {
  supabase: SupabaseClient;
  context: DomiServerContext;
  conversationId: string;
  message: string;
  messageLength: number;
  intent: string;
  startedAt: number;
}

export type PrepareDomiChatResult =
  | { response: NextResponse; prepared?: never }
  | { prepared: PreparedDomiChat; response?: never };

async function resolveConversation(args: {
  supabase: SupabaseClient;
  context: DomiServerContext;
  requestedId?: string;
  firstMessage: string;
}) {
  if (args.requestedId) {
    const { data } = await args.supabase
      .from('domi_conversations')
      .select('id,user_id,status')
      .eq('id', args.requestedId)
      .maybeSingle();
    if (!data || data.user_id !== args.context.userId) return 'not_owned' as const;
    if (data.status !== 'active') return 'closed' as const;
    return String(data.id);
  }

  const { data, error } = await args.supabase
    .from('domi_conversations')
    .insert({
      user_id: args.context.userId,
      role: args.context.role,
      title: args.firstMessage.slice(0, 80),
      metadata: {
        tenantId: args.context.tenantId,
        tenantType: args.context.tenantType,
        path: args.context.client.path,
        locale: args.context.client.locale,
      },
    })
    .select('id')
    .single();
  if (error || !data) throw new Error('conversation_create_failed');
  return String(data.id);
}

function duplicateResponse(args: {
  context: DomiServerContext;
  conversationId: string;
  answer: string;
  metadata: Record<string, unknown>;
  intent: string;
}) {
  const previous = args.metadata.response as DomiAssistantResponse | undefined;
  const mode = typeof args.metadata.mode === 'string' ? args.metadata.mode : 'knowledge';
  return NextResponse.json(
    {
      conversationId: args.conversationId,
      answer: args.answer,
      assistant: previous || buildDomiAssistantPayload({
        message: args.answer,
        intent: args.intent,
        context: args.context,
      }),
      mode,
      model: previous ? domiModelForAssistant(previous, mode) : 'domi-secure-knowledge-v2',
      requestId: args.context.requestId,
      idempotent: true,
    },
    {
      headers: domiResponseHeaders(args.context.requestId, {
        'X-Domi-Idempotent': 'true',
      }),
    },
  );
}

export async function prepareDomiChatSession(request: NextRequest): Promise<PrepareDomiChatResult> {
  const startedAt = Date.now();
  const supabase = getServiceClient();
  const auth = await requireAuth();
  if (auth.error) {
    return {
      response: NextResponse.json(
        { error: auth.error.message },
        { status: auth.error.status, headers: domiResponseHeaders('unauthenticated') },
      ),
    };
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      response: NextResponse.json(
        { error: 'Solicitud inválida' },
        { status: 400, headers: domiResponseHeaders('invalid-json') },
      ),
    };
  }

  const parsed = domiChatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: 'Escribe un mensaje válido y vuelve a intentarlo' },
        { status: 400, headers: domiResponseHeaders('invalid-payload') },
      ),
    };
  }

  const message = parsed.data.message;
  const messageLength = message.length;
  const intent = detectDomiIntent(message);
  const context = await buildDomiServerContext({
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
    return {
      response: NextResponse.json(
        { error: 'Tu cuenta no está activa. Comunícate con soporte para revisar el acceso.' },
        { status: 403, headers: domiResponseHeaders(context.requestId) },
      ),
    };
  }

  const duplicate = await findIdempotentDomiResponse(supabase, context.userId, context.requestId);
  if (duplicate) {
    return {
      response: duplicateResponse({
        context,
        conversationId: duplicate.conversationId,
        answer: duplicate.answer,
        metadata: duplicate.metadata,
        intent,
      }),
    };
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
    return {
      response: NextResponse.json(
        { error: 'Has enviado varios mensajes muy rápido. Espera un momento y vuelve a intentarlo.' },
        {
          status: 429,
          headers: domiResponseHeaders(context.requestId, {
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          }),
        },
      ),
    };
  }

  const resolved = await resolveConversation({
    supabase,
    context,
    requestedId: parsed.data.conversationId,
    firstMessage: message,
  });
  if (resolved === 'not_owned') {
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
    return {
      response: NextResponse.json(
        { error: 'La conversación no está disponible para esta cuenta.' },
        { status: 404, headers: domiResponseHeaders(context.requestId) },
      ),
    };
  }
  if (resolved === 'closed') {
    return {
      response: NextResponse.json(
        { error: 'Esta conversación ya está cerrada.' },
        { status: 409, headers: domiResponseHeaders(context.requestId) },
      ),
    };
  }
  const conversationId = resolved;

  const security = evaluateDomiSecurity(message);
  const { error: userMessageError } = await supabase.from('domi_messages').insert({
    conversation_id: conversationId,
    user_id: context.userId,
    role: 'user',
    content: security.blocked ? '[Solicitud bloqueada por las reglas de seguridad de Domi]' : message,
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
    const assistant = buildDomiAssistantPayload({
      message: security.message || 'No puedo completar esa solicitud.',
      intent: 'security_refusal',
      context,
      riskLevel: security.riskLevel,
      suggestedActions: ['Continuar con una función permitida para tu perfil'],
    });
    await insertDomiAssistantMessage({
      supabase,
      context,
      conversationId,
      assistant,
      mode: 'security',
    });
    await touchDomiConversation(supabase, conversationId, context.userId);
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
    return {
      response: NextResponse.json(
        {
          conversationId,
          answer: assistant.message,
          assistant,
          mode: 'security',
          model: domiModelForAssistant(assistant, 'security'),
          requestId: context.requestId,
        },
        { headers: domiResponseHeaders(context.requestId) },
      ),
    };
  }

  return {
    prepared: {
      supabase,
      context,
      conversationId,
      message,
      messageLength,
      intent,
      startedAt,
    },
  };
}
