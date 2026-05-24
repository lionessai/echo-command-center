// Notion API v2022-06-28 — direct fetch (bypasses @notionhq/client v5 SDK quirks)

const NOTION_VERSION = '2022-06-28';

function headers() {
  return {
    'Authorization': `Bearer ${process.env.NOTION_API_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export async function listDatabases() {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query: '', filter: { value: 'database', property: 'object' } }),
  });
  const data = await res.json();
  return (data.results || []) as Record<string, unknown>[];
}

export async function searchNotion(query: string) {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return (data.results || []) as Record<string, unknown>[];
}

export async function createNotionPage(
  databaseId: string,
  title: string,
  _properties?: Record<string, unknown>,
  content?: string
) {
  const children: unknown[] = [];
  if (content) {
    for (let i = 0; i < content.length; i += 1800) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: content.slice(i, i + 1800) } }] },
      });
    }
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
      },
      children,
    }),
  });
  return await res.json();
}

export async function queryDatabase(databaseId: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ page_size: 20 }),
  });
  const data = await res.json();
  return (data.results || []) as Record<string, unknown>[];
}

export async function appendToPage(pageId: string, content: string) {
  const children: unknown[] = [];
  for (let i = 0; i < content.length; i += 1800) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: content.slice(i, i + 1800) } }] },
    });
  }
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ children }),
  });
  return await res.json();
}
