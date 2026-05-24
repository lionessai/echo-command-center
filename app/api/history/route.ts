import { NextResponse } from 'next/server';
import { loadMemory } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ messages: [] });

  const memory = await loadMemory(sessionId, 50);
  return NextResponse.json({ messages: memory });
}
