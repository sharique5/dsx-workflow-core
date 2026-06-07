import { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, AlertCircle } from 'lucide-react';
import { useAiChat } from '../hooks/useAiChat';

interface Message {
  role: 'user' | 'ai';
  content: string;
  routedToLawyer?: boolean;
}

interface AiChatPanelProps {
  onClose: () => void;
}

export function AiChatPanel({ onClose }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: "Hi! I'm your case assistant. I can answer questions about your hearings, fees, documents, and case status. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: sendMessage, isPending } = useAiChat();

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
            routedToLawyer: data.routedToLawyer,
          },
        ]);
      },
      onError() {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: "Sorry, I couldn't process that right now. Please try again or contact your lawyer directly.",
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
    <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[400px]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-indigo-600 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Case Assistant</p>
          <p className="text-xs text-indigo-200">Ask anything about your cases</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-indigo-200 transition-colors hover:bg-indigo-500 hover:text-white"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'space-y-2'}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-indigo-600 text-white'
                    : 'rounded-bl-sm bg-slate-100 text-slate-800'
                }`}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {msg.content}
              </div>
              {msg.routedToLawyer && (
                <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
                  <span>I've also forwarded your question to your lawyer for their review.</span>
                </div>
              )}
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
            placeholder="Ask about your cases…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 max-h-24"
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
          AI can make mistakes · Always confirm with your lawyer
        </p>
      </div>
    </div>
  );
}
