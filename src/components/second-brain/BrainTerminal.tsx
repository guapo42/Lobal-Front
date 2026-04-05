'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { measureRender, logInteractionLatency } from '@/lib/perf';

/**
 * Variation 3.3 — The Terminal Interface
 * No visual graph. Only a search bar that responds to natural language
 * and SQL-like commands. Output rendered as minimalist text feed.
 */

interface KnowledgeEntry {
  id: string;
  type: 'note' | 'snippet' | 'task' | 'idea';
  title: string;
  content: string;
  project?: string;
  tags: string[];
  created: string;
}

const DEMO_KB: KnowledgeEntry[] = [
  { id: 'k1', type: 'note', title: 'Project Omega Architecture', content: 'Edge-first approach with GraphQL gateway. Local-first frontend using Zustand.', project: 'omega', tags: ['architecture', 'planning'], created: '2026-04-01' },
  { id: 'k2', type: 'snippet', title: 'GraphQL Schema', content: 'type Query {\n  tasks(filter: TaskFilter): [Task!]!\n  captures(limit: Int): [Capture!]!\n}', project: 'omega', tags: ['graphql', 'api'], created: '2026-04-02' },
  { id: 'k3', type: 'task', title: 'Migrate auth to OAuth2+PKCE', content: 'Replace session-based auth with OAuth2 PKCE flow for SPA. Use httpOnly refresh tokens.', project: 'omega', tags: ['auth', 'security'], created: '2026-04-03' },
  { id: 'k4', type: 'snippet', title: 'Zustand Persist Pattern', content: "const useStore = create<State>()(persist((set) => ({ ... }), { name: 'store-key' }));", project: 'external-lobe', tags: ['zustand', 'state'], created: '2026-04-04' },
  { id: 'k5', type: 'idea', title: 'WebGPU for graph rendering', content: 'Could use WebGPU compute shaders for force-directed graph layout. Would allow 10k+ nodes.', project: 'external-lobe', tags: ['performance', 'graph'], created: '2026-04-05' },
  { id: 'k6', type: 'note', title: 'ADHD UX Principles', content: '1. Zero-friction input (<3s capture)\n2. Visual time (not abstract)\n3. Object permanence cues\n4. Dopamine-aware task ordering', tags: ['ux', 'adhd', 'design'], created: '2026-03-28' },
  { id: 'k7', type: 'snippet', title: 'SVG Arc Path Function', content: 'function describeArc(cx, cy, r, startAngle, endAngle) {\n  // ... polar coordinate math\n}', project: 'external-lobe', tags: ['svg', 'math'], created: '2026-04-04' },
];

function search(query: string): { results: KnowledgeEntry[]; explanation: string } {
  const q = query.toLowerCase().trim();

  // SQL-like: show <type> linked to project:<name>
  const projectMatch = q.match(/(?:show|find|get)\s+(\w+)s?\s+(?:linked to|from|in)\s+project:(\w+)/);
  if (projectMatch) {
    const type = projectMatch[1] as string;
    const project = projectMatch[2];
    const results = DEMO_KB.filter(
      (e) => (e.type === type || type === 'all' || type === 'everything') && e.project === project
    );
    return { results, explanation: `Showing ${type}s in project:${project}` };
  }

  // Tag search: tagged <tag>
  const tagMatch = q.match(/tagged?\s+(\w+)/);
  if (tagMatch) {
    const tag = tagMatch[1];
    const results = DEMO_KB.filter((e) => e.tags.includes(tag));
    return { results, explanation: `Entries tagged "${tag}"` };
  }

  // Type filter: show all <type>
  const typeMatch = q.match(/(?:show|list|find)\s+(?:all\s+)?(\w+)s?$/);
  if (typeMatch) {
    const type = typeMatch[1];
    if (['note', 'snippet', 'task', 'idea'].includes(type)) {
      const results = DEMO_KB.filter((e) => e.type === type);
      return { results, explanation: `All ${type}s` };
    }
  }

  // Fallback: fuzzy keyword match
  const keywords = q.split(/\s+/);
  const results = DEMO_KB.filter((e) => {
    const haystack = `${e.title} ${e.content} ${e.tags.join(' ')} ${e.project || ''}`.toLowerCase();
    return keywords.some((k) => haystack.includes(k));
  });
  return { results, explanation: `Search results for "${query}"` };
}

const HELP_TEXT = `Available commands:
  show snippets linked to project:omega
  show notes linked to project:external-lobe
  find tasks in project:omega
  tagged architecture
  list all ideas
  <any keywords>    — fuzzy search

Type "help" to see this again.`;

interface HistoryEntry {
  type: 'command' | 'output' | 'system';
  text: string;
}

export default function BrainTerminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: 'system', text: '// The External Lobe — Knowledge Terminal v0.1' },
    { type: 'system', text: '// Type a query or "help" for commands.\n' },
  ]);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const perf = measureRender('BrainTerminal');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const queryStart = performance.now();
    const newHistory: HistoryEntry[] = [
      ...history,
      { type: 'command', text: `> ${trimmed}` },
    ];

    if (trimmed.toLowerCase() === 'help') {
      newHistory.push({ type: 'system', text: HELP_TEXT });
    } else if (trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      setInput('');
      return;
    } else {
      const { results, explanation } = search(trimmed);
      newHistory.push({ type: 'system', text: `— ${explanation} (${results.length} results)` });

      if (results.length === 0) {
        newHistory.push({ type: 'output', text: '  No matching entries found.' });
      } else {
        results.forEach((entry) => {
          const line = [
            `  [${entry.type.toUpperCase().padEnd(7)}]`,
            entry.title,
            entry.project ? `(project:${entry.project})` : '',
            `\n  ${entry.content.split('\n').join('\n  ')}`,
            `\n  tags: ${entry.tags.join(', ')} · ${entry.created}`,
          ]
            .filter(Boolean)
            .join(' ');
          newHistory.push({ type: 'output', text: line });
        });
      }
    }

    logInteractionLatency('BrainTerminal', 'query', performance.now() - queryStart);
    setHistory(newHistory);
    setInput('');
  }, [input, history]);

  const colorMap: Record<string, string> = {
    command: 'text-indigo-400',
    output: 'text-zinc-300',
    system: 'text-zinc-600',
  };

  return (
    <div
      className="flex flex-col h-full font-mono text-sm bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output */}
      <div ref={outputRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {history.map((entry, i) => (
          <motion.pre
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`whitespace-pre-wrap ${colorMap[entry.type]}`}
          >
            {entry.text}
          </motion.pre>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
        <span className="text-indigo-400 mr-2 select-none">query›</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder='try: show snippets linked to project:omega'
          className="flex-1 bg-transparent text-white placeholder-zinc-700 focus:outline-none"
          autoFocus
        />
      </div>
    </div>
  );
}
