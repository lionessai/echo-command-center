import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

export async function saveMessage(msg: { session_id: string; role: string; content: string }) {
  const client = getClient();
  if (!client) return;
  await client.from('messages').insert(msg);
}

export async function loadMessages(sessionId: string) {
  const client = getClient();
  if (!client) return [];
  const { data } = await client
    .from('messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(50);
  return data || [];
}
