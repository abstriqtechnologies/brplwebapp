"use client";

import { useState } from "react";
import { NamePhoneForm } from "./NamePhoneForm";
import { ChatWindow } from "./ChatWindow";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [leadId, setLeadId] = useState("");

  const handleStart = (submittedName: string, submittedPhone: string) => {
    setName(submittedName);
    setPhone(submittedPhone);
    setLeadId(""); // start fresh, server will reuse by phone
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            boxShadow: "0 8px 24px -4px rgba(37, 211, 102, 0.45), 0 4px 12px -2px rgba(0, 0, 0, 0.12)",
            border: "3px solid #ffffff",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
          </svg>
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[600px] max-h-[calc(100vh-100px)] bg-white rounded-2xl flex flex-col overflow-hidden"
          style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04)" }}
        >
          <button
            onClick={close}
            aria-label="Close chat"
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {phone === "" ? (
            <NamePhoneForm onSubmit={handleStart} />
          ) : (
            <ChatWindow leadId={leadId} name={name} phone={phone} />
          )}
        </div>
      )}
    </>
  );
}