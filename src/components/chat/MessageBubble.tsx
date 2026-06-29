interface MessageBubbleProps {
  role: "user" | "ai";
  message: string;
  timestamp: Date;
}

export function MessageBubble({ role, message, timestamp }: MessageBubbleProps) {
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (role === "user") {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-[75%]">
          <div
            className="rounded-2xl rounded-br-sm px-3.5 py-2 text-sm text-white"
            style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
          >
            <p className="whitespace-pre-wrap break-words">{message}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-2">
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-200">
          <p className="whitespace-pre-wrap break-words">{message}</p>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}