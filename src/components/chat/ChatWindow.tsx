"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface Message {
  role: "user" | "ai";
  message: string;
  timestamp: string;
}

interface ChatWindowProps {
  leadId: string;
  setLeadId: (id: string) => void;
  name: string;
  phone: string;
  onReset: () => void;
}

export function ChatWindow({ leadId, setLeadId, name, phone, onReset }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const params = new URLSearchParams();
        if (leadId) params.set("leadId", leadId);
        else params.set("phone", phone);

        const res = await fetch(`/api/chat/conversation?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();

        // If we had no leadId but got one back, persist it
        if (!leadId && data.leadId) {
          setLeadId(data.leadId);
        }

        if (data.conversation && data.conversation.length > 0) {
          // Normalise timestamps to ISO strings
          const conv = data.conversation.map((m: any) => ({
            role: m.role,
            message: m.message,
            timestamp: m.timestamp
              ? new Date(m.timestamp).toISOString()
              : new Date().toISOString(),
          }));
          setMessages(conv);
        }
      } catch (err) {
        console.error("[ChatWindow] loadHistory error:", err);
      } finally {
        setHistoryLoaded(true);
      }
    }
    void loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      role: "user",
      message: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, name, phone, message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }

      // Persist leadId returned from server
      if (data.leadId && data.leadId !== leadId) {
        setLeadId(data.leadId);
      }

      const aiMsg: Message = {
        role: "ai",
        message: data.reply || "I couldn't generate a response right now.",
        timestamp: new Date().toISOString(),
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (err) {
      console.error("[ChatWindow] send error:", err);
      const errMsg: Message = {
        role: "ai",
        message: "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4 text-white"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-white text-sm font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-[15px] truncate">{name}</p>
            <p className="text-white/90 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              Online
            </p>
          </div>
          {/* Reset button — back to NamePhoneForm */}
          <button
            onClick={onReset}
            aria-label="New conversation"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0"
            title="Start new conversation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-white">
        {historyLoaded && messages.length === 0 && (
          <div className="text-center mt-12 px-6">
            <p className="text-gray-900 font-medium text-sm mb-1">Hello {name}!</p>
            <p className="text-gray-500 text-sm">How can we help you today?</p>
          </div>
        )}
        {!historyLoaded && (
          <div className="text-center mt-12">
            <p className="text-gray-400 text-sm">Loading conversation...</p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} message={m.message} timestamp={new Date(m.timestamp)} />
        ))}
        {loading && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-3 py-3 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent focus:bg-white disabled:opacity-50"
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="w-10 h-10 rounded-full text-white flex items-center justify-center disabled:opacity-50 shrink-0"
            style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
