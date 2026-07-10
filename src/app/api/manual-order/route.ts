import { NextResponse } from 'next/server';
import { createBusinessManualOrderAction } from '@/app/actions/business-manual-orders';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await createBusinessManualOrderAction(body);
    if (res.error) return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    return NextResponse.json({ success: true, result: res });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message || 'error' }, { status: 500 });
  }
}
