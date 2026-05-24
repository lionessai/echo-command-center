export const dynamic = 'force-dynamic';
import { listFiles } from '@/lib/drive';
import { searchNotion } from '@/lib/notion';
import { loadMessages } from '@/lib/supabase';

export async function GET() {
  const results: Record<string, string> = {};

  // Check Drive
  try {
    const files = await listFiles('1ToVT8kAx6VwtZQ46z-brf8ujBKOjqNDS');
    results.drive = `✅ ${files.length} files in Echo Outputs`;
  } catch (e) {
    results.drive = `❌ ${e instanceof Error ? e.message : 'Failed'}`;
  }

  // Check Notion — search for databases directly
  try {
    const dbs = await searchNotion('Product Launch Roadmap');
    const dbCount = dbs.filter((r: { object: string }) => r.object === 'database').length;
    results.notion = dbCount > 0
      ? `✅ Product Launch Roadmap connected`
      : `⚠️ No databases found — share with Astra Echo integration`;
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
