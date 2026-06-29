// src/components/chat/ChatWidget.tsx
"use client";

import { useState, useCallback } from "react";
import { NamePhoneForm } from "./NamePhoneForm";
import { ChatWindow } from "./ChatWindow";

type ChatState = "closed" | "form" | "chat";

export function ChatWidget() {
  const [state, setState] = useState<ChatState>("closed");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");

  const handleFormSubmit = useCallback(async (name: string, phone: string) => {
    setUserName(name);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          message: "Hello",
          isGreeting: true,
        }),
      });
      const data = await res.json();
      setLeadId(data.leadId);
      // Pre-load the greeting message so it shows in the chat
      setGreetingMessage(data.reply || "");
      setState("chat");
    } catch {
      setGreetingMessage("Hello! How can I help you today?");
      setState("chat");
    }
  }, []);

  const openForm = () => setState("form");
  const closeChat = () => setState("closed");

  return (
    <>
      {/* Floating Bubble */}
      {state === "closed" && (
        <button
          onClick={openForm}
          aria-label="Open chat"
          className="group fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            boxShadow:
              "0 8px 24px -4px rgba(37, 211, 102, 0.45), 0 4px 12px -2px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            border: "3px solid #ffffff",
          }}
        >
          <span
            className="absolute inset-[-6px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              border: "2px solid rgba(37, 211, 102, 0.3)",
            }}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="white"
            className="relative z-10 drop-shadow-sm"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
      )}

      {/* Chat Modal */}
      {state !== "closed" && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[600px] max-h-[calc(100vh-100px)] bg-white rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04)",
          }}
        >
          <button
            onClick={closeChat}
            aria-label="Close chat"
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {state === "form" && <NamePhoneForm onSubmit={handleFormSubmit} />}

          {state === "chat" && leadId && (
            <ChatWindow
              leadId={leadId}
              name={userName}
              greetingMessage={greetingMessage}
            />
          )}
        </div>
      )}
    </>
  );
}