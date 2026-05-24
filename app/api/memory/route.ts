export const dynamic = 'force-dynamic';
import { saveMessage, loadMessages } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') || 'echo-main';
  const messages = await loadMessages(sessionId);
  return Response.json({ messages });
}

export async function POST(request: Request) {
  const { session_id, role, content } = await request.json();
  await saveMessage({ session_id, role, content });
  return Response.json({ ok: true });
}
