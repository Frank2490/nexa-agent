"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME: Message = {
  id: "1",
  role: "assistant",
  content: "czesc! jestem nexa. czym moge ci dzis pomoc?",
  timestamp: new Date(),
};

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatInput: trimmed }),
      });

      const data = await response.json();

      const nexaMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.output || data.text || data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, nexaMsg]);
    } finally {
      setLoading(false);
    }
  }

  const canSend = input.trim().length > 0 && !loading;
  const bubblePx = isMobile ? "12px 12px" : "10px 16px";

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2">
          <span
            className="animate-pulse rounded-full"
            style={{
              width: 8,
              height: 8,
              minWidth: 8,
              background: "#20A39E",
              display: "inline-block",
            }}
          />
          <span
            style={{
              color: "#111111",
              fontSize: 13,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            nexa
          </span>
        </div>
        <span style={{ color: "#888888", fontSize: 12 }}>online</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-4 py-4 thin-scrollbar">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div
                style={{
                  background: "#FFBA49",
                  color: "#111111",
                  fontSize: 14,
                  padding: bubblePx,
                  borderRadius: "16px 16px 4px 16px",
                  maxWidth: "75%",
                  wordBreak: "break-word",
                  transition: "all 200ms ease",
                }}
              >
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex flex-col items-start">
              <span
                style={{ color: "#888888", fontSize: 11, marginBottom: 4 }}
              >
                nexa
              </span>
              <div
                style={{
                  background: "#F7F7F7",
                  color: "#111111",
                  fontSize: 14,
                  padding: bubblePx,
                  borderRadius: "16px 16px 16px 4px",
                  maxWidth: "75%",
                  wordBreak: "break-word",
                  transition: "all 200ms ease",
                }}
              >
                {msg.content}
              </div>
            </div>
          )
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex flex-col items-start">
            <span
              style={{ color: "#888888", fontSize: 11, marginBottom: 4 }}
            >
              nexa
            </span>
            <div
              style={{
                background: "#F7F7F7",
                padding: bubblePx,
                borderRadius: "16px 16px 16px 4px",
                display: "flex",
                gap: 5,
                alignItems: "center",
              }}
            >
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="animate-pulse"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#20A39E",
                    display: "inline-block",
                    animationDelay: `${delay}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          borderTop: "1px solid #E5E5E5",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) sendMessage(input);
          }}
          placeholder="napisz do Nexy..."
          className="mobile-input placeholder:text-[#888888]"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 14,
            color: "#111111",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!canSend}
          style={{
            width: 32,
            height: 32,
            minWidth: 32,
            borderRadius: "50%",
            background: "#20A39E",
            color: "white",
            border: "none",
            cursor: canSend ? "pointer" : "not-allowed",
            opacity: canSend ? 1 : 0.4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            transition: "opacity 200ms ease",
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 1L7 7M13 1L9 13L7 7M13 1L1 5L7 7"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
