import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Sparkles, Plus, Trash2, Save, Loader2, CheckCircle2,
  MessageSquare, HelpCircle, Package, FileText, Shield,
  Bot, BookOpen, Settings2, GripVertical, Edit3, X,
} from "lucide-react";
import { supabase } from "~/services/supabase-client";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TenantAIConfig {
  id: string;
  organization_id: string;
  communication_style: string;
  language_preference: string;
  sop_instructions: string | null;
  ai_name: string;
  auto_reply_enabled: boolean;
  auto_reply_greeting: string | null;
  fallback_message: string | null;
}

interface TenantFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

interface TenantSOP {
  id: string;
  title: string;
  instruction: string;
  category: string;
  priority: number;
  is_active: boolean;
}

interface BusinessContext {
  id: string;
  context_type: string;
  question: string;
  answer: string;
  is_active: boolean;
}

type SettingsTab = "config" | "faqs" | "sop" | "legacy";

const TABS: { key: SettingsTab; label: string; icon: any; desc: string }[] = [
  { key: "config", label: "AI Personality", icon: Bot, desc: "Configure how your AI communicates" },
  { key: "faqs", label: "FAQs", icon: HelpCircle, desc: "Frequently asked questions the AI can answer" },
  { key: "sop", label: "SOP / Instructions", icon: BookOpen, desc: "Standard operating procedures for the AI" },
  { key: "legacy", label: "Business Context", icon: MessageSquare, desc: "Additional business context (legacy)" },
];

const CONTEXT_TYPES = [
  { value: "faq", label: "FAQ", icon: HelpCircle, description: "Frequently asked questions" },
  { value: "product", label: "Products", icon: Package, description: "Product information and details" },
  { value: "service", label: "Services", icon: FileText, description: "Service offerings and details" },
  { value: "policy", label: "Policies", icon: Shield, description: "Business policies and terms" },
  { value: "general", label: "General", icon: MessageSquare, description: "General business information" },
];

const FAQ_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "pricing", label: "Pricing" },
  { value: "shipping", label: "Shipping & Delivery" },
  { value: "returns", label: "Returns & Refunds" },
  { value: "product", label: "Product Info" },
  { value: "account", label: "Account & Billing" },
  { value: "support", label: "Support" },
];

