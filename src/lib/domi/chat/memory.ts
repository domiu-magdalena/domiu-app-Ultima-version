import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  detectMemoryCandidate,
  isMemoryConfirmation,
  isMemoryRejection,
} from '@/lib/domi/security';
import type { DomiServerContext } from '@/lib/domi/server-context';
import {
  getPendingMemoryCandidate,
  markMemoryCandidate,
} from '@/lib/domi/server-security';
import {
  buildDomiAssistantPayload,
  saveDomiMemory,
  type DomiAssistantResponse,
} from '@/lib/domi/chat/protocol';
import type { DomiUserSettings } from '@/lib/domi/user-settings';

export interface DomiMemoryOutcome {
  assistant: DomiAssistantResponse;
  memoryState?: 'pending' | 'saved' | 'cancelled';
}

export async function processDomiMemory(args: {
  supabase: SupabaseClient;
  context: DomiServerContext;
  conversationId: string;
  message: string;
  settings: DomiUserSettings;
}): Promise<DomiMemoryOutcome | null> {
  const candidate = detectMemoryCandidate(args.message);

  if (!args.settings.memoryEnabled) {
    if (!candidate) return null;
    return {
      assistant: buildDomiAssistantPayload({
        message: 'Tu memoria personal está desactivada, por eso no guardaré esa preferencia. Puedes pedirme “activar la memoria” y confirmar la acción.',
        intent: 'memory_disabled',
        context: args.context,
        suggestedActions: ['Activar la memoria'],
      }),
    };
  }

  const pending = await getPendingMemoryCandidate(
    args.supabase,
    args.context.userId,
    args.conversationId,
  );

  if (pending && isMemoryConfirmation(args.message)) {
    await saveDomiMemory(args.supabase, args.context, {
      ...pending.candidate,
      explicitConsent: true,
    });
    await markMemoryCandidate(args.supabase, pending.messageId, 'saved');
    return {
      memoryState: 'saved',
      assistant: buildDomiAssistantPayload({
        message: `Listo, ${args.context.name.split(' ')[0]}. Guardé esa preferencia para ayudarte mejor en próximas conversaciones.`,
        intent: 'memory_saved',
        context: args.context,
        suggestedActions: args.settings.proactiveEnabled ? ['Preguntar qué recuerda Domi'] : [],
      }),
    };
  }

  if (pending && isMemoryRejection(args.message)) {
    await markMemoryCandidate(args.supabase, pending.messageId, 'cancelled');
    return {
      memoryState: 'cancelled',
      assistant: buildDomiAssistantPayload({
        message: 'Entendido. No guardaré esa información en tu memoria personal.',
        intent: 'memory_cancelled',
        context: args.context,
      }),
    };
  }

  if (candidate?.explicitConsent) {
    await saveDomiMemory(args.supabase, args.context, candidate);
    return {
      memoryState: 'saved',
      assistant: buildDomiAssistantPayload({
        message: `Listo. Guardé esta preferencia con tu autorización: “${candidate.text}”.`,
        intent: 'memory_saved',
        context: args.context,
        suggestedActions: args.settings.proactiveEnabled ? ['Preguntar qué recuerda Domi'] : [],
      }),
    };
  }

  if (candidate) {
    return {
      memoryState: 'pending',
      assistant: buildDomiAssistantPayload({
        message: `Entendí que prefieres “${candidate.text}”. ¿Autorizas que lo guarde para futuras conversaciones? Responde “sí” o “no”.`,
        intent: 'memory_confirmation',
        context: args.context,
        requiresConfirmation: true,
        riskLevel: 'medium',
        memoryCandidate: candidate,
        suggestedActions: ['Sí, recuérdalo', 'No lo guardes'],
      }),
    };
  }

  return null;
}
