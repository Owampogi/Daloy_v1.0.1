import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, ChevronRight, Bot } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: number;
  from: "bot" | "user";
  text: string;
  options?: string[];
};

// ─── FAQ / Script Tree ────────────────────────────────────────────────────────
const WELCOME: Message = {
  id: 0,
  from: "bot",
  text: "Hi! 👋 I'm Daloy's assistant. How can I help you today?",
  options: [
    "What is Daloy?",
    "Show me the plans",
    "How does the AI work?",
    "I want to get started",
  ],
};

type ScriptEntry = {
  bot: string;
  options?: string[];
  collect?: "name" | "email" | "phone";
  end?: boolean;
};

const SCRIPT: Record<string, ScriptEntry> = {
  "What is Daloy?": {
    bot: "Daloy is a Filipino lead-flow platform built for SMEs. It helps you manage leads, automate follow-ups, and close more deals — all in one place. 🇵🇭",
    options: ["Show me the plans", "How does the AI work?", "I want to get started"],
  },
  "Show me the plans": {
    bot: "We have 3 plans:\n\n📦 Starter — ₱1,499/mo (1 seat, 500 AI replies)\n📈 Growth — ₱4,999/mo (5 seats, 5,000 AI replies + automations)\n🏢 Business — Custom (unlimited seats + API access)\n\nWant to try it free?",
    options: ["I want to get started", "How does the AI work?", "What is Daloy?"],
  },
  "How does the AI work?": {
    bot: "Daloy's AI reads incoming messages from your leads and automatically sends smart replies — so you never miss a follow-up even while you sleep. 🤖\n\nYou can customize the tone and scripts per channel.",
    options: ["Show me the plans", "I want to get started"],
  },
  "I want to get started": {
    bot: "Awesome! Let me get your details so our team can set you up. 🚀\n\nWhat's your name?",
    collect: "name",
  },
};

const COLLECT_NEXT: Record<string, ScriptEntry> = {
  name: {
    bot: "Nice to meet you, {value}! 👋\n\nWhat's your email address?",
    collect: "email",
  },
  email: {
    bot: "Got it! Last one — what's your phone number? (so we can reach you on Viber/WhatsApp)",
    collect: "phone",
  },
  phone: {
    bot: "🎉 You're all set! We'll reach out to you shortly to get Daloy up and running for your business.\n\nIn the meantime, feel free to explore our pricing page.",
    options: ["Show me the plans", "What is Daloy?"],
    end: true,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [collecting, setCollecting] = useState<"name" | "email" | "phone" | null>(null);
  const [leadData, setLeadData] = useState<Record<string, string>>({});
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const addBotMessage = (text: string, options?: string[], delay = 600) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), from: "bot", text, options },
      ]);
    }, delay);
  };

  const handleOption = (option: string) => {
    // Add user bubble
    setMessages((prev) => [...prev, { id: Date.now(), from: "user", text: option }]);

    const entry = SCRIPT[option];
    if (!entry) return;

    if (entry.collect) {
      setCollecting(entry.collect);
      addBotMessage(entry.bot, undefined, 700);
    } else {
      addBotMessage(entry.bot, entry.options, 700);
    }
  };

  const handleSend = () => {
    const value = input.trim();
    if (!value) return;
    setInput("");

    setMessages((prev) => [...prev, { id: Date.now(), from: "user", text: value }]);

    if (collecting) {
      const updatedLead = { ...leadData, [collecting]: value };
      setLeadData(updatedLead);

      const next = COLLECT_NEXT[collecting];
      const botText = next.bot.replace("{value}", value);
      setCollecting(next.collect ?? null);
      addBotMessage(botText, next.options, 700);
    } else {
      addBotMessage(
        "I didn't quite get that. Please choose one of the options below 👇",
        WELCOME.options,
        600
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat"
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
          open ? "bg-foreground text-background" : "bg-primary text-primary-foreground"
        } hover:scale-105 active:scale-95`}
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            1
          </span>
        )}
      </button>

      {/* ── Chat Window ── */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex w-[340px] flex-col rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300 origin-bottom-right ${
          open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        }`}
        style={{ height: "480px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl border-b border-border bg-primary px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-foreground">Daloy Assistant</p>
            <p className="text-xs text-primary-foreground/70">● Online now</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto text-primary-foreground/70 hover:text-primary-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.from === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                  msg.from === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
              {/* Quick reply options */}
              {msg.from === "bot" && msg.options && (
                <div className="mt-2 flex flex-col gap-1.5 w-full">
                  {msg.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleOption(opt)}
                      className="btn-surface w-full justify-between px-3 py-2 text-left text-xs"
                    >
                      {opt}
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="flex items-start">
              <div className="rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-border px-3 py-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              collecting === "name"
                ? "Enter your name..."
                : collecting === "email"
                ? "Enter your email..."
                : collecting === "phone"
                ? "Enter your phone number..."
                : "Type a message..."
            }
            className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="btn-primary h-9 w-9 rounded-xl p-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
