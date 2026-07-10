import { NextResponse } from 'next/server';
import { getCurrentBusinessForManualOrder } from '@/app/actions/business-manual-orders';

export async function GET() {
  try {
    const biz = await getCurrentBusinessForManualOrder();
    return NextResponse.json({ success: true, business: biz });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message || 'error' }, { status: 500 });
  }
}
