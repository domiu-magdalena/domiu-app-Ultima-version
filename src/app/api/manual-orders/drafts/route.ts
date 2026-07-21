import { NextRequest, NextResponse } from 'next/server';
import { manualOrderDraftSchema } from '@/lib/manual-orders/schema';
import {
  listManualOrderDrafts,
  saveManualOrderDraft,
} from '@/lib/manual-orders/service';
import {
  ManualOrderError,
  assertSameOrigin,
  consumeManualOrderRateLimit,
  manualOrderResponseHeaders,
  requireManualOrderActor,
} from '@/lib/manual-orders/security';
import { getServiceClient } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const maxDuration = 10;

function errorResponse(cause: unknown) {
  const error = cause instanceof ManualOrderError
    ? cause
    : new ManualOrderError('No se pudo administrar el borrador.', 500, 'draft_failed');
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.status, headers: manualOrderResponseHeaders() },
  );
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManualOrderActor();
    await consumeManualOrderRateLimit({
      supabase: getServiceClient(),
      actor,
      action: 'search',
      limit: 60,
    });
    const businessId = request.nextUrl.searchParams.get('businessId');
    const drafts = await listManualOrderDrafts(actor, businessId);
    return NextResponse.json({ drafts }, { headers: manualOrderResponseHeaders() });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await requireManualOrderActor();
    await consumeManualOrderRateLimit({
      supabase: getServiceClient(),
      actor,
      action: 'draft',
      limit: 30,
    });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ManualOrderError('La solicitud no contiene JSON válido.', 400, 'invalid_json');
    }
    const parsed = manualOrderDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'El borrador contiene campos no válidos.',
          code: 'validation_failed',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400, headers: manualOrderResponseHeaders() },
      );
    }
    const draft = await saveManualOrderDraft(actor, parsed.data);
    return NextResponse.json(
      { draft },
      { status: parsed.data.id ? 200 : 201, headers: manualOrderResponseHeaders() },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
