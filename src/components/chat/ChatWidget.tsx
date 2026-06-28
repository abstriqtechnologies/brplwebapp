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

  const handleFormSubmit = useCallback(async (name: string, phone: string) => {
    setUserName(name);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message: "Hello" }),
      });
      const data = await res.json();
      setLeadId(data.leadId);
      setState("chat");
    } catch {
      // If API fails, still open chat
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
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center animate-pulse hover:animate-none"
          aria-label="Open chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Modal */}
      {state !== "closed" && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[600px] max-h-[calc(100vh-100px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-5 fade-in duration-200">
          {/* Close button */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={closeChat}
              className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {state === "form" && (
            <NamePhoneForm onSubmit={handleFormSubmit} />
          )}

          {state === "chat" && leadId && (
            <ChatWindow leadId={leadId} name={userName} />
          )}
        </div>
      )}
    </>
  );
}
