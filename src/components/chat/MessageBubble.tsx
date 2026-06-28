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
      className={`flex items-start gap-2.5 mb-3 ${
        role === "user" ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
          role === "user"
            ? "bg-blue-500"
            : "bg-emerald-600"
        }`}
      >
        {role === "user" ? "U" : "AI"}
      </div>
      <div
        className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
          role === "user"
            ? "bg-emerald-500 text-white rounded-2xl rounded-tr-sm"
            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{message}</p>
        <p
          className={`text-[10px] mt-1 ${
            role === "user"
              ? "text-emerald-100"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
