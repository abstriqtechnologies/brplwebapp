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
  name: string;
  phone: string;
  initialMessages?: Message[];
}

export function ChatWindow({ leadId, name, phone, initialMessages = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-white">
        {messages.length === 0 && (
          <div className="text-center mt-12 px-6">
            <p className="text-gray-900 font-medium text-sm mb-1">Hello {name}!</p>
            <p className="text-gray-500 text-sm">How can we help you today?</p>
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