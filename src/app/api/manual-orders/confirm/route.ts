import { NextRequest, NextResponse } from 'next/server';
import { manualOrderPayloadSchema } from '@/lib/manual-orders/schema';
import { confirmManualOrder } from '@/lib/manual-orders/service';
import {
  ManualOrderError,
  assertSameOrigin,
  consumeManualOrderRateLimit,
  manualOrderResponseHeaders,
  requireManualOrderActor,
} from '@/lib/manual-orders/security';
import { getServiceClient } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9:_-]{12,120}$/;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await requireManualOrderActor();
    await consumeManualOrderRateLimit({
      supabase: getServiceClient(),
      actor,
      action: 'confirm',
      limit: 8,
    });

    const idempotencyKey = (request.headers.get('idempotency-key') || '').trim();
    if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
      throw new ManualOrderError(
        'La solicitud no contiene una clave de idempotencia válida.',
        400,
        'idempotency_key_required',
      );
    }

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
          error: 'Corrige los campos marcados antes de confirmar.',
          code: 'validation_failed',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400, headers: manualOrderResponseHeaders() },
      );
    }

    const order = await confirmManualOrder(actor, parsed.data, idempotencyKey);
    return NextResponse.json(
      { order },
      {
        status: order.idempotent ? 200 : 201,
        headers: {
          ...manualOrderResponseHeaders(),
          'Idempotency-Replayed': order.idempotent ? 'true' : 'false',
        },
      },
    );
  } catch (cause) {
    const error = cause instanceof ManualOrderError
      ? cause
      : new ManualOrderError('No se pudo confirmar el pedido.', 500, 'confirmation_failed');
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: manualOrderResponseHeaders() },
    );
  }
}
