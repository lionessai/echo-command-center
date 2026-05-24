/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '@notionhq/client';

let _client: Client | null = null;

function getClient(): Client {
  if (_client) return _client;
  _client = new Client({ auth: process.env.NOTION_API_TOKEN });
  return _client;
}

export async function listDatabases() {
  const notion = getClient();
  const res = await (notion as any).search({ query: '' });
  return (res.results as any[]).filter((r: any) => r.object === 'database');
}

export async function searchNotion(query: string) {
  const notion = getClient();
  const res = await (notion as any).search({ query });
  return res.results as any[];
}

export async function createNotionPage(
  databaseId: string,
  title: string,
  _properties?: Record<string, unknown>,
  content?: string
) {
  const notion = getClient();
  const children: any[] = [];
  if (content) {
    for (let i = 0; i < content.length; i += 1800) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: content.slice(i, i + 1800) } }] },
      });
    }
  }
  const res = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Name: { title: [{ text: { content: title } }] },
    } as any,
    children: children as any,
  });
  return res;
}

export async function queryDatabase(databaseId: string) {
  const notion = getClient();
  const res = await (notion as any).search({ query: '' });
  return (res.results as any[])
    .filter((r: any) => r.object === 'page' && r.parent?.database_id === databaseId)
    .slice(0, 20);
}

export async function appendToPage(pageId: string, content: string) {
  const notion = getClient();
  const children: any[] = [];
  for (let i = 0; i < content.length; i += 1800) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: content.slice(i, i + 1800) } }] },
    });
  }
  return await notion.blocks.children.append({ block_id: pageId, children });
}
