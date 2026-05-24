import { NextResponse } from 'next/server';
import { loadMessages } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ messages: [] });

  const messages = await loadMessages(sessionId);
  return NextResponse.json({ messages });
}
