import { NextRequest, NextResponse } from 'next/server';
import { getManualOrderBootstrap } from '@/lib/manual-orders/service';
import {
  ManualOrderError,
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
    : new ManualOrderError('No se pudo cargar la información del pedido manual.', 500, 'bootstrap_failed');
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
    const data = await getManualOrderBootstrap(actor, businessId);
    return NextResponse.json(data, { headers: manualOrderResponseHeaders() });
  } catch (cause) {
    return errorResponse(cause);
  }
}
