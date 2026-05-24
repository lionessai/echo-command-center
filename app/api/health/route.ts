export const dynamic = 'force-dynamic';
import { listFiles } from '@/lib/drive';
import { listDatabases } from '@/lib/notion';
import { loadMessages } from '@/lib/supabase';

export async function GET() {
  const results: Record<string, string> = {};

  // Check Drive
  try {
    const files = await listFiles(process.env.ECHO_OUTPUTS_FOLDER_ID || '1ToVT8kAx6VwtZQ46z-brf8ujBKOjqNDS');
    results.drive = `✅ ${files.length} files in Echo Outputs`;
  } catch (e) {
    results.drive = `❌ ${e instanceof Error ? e.message : 'Failed'}`;
  }

  // Check Notion
  try {
    const dbs = await listDatabases();
    results.notion = `✅ ${dbs.length} database(s) accessible`;
  } catch (e) {
    results.notion = `❌ ${e instanceof Error ? e.message : 'Failed'}`;
  }

  // Check Memory
  try {
    const msgs = await loadMessages('echo-main');
    results.memory = `✅ ${msgs.length} messages stored`;
  } catch (e) {
    results.memory = `❌ ${e instanceof Error ? e.message : 'Failed'}`;
  }

  return Response.json({ status: 'Echo online', checks: results });
}
