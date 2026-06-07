import { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, AlertTriangle, ShieldCheck, BookOpen, AlertCircle } from 'lucide-react';
import { useAiLawyerChat } from '../hooks/useAiLawyerChat';
import type { AiLawyerResponse } from '../api/ai.api';

/** Lightweight markdown renderer — handles bold, numbered lists, bullets, headings */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  function renderInline(line: string): React.ReactNode {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Heading: ## or ###
    if (/^#{2,3}\s/.test(trimmed)) {
      elements.push(
        <p key={key++} className="font-semibold text-slate-900 mt-2 mb-0.5">
          {renderInline(trimmed.replace(/^#{2,3}\s/, ''))}
        </p>
      );
      continue;
    }

    // Numbered list: 1. ...
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      elements.push(
        <div key={key++} className="flex gap-2">
          <span className="text-slate-500 flex-shrink-0 w-5 text-right">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Bullet: - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={key++} className="flex gap-2">
          <span className="text-slate-400 flex-shrink-0 mt-0.5">•</span>
          <span>{renderInline(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    elements.push(<p key={key++}>{renderInline(trimmed)}</p>);
  }

  return <div className="space-y-0.5 text-sm leading-relaxed">{elements}</div>;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  meta?: AiLawyerResponse;
}

interface AiLawyerChatPanelProps {
  onClose: () => void;
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  if (confidence === 'high') return null;
  if (confidence === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        <AlertTriangle className="h-2.5 w-2.5" />
        Review recommended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
      <AlertCircle className="h-2.5 w-2.5" />
      Verify before relying
    </span>
  );
}

function MessageMeta({ meta }: { meta: AiLawyerResponse }) {
  const hasHallucination = meta.unverifedCaseRefs.length > 0;
  const hasGrounding = meta.groundedCaseRefs.length > 0;

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex flex-wrap gap-1.5 items-center">
        <ConfidenceBadge confidence={meta.confidence} />

        {meta.isLegalResearch && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
            <BookOpen className="h-2.5 w-2.5" />
            Legal research
          </span>
        )}

        {hasGrounding && !hasHallucination && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <ShieldCheck className="h-2.5 w-2.5" />
            Grounded in {meta.groundedCaseRefs.join(', ')}
          </span>
        )}
      </div>

      {hasHallucination && (
        <div className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertCircle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
          <span>
            <strong>Unverified reference detected:</strong> "{meta.unverifedCaseRefs.join(', ')}" does not match any case in the system. Do not rely on this response.
          </span>
        </div>
      )}

      {meta.caveats && (
        <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
          <span>{meta.caveats}</span>
        </div>
      )}
    </div>
  );
}

export function AiLawyerChatPanel({ onClose }: AiLawyerChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: "Hi! I'm your legal research assistant. Ask me about any of your firm's cases, or any question on Indian law — IPC, CrPC, CPC, contracts, property, family law, and more.",
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: sendMessage, isPending } = useAiLawyerChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSend() {
    const question = input.trim();
    if (!question || isPending) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');

    sendMessage(question, {
      onSuccess(data) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: data.answer,
            meta: data,
          },
        ]);
      },
      onError() {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: "Sorry, I couldn't process that. Please try again.",
          },
        ]);
      },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 flex h-[580px] w-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 bg-indigo-700 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Legal Research Assistant</p>
          <p className="text-xs text-indigo-200">Case queries · Indian law research</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-indigo-200 transition-colors hover:bg-indigo-600 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] ${msg.role === 'user' ? '' : 'space-y-1'}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-indigo-600 text-white text-sm leading-relaxed'
                    : 'rounded-bl-sm bg-slate-100 text-slate-800'
                }`}
              >
                {msg.role === 'user'
                  ? msg.content
                  : <MarkdownText text={msg.content} />}
              </div>
              {msg.meta && <MessageMeta meta={msg.meta} />}
            </div>
          </div>
        ))}

        {isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a case or Indian law…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 max-h-28"
            style={{ scrollbarWidth: 'none' }}
            disabled={isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-400">
          AI may make mistakes · Always verify legal citations independently
        </p>
      </div>
    </div>
  );
}
