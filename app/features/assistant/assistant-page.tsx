import { useEffect, useRef, useState } from "react";
import {
  Bell, Send, Loader2, Sparkles, RotateCcw,
  ChevronRight, BookOpen, TrendingUp, MessageSquare, LayoutDashboard,
} from "lucide-react";
import { useOutletContext } from "react-router";
import { supabase } from "~/services/supabase-client";
import { getTenantSystemPrompt } from "~/services/tenant-ai-context";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Default fallback system prompt (used if tenant config not loaded) ────────
const DEFAULT_SYSTEM_PROMPT = `You are Daloy AI, an expert business assistant built into the Daloy CRM platform. Daloy is a Filipino CRM tool designed for SMEs (small and medium enterprises) to manage leads, conversations, appointments, pipelines, and automations from social media channels like Facebook, Instagram, and TikTok.

Your role is to help users with:

1. **Daloy CRM Usage (How-to)** — How to add/manage leads, use Inbox, appointments, automations, analytics, team settings
2. **Sales Coaching for Filipino SMEs** — Close deals, handle objections, follow-up strategies, Filipino/Taglish sales scripts
3. **Lead Follow-up Templates** — Message templates for FB/IG/TikTok DMs, follow-up sequences, re-engagement, reminders
4. **Business Growth Advice for SMEs** — Convert followers to leads, content ideas, efficient sales processes

Always respond in a helpful, friendly tone. You may respond in Filipino, Taglish, or English depending on how the user writes to you. Keep responses concise and actionable.

If asked about topics unrelated to Daloy or business/sales, politely redirect to your area of expertise.`;

// ─── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTED = [
  {
    category: "Daloy How-to",
    icon: LayoutDashboard,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    prompts: [
      "Paano mag-add ng lead sa Daloy?",
      "Paano mag-set up ng automation?",
      "Paano gamitin ang Inbox filters?",
      "Paano mag-invite ng team member?",
    ],
  },
  {
    category: "Sales Coaching",
    icon: TrendingUp,
    color: "bg-green-50 text-green-700 border-green-200",
    prompts: [
      "Paano mag-close ng deal sa DM?",
      "Paano mag-handle ng 'mahal' objection?",
      "Ano ang effective na sales script sa Filipino?",
      "Paano mag-follow up ng hindi nakaka-irritate?",
    ],
  },
  {
    category: "Message Templates",
    icon: MessageSquare,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    prompts: [
      "Bigyan mo ako ng follow-up template para sa cold lead",
      "Template para sa appointment reminder",
      "Re-engagement message para sa hindi sumasagot",
      "Post-purchase follow-up message",
    ],
  },
  {
    category: "Business Growth",
    icon: BookOpen,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    prompts: [
      "Paano mag-convert ng followers to leads?",
      "Anong content ang nagge-generate ng inquiries?",
      "Tips para sa efficient sales process",
      "Paano mag-manage ng growing sales team?",
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AssistantPage() {
  const { user, displayName, initials } = useOutletContext<any>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [aiName, setAiName] = useState("Daloy AI");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function init() {
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (!memberData) return;
      const oid = memberData.organization_id;
      setOrgId(oid);

      // Load tenant-specific AI system prompt
      try {
        const prompt = await getTenantSystemPrompt(oid);
        setSystemPrompt(prompt);
        // Extract AI name from tenant config for display
        const { data: aiConfig } = await supabase
          .from("tenant_ai_config")
          .select("ai_name")
          .eq("organization_id", oid)
          .maybeSingle();
        if (aiConfig?.ai_name) {
          setAiName(aiConfig.ai_name);
        }
      } catch {
        // Use defaults if tenant config fails to load
      }

      // Load latest conversation
      const { data: conv } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (conv) {
        setConversationId(conv.id);
        setMessages(conv.messages ?? []);
      }
    }
    init();
  }, [user]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Save conversation ─────────────────────────────────────────────────────
  async function saveConversation(msgs: Message[], convId: string | null, oid: string | null) {
    if (!oid) return convId;
    if (convId) {
      await supabase
        .from("ai_conversations")
        .update({ messages: msgs, updated_at: new Date().toISOString() })
        .eq("id", convId);
      return convId;
    } else {
      const { data } = await supabase
        .from("ai_conversations")
        .insert({ organization_id: oid, user_id: user.id, messages: msgs })
        .select("id")
        .single();
      setConversationId(data?.id ?? null);
      return data?.id ?? null;
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...newMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false,
        }),
      });

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content ?? "Sorry, may error. Subukan ulit.";

      const updated: Message[] = [...newMessages, { role: "assistant", content: reply }];
      setMessages(updated);
      await saveConversation(updated, conversationId, orgId);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "May connection error. Subukan ulit mamaya." },
      ]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  // ── Clear chat ────────────────────────────────────────────────────────────
  async function clearChat() {
    setMessages([]);
    setConversationId(null);
    if (conversationId) {
      await supabase.from("ai_conversations").delete().eq("id", conversationId);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">AI Assistant</p>
            <p className="text-xs text-muted-foreground">Powered by {aiName} · Sales & CRM Expert</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 h-8 text-xs border border-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> New chat
            </button>
          )}
          <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-background pl-1 pr-3">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </span>
            )}
            <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        <div className="flex-1 overflow-y-auto">

          {/* Empty state — show suggested prompts */}
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto px-6 py-10">
              {/* Hero */}
              <div className="text-center mb-10">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4">
                  <Sparkles className="h-7 w-7 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-semibold text-foreground mb-2">
                  Kumusta! Ako si {aiName}.
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your sales coach, CRM guide, at message template generator. Tanungin mo ako tungkol sa Daloy, sales strategies, o mag-request ng follow-up templates.
                </p>
              </div>

              {/* Suggested prompt categories */}
              <div className="grid grid-cols-2 gap-4">
                {SUGGESTED.map((cat) => (
                  <div key={cat.category} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <cat.icon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {cat.category}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {cat.prompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => sendMessage(prompt)}
                          className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors group"
                        >
                          <span className="text-xs text-foreground">{prompt}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Messages
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {/* Render line breaks and basic formatting */}
                    {msg.content.split("\n").map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < msg.content.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-primary-foreground">
                      {initials}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Nag-iisip...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Suggested quick prompts when chatting */}
        {messages.length > 0 && !loading && (
          <div className="border-t border-border px-6 py-2 flex gap-2 overflow-x-auto">
            {[
              "Bigyan mo ako ng follow-up template",
              "Paano mag-close ng deal?",
              "Paano gamitin ang Daloy pipeline?",
            ].map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="shrink-0 px-3 py-1.5 text-xs border border-border rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-border px-6 py-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Tanungin si Daloy AI..."
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 pr-4 text-sm outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Daloy AI ay maaaring magkamali. I-verify ang important na impormasyon.
          </p>
        </div>
      </div>
    </>
  );
}