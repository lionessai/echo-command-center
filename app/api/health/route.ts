export const dynamic = 'force-dynamic';
import { listFiles } from '@/lib/drive';
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

  // Check Notion — direct fetch (bypasses SDK v5 quirks)
  try {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'Product Launch Roadmap', filter: { value: 'database', property: 'object' } }),
    });
    const data = await res.json();
    const dbs = data.results || [];
    results.notion = dbs.length > 0
      ? `✅ Product Launch Roadmap connected`
      : `⚠️ Not found — share database with Astra Echo integration`;
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
