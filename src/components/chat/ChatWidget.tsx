"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NamePhoneForm } from "./NamePhoneForm";
import { ChatWindow } from "./ChatWindow";

const LEAD_ID_KEY = "brpl_chat_leadId";
const PHONE_KEY = "brpl_chat_phone";
const NAME_KEY = "brpl_chat_name";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — silently ignore */ }
}

function clearStorage() {
  try {
    localStorage.removeItem(LEAD_ID_KEY);
    localStorage.removeItem(PHONE_KEY);
    localStorage.removeItem(NAME_KEY);
  } catch { /* ignore */ }
}

export function ChatWidget() {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [leadId, setLeadIdState] = useState("");
  const mounted = useRef(false);

  // Hydrate persisted state on mount
  useEffect(() => {
    mounted.current = true;
    const savedLeadId = loadFromStorage(LEAD_ID_KEY, "");
    const savedPhone = loadFromStorage(PHONE_KEY, "");
    const savedName = loadFromStorage(NAME_KEY, "");
    if (savedLeadId && savedPhone) {
      setLeadIdState(savedLeadId);
      setPhone(savedPhone);
      setName(savedName);
    }
    // Signal that hydration is complete (even if nothing was saved)
    setHydrated(true);
  }, []);

  // Persist whenever leadId changes
  const setLeadId = useCallback((id: string) => {
    setLeadIdState(id);
    if (id) saveToStorage(LEAD_ID_KEY, id);
    // Don't clear storage here — clearing is done by reset()
  }, []);

  const handleStart = (submittedName: string, submittedPhone: string) => {
    setName(submittedName);
    setPhone(submittedPhone);
    saveToStorage(NAME_KEY, submittedName);
    saveToStorage(PHONE_KEY, submittedPhone);
    setLeadId(""); // start fresh, server will find existing lead by phone
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
  };

  const reset = () => {
    clearStorage();
    setName("");
    setPhone("");
    setLeadIdState("");
    setOpen(false);
  };

  // Button show logic
  const showButton = !open;
  // Only render the NamePhoneForm if we're hydrated AND no phone is persisted
  // During hydration, render nothing (avoids flash of wrong form)
  const showNameForm = hydrated && phone === "";
  const showChat = hydrated && phone !== "";

  return (
    <>
      {showButton && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            boxShadow: "0 8px 28px -6px rgba(37, 211, 102, 0.5), 0 4px 12px -2px rgba(0, 0, 0, 0.1)",
            border: "3px solid #ffffff",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2C8.268 2 2 8.268 2 16c0 2.98.88 5.748 2.394 8.082L2.786 29.214l5.132-1.608A13.94 13.94 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.2c-2.16 0-4.2-.63-5.922-1.714l-.414-.248-3.046.954.952-3.048-.258-.426A11.16 11.16 0 014.8 16c0-6.18 5.02-11.2 11.2-11.2S27.2 9.82 27.2 16 22.18 27.2 16 27.2z" fill="white"/>
            <path d="M21.8 18.134c-.65-.326-1.878-.922-2.168-1.028-.29-.106-.502-.16-.714.1-.212.26-.826 1.018-1.012 1.226-.186.208-.372.234-.664.078-.292-.156-1.248-.466-2.374-1.47-.876-.782-1.47-1.748-1.642-2.044-.172-.296-.018-.456.13-.604.133-.132.296-.346.444-.518.148-.172.196-.296.296-.494.1-.198.05-.37-.026-.518-.076-.148-.666-1.602-.912-2.196-.24-.574-.484-.496-.664-.506-.172-.008-.37-.01-.568-.01-.198 0-.518.074-.79.372-.272.298-1.036 1.012-1.036 2.466s1.06 2.86 1.206 3.06c.146.2 2.086 3.19 5.058 4.474 2.972 1.284 3.28 1 3.88.928.6-.072 1.75-.714 1.994-1.404.244-.69.244-1.28.17-1.404-.074-.124-.27-.198-.57-.348z" fill="white"/>
          </svg>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[9999] w-full h-full sm:w-[380px] sm:h-[600px] sm:max-w-[calc(100vw-24px)] sm:max-h-[calc(100vh-100px)] bg-white sm:rounded-2xl flex flex-col overflow-hidden"
          style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04)" }}
        >
          <button
            onClick={close}
            aria-label="Close chat"
            className="absolute top-3 right-3 z-20 text-white hover:opacity-80 flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {showNameForm && (
            <NamePhoneForm onSubmit={handleStart} />
          )}

          {showChat && (
            <ChatWindow
              leadId={leadId}
              setLeadId={setLeadId}
              name={name}
              phone={phone}
              onReset={reset}
            />
          )}

          {/* During hydration, render empty loading state */}
          {!hydrated && (
            <div className="flex items-center justify-center h-full bg-white">
              <p className="text-gray-400 text-sm">Loading...</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
