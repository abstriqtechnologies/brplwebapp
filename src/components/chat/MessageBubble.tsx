// src/components/chat/MessageBubble.tsx
"use client";

interface MessageBubbleProps {
  role: "user" | "ai";
  message: string;
  timestamp: Date;
}

export function MessageBubble({ role, message, timestamp }: MessageBubbleProps) {
  return (
    <div
      className={`flex items-end gap-1.5 mb-2 ${
        role === "user" ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`max-w-[78%] px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm ${
          role === "user"
            ? "text-white rounded-2xl rounded-br-md"
            : "bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md"
        }`}
        style={
          role === "user"
            ? {
                background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              }
            : undefined
        }
      >
        <p className="whitespace-pre-wrap break-words">{message}</p>
        <p
          className={`text-[10px] mt-0.5 flex items-center gap-1 ${
            role === "user"
              ? "text-white/80 justify-end"
              : "text-gray-400"
          }`}
        >
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {role === "user" && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </p>
      </div>
    </div>
  );
}