const SOP_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "tone", label: "Tone & Voice" },
  { value: "escalation", label: "Escalation Rules" },
  { value: "pricing", label: "Pricing & Discounts" },
  { value: "objection_handling", label: "Objection Handling" },
  { value: "closing", label: "Closing Techniques" },
  { value: "follow_up", label: "Follow-up Rules" },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AIPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>("config");

  // AI Config
  const [config, setConfig] = useState<TenantAIConfig | null>(null);
  const [aiName, setAiName] = useState("Daloy AI");
  const [communicationStyle, setCommunicationStyle] = useState("friendly");
  const [languagePreference, setLanguagePreference] = useState("fil-english");
  const [sopInstructions, setSopInstructions] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyGreeting, setAutoReplyGreeting] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState(
    "Thanks for reaching out! A team member will get back to you shortly."
  );

  // FAQs
  const [faqs, setFaqs] = useState<TenantFAQ[]>([]);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<TenantFAQ | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: "", answer: "", category: "general",
  });

  // SOP
  const [sopItems, setSopItems] = useState<TenantSOP[]>([]);
  const [showSopModal, setShowSopModal] = useState(false);
  const [editingSop, setEditingSop] = useState<TenantSOP | null>(null);
  const [sopForm, setSopForm] = useState({
    title: "", instruction: "", category: "general", priority: 0,
  });

  // Legacy business context
  const [contexts, setContexts] = useState<BusinessContext[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContext, setNewContext] = useState({
    context_type: "faq", question: "", answer: "",
  });

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (!memberData) return;
      const oid = memberData.organization_id;
      setOrgId(oid);

      // Load AI config
      const { data: configData } = await supabase
        .from("tenant_ai_config")
        .select("*")
        .eq("organization_id", oid)
        .maybeSingle();

      if (configData) {
        setConfig(configData);
        setAiName(configData.ai_name || "Daloy AI");
        setCommunicationStyle(configData.communication_style || "friendly");
        setLanguagePreference(configData.language_preference || "fil-english");
        setSopInstructions(configData.sop_instructions || "");
        setAutoReplyEnabled(configData.auto_reply_enabled ?? true);
        setAutoReplyGreeting(configData.auto_reply_greeting || "");
        setFallbackMessage(configData.fallback_message || "Thanks for reaching out! A team member will get back to you shortly.");
      }

      // Load FAQs
      const { data: faqData } = await supabase
        .from("tenant_faqs")
        .select("*")
        .eq("organization_id", oid)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      setFaqs(faqData || []);

      // Load SOP
      const { data: sopData } = await supabase
        .from("tenant_sop")
        .select("*")
        .eq("organization_id", oid)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      setSopItems(sopData || []);

      // Load legacy business context
      const { data: contextData } = await supabase
        .from("business_context")
        .select("*")
        .eq("organization_id", oid)
        .order("created_at", { ascending: false });
      setContexts(contextData || []);

    } catch (err) {
      console.error("Error loading AI settings:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Save AI Config ─────────────────────────────────────────────────────────
  async function saveConfig() {
    if (!orgId) return;
    setSaving(true);
    setSaved(false);

    try {
      const payload = {
        organization_id: orgId,
        ai_name: aiName,
        communication_style: communicationStyle,
        language_preference: languagePreference,
        sop_instructions: sopInstructions || null,
        auto_reply_enabled: autoReplyEnabled,
        auto_reply_greeting: autoReplyGreeting || null,
        fallback_message: fallbackMessage || null,
      };

      if (config) {
        const { error } = await supabase
          .from("tenant_ai_config")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tenant_ai_config")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setConfig(data);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving config:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── FAQ CRUD ───────────────────────────────────────────────────────────────
  async function saveFaq() {
    if (!faqForm.question || !faqForm.answer || !orgId) return;
    setSaving(true);
    try {
      if (editingFaq) {
        const { error } = await supabase
          .from("tenant_faqs")
          .update({
            question: faqForm.question,
            answer: faqForm.answer,
            category: faqForm.category,
          })
          .eq("id", editingFaq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_faqs").insert({
          organization_id: orgId,
          question: faqForm.question,
          answer: faqForm.answer,
          category: faqForm.category,
          is_active: true,
        });
        if (error) throw error;
      }
      setShowFaqModal(false);
      setEditingFaq(null);
      setFaqForm({ question: "", answer: "", category: "general" });
      await loadData();
    } catch (err) {
      console.error("Error saving FAQ:", err);
      alert("Failed to save FAQ.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFaq(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    await supabase.from("tenant_faqs").delete().eq("id", id);
    await loadData();
  }

  async function toggleFaq(id: string, isActive: boolean) {
    await supabase.from("tenant_faqs").update({ is_active: !isActive }).eq("id", id);
    await loadData();
  }

  // ── SOP CRUD ───────────────────────────────────────────────────────────────
  async function saveSop() {
    if (!sopForm.title || !sopForm.instruction || !orgId) return;
    setSaving(true);
    try {
      if (editingSop) {
        const { error } = await supabase
          .from("tenant_sop")
          .update({
            title: sopForm.title,
            instruction: sopForm.instruction,
            category: sopForm.category,
            priority: sopForm.priority,
          })
          .eq("id", editingSop.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_sop").insert({
          organization_id: orgId,
          title: sopForm.title,
          instruction: sopForm.instruction,
          category: sopForm.category,
          priority: sopForm.priority,
          is_active: true,
        });
        if (error) throw error;
      }
      setShowSopModal(false);
      setEditingSop(null);
      setSopForm({ title: "", instruction: "", category: "general", priority: 0 });
      await loadData();
    } catch (err) {
      console.error("Error saving SOP:", err);
      alert("Failed to save SOP.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSop(id: string) {
    if (!confirm("Delete this SOP instruction?")) return;
    await supabase.from("tenant_sop").delete().eq("id", id);
    await loadData();
  }

  async function toggleSop(id: string, isActive: boolean) {
    await supabase.from("tenant_sop").update({ is_active: !isActive }).eq("id", id);
    await loadData();
  }

  // ── Legacy Context CRUD ────────────────────────────────────────────────────
  async function handleAddContext() {
    if (!newContext.question || !newContext.answer || !orgId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("business_context").insert({
        organization_id: orgId,
        context_type: newContext.context_type,
        question: newContext.question,
        answer: newContext.answer,
        is_active: true,
      });
      if (error) throw error;
      setShowAddModal(false);
      setNewContext({ context_type: "faq", question: "", answer: "" });
      await loadData();
    } catch (err) {
      console.error("Error adding context:", err);
      alert("Failed to add. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContext(id: string) {
    if (!confirm("Are you sure you want to delete this?")) return;
    await supabase.from("business_context").delete().eq("id", id);
    await loadData();
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await supabase.from("business_context").update({ is_active: !isActive }).eq("id", id);
    await loadData();
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">AI Assistant Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your tenant-specific AI — FAQs, SOP, and personality
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── AI PERSONALITY TAB ─── */}
      {tab === "config" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-background p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">AI Personality</h3>
                <p className="text-sm text-muted-foreground">Set how the AI communicates with your customers</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">AI Name</label>
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="e.g., Daloy AI, ShopBot, etc."
                  className="input-field"
                />
                <p className="mt-1 text-xs text-muted-foreground">Displayed as the AI's name in conversations</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Communication Style</label>
                <select
                  value={communicationStyle}
                  onChange={(e) => setCommunicationStyle(e.target.value)}
                  className="input-field"
                >
                  <option value="friendly">Friendly & Casual</option>
                  <option value="professional">Professional & Formal</option>
                  <option value="enthusiastic">Enthusiastic & Energetic</option>
                  <option value="concise">Concise & Direct</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Language Preference</label>
                <select
                  value={languagePreference}
                  onChange={(e) => setLanguagePreference(e.target.value)}
                  className="input-field"
                >
                  <option value="fil-english">Filipino-English (Taglish)</option>
                  <option value="filipino">Pure Filipino</option>
                  <option value="english">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* Auto-reply Settings */}
          <div className="rounded-xl border border-border bg-background p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings2 className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Auto-Reply Settings</h3>
                <p className="text-sm text-muted-foreground">Configure automatic responses to incoming messages</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable Auto-Reply</p>
                  <p className="text-xs text-muted-foreground">AI will automatically respond to incoming messages</p>
                </div>
                <button
                  onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoReplyEnabled ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      autoReplyEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Auto Greeting Message</label>
                <textarea
                  value={autoReplyGreeting}
                  onChange={(e) => setAutoReplyGreeting(e.target.value)}
                  placeholder="Hi! Thanks for reaching out. How can I help you today?"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Fallback Message</label>
                <textarea
                  value={fallbackMessage}
                  onChange={(e) => setFallbackMessage(e.target.value)}
                  placeholder="When AI can't answer, this message is sent"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
            </div>
          </div>

          {/* SOP Instructions (free-form) */}
          <div className="rounded-xl border border-border bg-background p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Global SOP Instructions</h3>
                <p className="text-sm text-muted-foreground">
                  Free-form instructions that shape the AI's overall behavior. Use the SOP tab for structured items.
                </p>
              </div>
            </div>
            <textarea
              value={sopInstructions}
              onChange={(e) => setSopInstructions(e.target.value)}
              placeholder={`Example:\n- Always greet customers warmly before answering\n- Never share internal pricing details with non-VIP customers\n- Escalate to a human agent if the customer asks about refunds over ₱5,000\n- Always end with "Is there anything else I can help with?"`}
              rows={8}
              className="input-field resize-none font-mono text-sm"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button onClick={saveConfig} disabled={saving} className="btn-primary h-10 px-6 text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save All Settings
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── FAQS TAB ─── */}
      {tab === "faqs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} configured
              </p>
            </div>
            <button
              onClick={() => {
                setEditingFaq(null);
                setFaqForm({ question: "", answer: "", category: "general" });
                setShowFaqModal(true);
              }}
              className="btn-primary h-10 px-4 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add FAQ
            </button>
          </div>

          {faqs.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="mt-4 font-medium text-foreground">No FAQs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add FAQs so your AI can answer common customer questions accurately
              </p>
              <button
                onClick={() => {
                  setEditingFaq(null);
                  setFaqForm({ question: "", answer: "", category: "general" });
                  setShowFaqModal(true);
                }}
                className="btn-primary mt-4 h-10 px-4 text-sm"
              >
                <Plus className="h-4 w-4" /> Add Your First FAQ
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
              {faqs.map((faq) => (
                <div key={faq.id} className="p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <HelpCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                          {faq.category}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          faq.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {faq.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-foreground text-sm">Q: {faq.question}</p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">A: {faq.answer}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFaq(faq.id, faq.is_active)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          faq.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {faq.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingFaq(faq);
                          setFaqForm({
                            question: faq.question,
                            answer: faq.answer,
                            category: faq.category,
                          });
                          setShowFaqModal(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteFaq(faq.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FAQ Modal */}
          {showFaqModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingFaq ? "Edit FAQ" : "Add FAQ"}
                  </h3>
                  <button onClick={() => { setShowFaqModal(false); setEditingFaq(null); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
                    <select
                      value={faqForm.category}
                      onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                      className="input-field"
                    >
                      {FAQ_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Question</label>
                    <input
                      type="text"
                      value={faqForm.question}
                      onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                      placeholder="e.g., What are your business hours?"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Answer</label>
                    <textarea
                      value={faqForm.answer}
                      onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                      placeholder="The AI will use this answer when a customer asks this question..."
                      rows={4}
                      className="input-field resize-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => { setShowFaqModal(false); setEditingFaq(null); }} className="btn-surface h-10 px-4 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={saveFaq}
                    disabled={!faqForm.question || !faqForm.answer || saving}
                    className="btn-primary h-10 px-4 text-sm"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingFaq ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingFaq ? "Update" : "Add"} FAQ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SOP TAB ─── */}
      {tab === "sop" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {sopItems.length} SOP instruction{sopItems.length !== 1 ? "s" : ""} configured
              </p>
            </div>
            <button
              onClick={() => {
                setEditingSop(null);
                setSopForm({ title: "", instruction: "", category: "general", priority: 0 });
                setShowSopModal(true);
              }}
              className="btn-primary h-10 px-4 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add SOP
            </button>
          </div>

          {sopItems.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="mt-4 font-medium text-foreground">No SOP instructions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Define standard operating procedures so your AI follows your business processes
              </p>
              <button
                onClick={() => {
                  setEditingSop(null);
                  setSopForm({ title: "", instruction: "", category: "general", priority: 0 });
                  setShowSopModal(true);
                }}
                className="btn-primary mt-4 h-10 px-4 text-sm"
              >
                <Plus className="h-4 w-4" /> Add Your First SOP
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
              {sopItems.map((sop) => (
                <div key={sop.id} className="p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                      <BookOpen className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                          {sop.category.replace("_", " ")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          sop.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {sop.is_active ? "Active" : "Inactive"}
                        </span>
                        {sop.priority > 0 && (
                          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                            Priority: {sop.priority}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-medium text-foreground text-sm">{sop.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{sop.instruction}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSop(sop.id, sop.is_active)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          sop.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {sop.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingSop(sop);
                          setSopForm({
                            title: sop.title,
                            instruction: sop.instruction,
                            category: sop.category,
                            priority: sop.priority,
                          });
                          setShowSopModal(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteSop(sop.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SOP Modal */}
          {showSopModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingSop ? "Edit SOP" : "Add SOP Instruction"}
                  </h3>
                  <button onClick={() => { setShowSopModal(false); setEditingSop(null); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
                      <select
                        value={sopForm.category}
                        onChange={(e) => setSopForm({ ...sopForm, category: e.target.value })}
                        className="input-field"
                      >
                        {SOP_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Priority</label>
                      <input
                        type="number"
                        value={sopForm.priority}
                        onChange={(e) => setSopForm({ ...sopForm, priority: parseInt(e.target.value) || 0 })}
                        min={0}
                        max={100}
                        className="input-field"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Higher = more important</p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
                    <input
                      type="text"
                      value={sopForm.title}
                      onChange={(e) => setSopForm({ ...sopForm, title: e.target.value })}
                      placeholder="e.g., Handle pricing objection"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Instruction</label>
                    <textarea
                      value={sopForm.instruction}
                      onChange={(e) => setSopForm({ ...sopForm, instruction: e.target.value })}
                      placeholder="When a customer says the price is too high, respond by highlighting the value and mentioning any available promotions..."
                      rows={5}
                      className="input-field resize-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => { setShowSopModal(false); setEditingSop(null); }} className="btn-surface h-10 px-4 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={saveSop}
                    disabled={!sopForm.title || !sopForm.instruction || saving}
                    className="btn-primary h-10 px-4 text-sm"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingSop ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingSop ? "Update" : "Add"} SOP
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── LEGACY BUSINESS CONTEXT TAB ─── */}
      {tab === "legacy" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {contexts.length} item{contexts.length !== 1 ? "s" : ""} — use FAQs and SOP tabs above for new entries
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary h-10 px-4 text-sm">
              <Plus className="h-4 w-4" /> Add Context
            </button>
          </div>

          {contexts.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="mt-4 font-medium text-foreground">No legacy context</p>
              <p className="mt-1 text-sm text-muted-foreground">Use the FAQs and SOP tabs instead</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
              {contexts.map((ctx) => {
                const typeInfo = CONTEXT_TYPES.find((t) => t.value === ctx.context_type);
                const Icon = typeInfo?.icon || MessageSquare;
                return (
                  <div key={ctx.id} className="p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                            {typeInfo?.label || ctx.context_type}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ctx.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}>
                            {ctx.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {ctx.question && <p className="mt-1 font-medium text-foreground text-sm">Q: {ctx.question}</p>}
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">A: {ctx.answer}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(ctx.id, ctx.is_active)}
                          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                            ctx.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {ctx.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDeleteContext(ctx.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legacy Add Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-foreground">Add Business Context</h3>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Context Type</label>
                    <select
                      value={newContext.context_type}
                      onChange={(e) => setNewContext({ ...newContext, context_type: e.target.value })}
                      className="input-field"
                    >
                      {CONTEXT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label} - {type.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Question (Optional)</label>
                    <input
                      type="text"
                      value={newContext.question}
                      onChange={(e) => setNewContext({ ...newContext, question: e.target.value })}
                      placeholder="e.g., What are your business hours?"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Answer / Information</label>
                    <textarea
                      value={newContext.answer}
                      onChange={(e) => setNewContext({ ...newContext, answer: e.target.value })}
                      placeholder="Enter the information the AI should know..."
                      rows={4}
                      className="input-field resize-none"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => { setShowAddModal(false); setNewContext({ context_type: "faq", question: "", answer: "" }); }} className="btn-surface h-10 px-4 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleAddContext}
                    disabled={!newContext.answer || saving}
                    className="btn-primary h-10 px-4 text-sm"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add Context
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}