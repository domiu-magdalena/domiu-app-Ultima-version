import { NextRequest, NextResponse } from 'next/server';
import { manualOrderPayloadSchema } from '@/lib/manual-orders/schema';
import { quoteManualOrder } from '@/lib/manual-orders/service';
import {
  ManualOrderError,
  assertSameOrigin,
  consumeManualOrderRateLimit,
  manualOrderResponseHeaders,
  requireManualOrderActor,
} from '@/lib/manual-orders/security';
import { getServiceClient } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await requireManualOrderActor();
    await consumeManualOrderRateLimit({
      supabase: getServiceClient(),
      actor,
      action: 'quote',
      limit: 45,
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ManualOrderError('La solicitud no contiene JSON válido.', 400, 'invalid_json');
    }
    const parsed = manualOrderPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Corrige los campos marcados antes de calcular.',
          code: 'validation_failed',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400, headers: manualOrderResponseHeaders() },
      );
    }

    const quote = await quoteManualOrder(actor, parsed.data);
    return NextResponse.json({ quote }, { headers: manualOrderResponseHeaders() });
  } catch (cause) {
    const error = cause instanceof ManualOrderError
      ? cause
      : new ManualOrderError('No se pudo calcular el pedido.', 500, 'quote_failed');
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: manualOrderResponseHeaders() },
    );
  }
}
