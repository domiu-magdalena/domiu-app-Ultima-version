import { NextRequest, NextResponse } from 'next/server';
import { searchManualOrderCustomers } from '@/lib/manual-orders/service';
import {
  ManualOrderError,
  consumeManualOrderRateLimit,
  manualOrderResponseHeaders,
  requireManualOrderActor,
} from '@/lib/manual-orders/security';
import { getServiceClient } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManualOrderActor();
    await consumeManualOrderRateLimit({
      supabase: getServiceClient(),
      actor,
      action: 'search',
      limit: 60,
    });
    const query = (request.nextUrl.searchParams.get('q') || '').trim();
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (query.length < 2) {
      return NextResponse.json({ customers: [] }, { headers: manualOrderResponseHeaders() });
    }
    const customers = await searchManualOrderCustomers(actor, query, businessId);
    return NextResponse.json({ customers }, { headers: manualOrderResponseHeaders() });
  } catch (cause) {
    const error = cause instanceof ManualOrderError
      ? cause
      : new ManualOrderError('No se pudieron buscar clientes.', 500, 'customer_search_failed');
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: manualOrderResponseHeaders() },
    );
  }
}
