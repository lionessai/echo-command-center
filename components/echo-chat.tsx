'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, BookOpen, FolderOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { label: 'Write SOP', prompt: 'Create a new SOP document for our Make.com scenario deployment process and save it to Echo Outputs in Drive.' },
  { label: 'List My Docs', prompt: 'List all documents currently in the Echo Outputs folder in Google Drive.' },
  { label: 'Log to Notion', prompt: 'Check what Notion databases I have access to and show me what\'s in the Product Launch Roadmap.' },
  { label: 'Agent Profile', prompt: 'Write an Agent Profile document for Astra (Systems Architect) and save it to the Echo Outputs folder.' },
];

export default function EchoChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`echo-${Date.now()}`);
  const [health, setHealth] = useState<Record<string, string> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Load health status
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setHealth(d.checks))
      .catch(() => {});
  }, []);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, sessionId }),
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err instanceof Error ? err.message : 'Something went wrong'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-teal-950/60 text-teal-300 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/^(#{1,3})\s(.+)$/gm, (_, h, t) => {
        const size = h.length === 1 ? 'text-lg font-bold text-teal-300' : h.length === 2 ? 'text-base font-semibold text-teal-400' : 'text-sm font-semibold text-teal-500';
        return `<p class="${size} mt-3 mb-1">${t}</p>`;
      })
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-300">$1</li>')
      .replace(/^→ (.+)$/gm, '<li class="ml-4 text-teal-400">→ $1</li>')
      .replace(/^📄 (.+)$/gm, '<li class="ml-4 text-emerald-400 font-medium">📄 $1</li>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-screen bg-[#050f0f]">
      {/* Header */}
      <div className="flex-none border-b border-teal-900/40 bg-[#071212] px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-900/60 border border-teal-700/40 flex items-center justify-center echo-glow">
              <BookOpen className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">Echo</h1>
              <p className="text-teal-500 text-xs">Documentation Agent · Lioness AI Systems</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {health && (
              <div className="flex gap-2">
                {Object.entries(health).map(([key, val]) => (
                  <Badge key={key} variant="outline" className={`text-xs border-teal-800/50 ${val.startsWith('✅') ? 'text-teal-400' : 'text-red-400'}`}>
                    {key}: {val.startsWith('✅') ? '✅' : '❌'}
                  </Badge>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => fetch('/api/health').then(r => r.json()).then(d => setHealth(d.checks))} className="text-teal-600 hover:text-teal-400">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center space-y-6 py-12">
              <div className="w-16 h-16 rounded-2xl bg-teal-900/40 border border-teal-800/40 flex items-center justify-center mx-auto echo-glow">
                <BookOpen className="w-8 h-8 text-teal-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Echo is ready</h2>
                <p className="text-teal-600 text-sm max-w-md mx-auto">
                  Documentation Agent online. I write SOPs, build logs, and keep everything organized in Drive + Notion.
                </p>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    className="text-left p-3 rounded-xl border border-teal-900/40 bg-teal-950/20 hover:bg-teal-900/30 hover:border-teal-700/50 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5 text-teal-500 group-hover:text-teal-400" />
                      <span className="text-xs font-medium text-teal-400">{action.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 group-hover:text-gray-400 line-clamp-2">{action.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-teal-900/60 border border-teal-800/40 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-teal-900/50 border border-teal-800/40 text-white'
                  : 'bg-[#071a1a] border border-teal-900/30 text-gray-200'
              }`}>
                {msg.role === 'assistant' ? (
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                {loading && i === messages.length - 1 && msg.role === 'assistant' && msg.content === '' && (
                  <div className="flex items-center gap-1.5 text-teal-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs">Documenting...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex-none border-t border-teal-900/40 bg-[#071212] px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 mb-2 px-1">
                <FolderOpen className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-xs text-teal-700">Echo Outputs · Notion · Supabase Memory</span>
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Echo to write a doc, create an SOP, log to Notion..."
                rows={2}
                className="w-full bg-[#071a1a] border border-teal-900/40 rounded-xl px-4 py-3 text-sm text-white placeholder-teal-800 resize-none focus:outline-none focus:border-teal-700/60 transition-colors"
              />
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-teal-700 hover:bg-teal-600 text-white h-12 w-12 p-0 rounded-xl flex-shrink-0 disabled:opacity-30"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
