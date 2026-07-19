import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { domiResponseHeaders } from '@/lib/domi/chat/protocol';
import { prepareDomiChatSession } from '@/lib/domi/chat/session';
import { respondToDomiChat } from '@/lib/domi/chat/respond';

export async function handleDomiChat(request: NextRequest) {
  try {
    const prepared = await prepareDomiChatSession(request);
    if (prepared.response) return prepared.response;
    return respondToDomiChat(prepared.prepared);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'unknown_error';
    console.error('[Domi] Chat preparation failed:', reason);
    return NextResponse.json(
      { error: 'Domi no pudo iniciar la solicitud. Inténtalo nuevamente.' },
      {
        status: 500,
        headers: domiResponseHeaders('server-error'),
      },
    );
  }
}
