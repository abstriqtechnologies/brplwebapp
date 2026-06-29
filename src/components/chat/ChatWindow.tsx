// src/components/chat/ChatWindow.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface ChatMessage {
  role: "user" | "ai";
  message: string;
  timestamp: Date;
}

interface ChatWindowProps {
  leadId: string;
  name: string;
  greetingMessage?: string;
  initialConversation?: ChatMessage[];
}

/**
 * Smooth character-by-character animation for AI messages.
 * Reveals text gradually so users get the visual feedback of a "live" reply.
 */
function useTypingEffect(fullText: string, isTyping: boolean, speed = 18) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!isTyping || !fullText) {
      setDisplayed(fullText);
      return;
    }
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [fullText, isTyping, speed]);

  return displayed;
}

export function ChatWindow({ leadId, name, greetingMessage, initialConversation = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // If a greeting exists, prime the chat with an AI message already so the
    // typing indicator plays as soon as the chat opens.
    if (greetingMessage) {
      return [
        {
          role: "ai" as const,
          message: greetingMessage,
          timestamp: new Date(),
        },
      ];
    }
    return initialConversation;
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  // Track which AI messages still need to animate. We initialize with the
  // greeting (if any) so the very first message also types out.
  const [pendingAIMessages, setPendingAIMessages] = useState<Set<number>>(() => {
    const s = new Set<number>();
    if (greetingMessage) s.add(0);
    return s;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAIMessages]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: "user",
      message: input.trim(),
      timestamp: new Date(),
    };

    const userIndex = messages.length;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          name,
          message: userMessage.message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const aiMessage: ChatMessage = {
        role: "ai",
        message: data.reply || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      const newMessages = [...messages, userMessage, aiMessage];
      setMessages(newMessages);
      setPendingAIMessages((prev) => {
        const next = new Set(prev);
        next.add(userIndex + 1);
        return next;
      });
    } catch (err) {
      console.error("Chat send error:", err);
      const errorMessage: ChatMessage = {
        role: "ai",
        message: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      const newMessages = [...messages, userMessage, errorMessage];
      setMessages(newMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const completeAIMessage = (idx: number, finalText: string) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, message: finalText } : m))
    );
    setPendingAIMessages((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4 text-white relative"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-sm font-semibold border border-white/20">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-[15px] truncate">{name}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              <p className="text-white/90 text-xs">Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
        {messages.length === 0 && (
          <div className="text-center mt-12 px-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium text-sm mb-1">Hello {name}!</p>
            <p className="text-gray-500 text-sm">How can we help you today?</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isTypingThis =
            msg.role === "ai" && pendingAIMessages.has(i);
          return (
            <AnimatedAIMessage
              key={i}
              message={msg}
              isTyping={isTypingThis}
              onComplete={(finalText) => completeAIMessage(i, finalText)}
            />
          );
        })}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-3 py-3 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isTyping}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent focus:bg-white disabled:opacity-50 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="w-10 h-10 rounded-full text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md active:scale-95 shrink-0"
            style={{
              background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper around MessageBubble that handles the per-message typing animation.
 * For user messages, renders the bubble as-is. For AI messages that are still
 * "pending", gradually reveals the text and calls `onComplete` when done.
 */
function AnimatedAIMessage({
  message,
  isTyping,
  onComplete,
}: {
  message: ChatMessage;
  isTyping: boolean;
  onComplete: (text: string) => void;
}) {
  const displayed = useTypingEffect(message.message, isTyping);

  useEffect(() => {
    if (!isTyping) return;
    if (displayed.length >= message.message.length) {
      onComplete(message.message);
    }
  }, [displayed, isTyping, message.message, onComplete]);

  if (message.role === "user") {
    return <MessageBubble role="user" message={message.message} timestamp={message.timestamp} />;
  }

  return (
    <MessageBubble
      role="ai"
      message={isTyping ? displayed : message.message}
      timestamp={message.timestamp}
    />
  );
}