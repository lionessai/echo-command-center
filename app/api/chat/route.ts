import Anthropic from '@anthropic-ai/sdk';
import { ECHO_SYSTEM_PROMPT } from '@/lib/echo-prompt';
import { saveMessage } from '@/lib/supabase';
import { listFiles, createFolder, writeDocument, moveFile, ECHO_OUTPUTS_FOLDER_ID } from '@/lib/drive';
import { listDatabases, createNotionPage, queryDatabase, appendToPage } from '@/lib/notion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Echo's tool definitions
const ECHO_TOOLS: Anthropic.Tool[] = [
  {
    name: 'drive_list_files',
    description: 'List files and folders in Google Drive. Search by name or list a specific folder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        folderId: { type: 'string', description: 'Folder ID to list. Defaults to Echo Outputs folder.' },
        query: { type: 'string', description: 'Search query to filter files by name.' },
      },
    },
  },
  {
    name: 'drive_create_folder',
    description: 'Create a new folder in Google Drive.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name of the new folder.' },
        parentId: { type: 'string', description: 'Parent folder ID. Defaults to Echo Outputs.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'drive_write_document',
    description: 'Create a new document in Google Drive with content. Use for SOPs, build logs, reports, and any documentation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'File name. Use format: YYYY-MM-DD - Type - Title' },
        content: { type: 'string', description: 'Full text content of the document.' },
        folderId: { type: 'string', description: 'Folder ID to save in. Defaults to Echo Outputs.' },
        asGoogleDoc: { type: 'boolean', description: 'Convert to Google Doc format.' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'drive_move_file',
    description: 'Move a file to a different folder in Google Drive.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fileId: { type: 'string', description: 'File ID to move.' },
        targetFolderId: { type: 'string', description: 'Destination folder ID.' },
        newName: { type: 'string', description: 'Optional new name for the file.' },
      },
      required: ['fileId', 'targetFolderId'],
    },
  },
  {
    name: 'notion_list_databases',
    description: 'List all Notion databases the integration has access to.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'notion_query_database',
    description: 'Get pages/entries from a Notion database.',
    input_schema: {
      type: 'object' as const,
      properties: {
        databaseId: { type: 'string', description: 'Notion database ID.' },
      },
      required: ['databaseId'],
    },
  },
  {
    name: 'notion_create_page',
    description: 'Create a new page/entry in a Notion database.',
    input_schema: {
      type: 'object' as const,
      properties: {
        databaseId: { type: 'string', description: 'Notion database ID to add the page to.' },
        title: { type: 'string', description: 'Page title.' },
        content: { type: 'string', description: 'Page body content.' },
      },
      required: ['databaseId', 'title'],
    },
  },
  {
    name: 'notion_append_to_page',
    description: 'Append content to an existing Notion page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Notion page ID to append to.' },
        content: { type: 'string', description: 'Content to append.' },
      },
      required: ['pageId', 'content'],
    },
  },
];

type ToolInput = Record<string, unknown>;

async function executeTool(toolName: string, input: ToolInput): Promise<string> {
  try {
    switch (toolName) {
      case 'drive_list_files': {
        const folderId = (input.folderId as string) || ECHO_OUTPUTS_FOLDER_ID;
        const files = await listFiles(folderId, input.query as string | undefined);
        return JSON.stringify({ files, count: files.length });
      }
      case 'drive_create_folder': {
        const parentId = (input.parentId as string) || ECHO_OUTPUTS_FOLDER_ID;
        const folder = await createFolder(input.name as string, parentId);
        return JSON.stringify({ success: true, folder });
      }
      case 'drive_write_document': {
        const folderId = (input.folderId as string) || ECHO_OUTPUTS_FOLDER_ID;
        const file = await writeDocument(
          input.name as string,
          input.content as string,
          folderId,
          input.asGoogleDoc as boolean | undefined
        );
        return JSON.stringify({ success: true, file });
      }
      case 'drive_move_file': {
        const file = await moveFile(
          input.fileId as string,
          input.targetFolderId as string,
          input.newName as string | undefined
        );
        return JSON.stringify({ success: true, file });
      }
      case 'notion_list_databases': {
        const databases = await listDatabases();
        const simplified = databases.map((db: Record<string, unknown>) => ({
          id: db.id,
          title: (db as { title?: Array<{ plain_text?: string }> }).title?.[0]?.plain_text || 'Untitled',
        }));
        return JSON.stringify({ databases: simplified });
      }
      case 'notion_query_database': {
        const pages = await queryDatabase(input.databaseId as string);
        return JSON.stringify({ pages: pages.slice(0, 10) });
      }
      case 'notion_create_page': {
        const page = await createNotionPage(
          input.databaseId as string,
          input.title as string,
          undefined,
          input.content as string | undefined
        );
        return JSON.stringify({ success: true, pageId: (page as { id: string }).id, url: (page as { url: string }).url });
      }
      case 'notion_append_to_page': {
        await appendToPage(input.pageId as string, input.content as string);
        return JSON.stringify({ success: true });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : 'Tool failed' });
  }
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured.' }, { status: 500 });
  }

  try {
    const { messages, sessionId = 'echo-main' } = await request.json();

    const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
    if (lastUser?.content) {
      await saveMessage({ session_id: sessionId, role: 'user', content: lastUser.content });
    }

    const now = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });

    const fullSystem = `${ECHO_SYSTEM_PROMPT}\n\n## CURRENT DATE & TIME\nRight now it is: ${now}\nUse ISO format (YYYY-MM-DD) for all file names and document headers.`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Agentic loop — up to 5 tool rounds
    let currentMessages = [...messages];
    let accumulatedText = '';
    let toolRounds = 0;
    const MAX_ROUNDS = 5;

    while (toolRounds < MAX_ROUNDS) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: fullSystem,
        messages: currentMessages,
        tools: ECHO_TOOLS,
      });

      const textBlocks = response.content.filter(b => b.type === 'text') as Anthropic.TextBlock[];
      if (textBlocks.length > 0) accumulatedText += textBlocks.map(b => b.text).join('');

      if (response.stop_reason !== 'tool_use') break;

      // Execute tools
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await executeTool(block.name, block.input as ToolInput),
        }))
      );

      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ];
      toolRounds++;
    }

    // Final streaming response
    const finalStream = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: fullSystem,
      messages: currentMessages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let finalText = '';
          for await (const event of finalStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
              finalText += event.delta.text;
            }
          }
          controller.close();
          const combined = accumulatedText ? accumulatedText + '\n\n' + finalText : finalText;
          if (combined) {
            await saveMessage({ session_id: sessionId, role: 'assistant', content: combined });
          }
        } catch (err) { controller.error(err); }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
    });
  } catch (error: unknown) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
