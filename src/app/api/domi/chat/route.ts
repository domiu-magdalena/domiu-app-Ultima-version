import { NextRequest } from 'next/server';
import { handleDomiChat } from '@/lib/domi/chat/handler';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  return handleDomiChat(request);
}
