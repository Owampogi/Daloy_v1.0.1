import { supabase } from "~/services/supabase-client";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface TenantAIContext {
  config: {
    ai_name: string;
    communication_style: string;
    language_preference: string;
    sop_instructions: string | null;
    auto_reply_greeting: string | null;
    fallback_message: string | null;
  } | null;
  faqs: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  sop: Array<{
    title: string;
    instruction: string;
    category: string;
    priority: number;
  }>;
  legacyContext: Array<{
    context_type: string;
    question: string;
    answer: string;
  }>;
}

// ─── Style mappings ────────────────────────────────────────────────────────────
const STYLE_DESCRIPTIONS: Record<string, string> = {
  friendly: "friendly, warm, and casual — like talking to a helpful friend",
  professional: "professional, formal, and polished — like a business representative",
  enthusiastic: "enthusiastic, energetic, and upbeat — always positive and encouraging",
  concise: "concise and direct — short, to-the-point answers with no fluff",
};

const LANGUAGE_DESCRIPTIONS: Record<string, string> = {
  "fil-english": "Filipino-English (Taglish) — mix Filipino and English naturally, as most Filipino SME customers prefer",
  filipino: "Pure Filipino (Tagalog) — respond entirely in Filipino",
  english: "English — respond entirely in English",
};

// ─── Load tenant context from Supabase ─────────────────────────────────────────
export async function loadTenantAIContext(organizationId: string): Promise<TenantAIContext> {
  const [configRes, faqRes, sopRes, legacyRes] = await Promise.all([
    supabase
      .from("tenant_ai_config")
      .select("ai_name, communication_style, language_preference, sop_instructions, auto_reply_greeting, fallback_message")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("tenant_faqs")
      .select("question, answer, category")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("tenant_sop")
      .select("title, instruction, category, priority")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("priority", { ascending: false }),
    supabase
      .from("business_context")
      .select("context_type, question, answer")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
  ]);

  return {
    config: configRes.data ?? null,
    faqs: faqRes.data ?? [],
    sop: sopRes.data ?? [],
    legacyContext: legacyRes.data ?? [],
  };
}

// ─── Build dynamic system prompt ───────────────────────────────────────────────
export function buildTenantSystemPrompt(context: TenantAIContext): string {
  const cfg = context.config;
  const aiName = cfg?.ai_name || "Daloy AI";
  const style = cfg?.communication_style || "friendly";
  const lang = cfg?.language_preference || "fil-english";

  const styleDesc = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.friendly;
  const langDesc = LANGUAGE_DESCRIPTIONS[lang] || LANGUAGE_DESCRIPTIONS["fil-english"];

  let prompt = `You are ${aiName}, an intelligent AI assistant built into the Daloy CRM platform. Daloy is a Filipino CRM tool designed for SMEs (small and medium enterprises) to manage leads, conversations, appointments, pipelines, and automations from social media channels like Facebook, Instagram, and TikTok.

## Communication Style
Your tone should be ${styleDesc}.

## Language
Respond in ${langDesc}.

## Core Capabilities
1. **CRM Usage (How-to)** — Help users with Daloy features: leads, inbox, appointments, automations, analytics, team management
2. **Sales Coaching** — Help close deals, handle objections, create sales scripts in Filipino/Taglish context
3. **Message Templates** — Generate follow-up templates, re-engagement messages, appointment reminders
4. **Business Growth** — Advice on converting followers to leads, content ideas, sales processes

When giving templates, format them clearly so users can copy and use them immediately.`;

  // ── Inject SOP Instructions ─────────────────────────────────────────────────
  if (cfg?.sop_instructions) {
    prompt += `\n\n## Standard Operating Procedures (MUST FOLLOW)
${cfg.sop_instructions}`;
  }

  // ── Inject Structured SOP Items ─────────────────────────────────────────────
  if (context.sop.length > 0) {
    prompt += `\n\n## Detailed SOP Instructions (MUST FOLLOW)`;
    context.sop.forEach((sop, i) => {
      prompt += `\n\n### ${i + 1}. ${sop.title} [${sop.category}]${sop.priority > 5 ? " ⚠️ HIGH PRIORITY" : ""}
${sop.instruction}`;
    });
  }

  // ── Inject FAQs ────────────────────────────────────────────────────────────
  if (context.faqs.length > 0) {
    prompt += `\n\n## Frequently Asked Questions (use these answers when customers ask related questions)`;
    context.faqs.forEach((faq, i) => {
      prompt += `\n\n**Q${i + 1}: ${faq.question}**${faq.category !== "general" ? ` [${faq.category}]` : ""}
A: ${faq.answer}`;
    });
  }

  // ── Inject Legacy Business Context ──────────────────────────────────────────
  if (context.legacyContext.length > 0) {
    prompt += `\n\n## Additional Business Context`;
    context.legacyContext.forEach((ctx) => {
      if (ctx.question) {
        prompt += `\n\n**Q: ${ctx.question}**
A: ${ctx.answer}`;
      } else {
        prompt += `\n\n- [${ctx.context_type}] ${ctx.answer}`;
      }
    });
  }

  // ── Fallback guidance ──────────────────────────────────────────────────────
  if (cfg?.fallback_message) {
    prompt += `\n\n## When You Cannot Answer
If you cannot answer a question or the customer needs human assistance, respond with this message (or a natural variation of it):
"${cfg.fallback_message}"`;
  }

  prompt += `\n\nAlways be helpful and actionable. If asked about topics completely unrelated to the business or CRM, politely redirect to your area of expertise.`;

  return prompt;
}

// ─── Convenience: load + build in one call ─────────────────────────────────────
export async function getTenantSystemPrompt(organizationId: string): Promise<string> {
  const context = await loadTenantAIContext(organizationId);
  return buildTenantSystemPrompt(context);
}