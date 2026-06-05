import { useEffect, useState } from "react";
import {
  Bell, UserCircle, Users, Inbox, Tag, Zap,
  Plus, Pencil, Trash2, X, Check, Loader2,
} from "lucide-react";
import { useOutletContext } from "react-router";
import { supabase } from "~/services/supabase-client";

// ─── Types ─────────────────────────────────────────────────────────────────────
type SettingsTab = "account" | "agents" | "inboxes" | "labels" | "automations";

interface Agent {
  user_id: string;
  full_name: string;
  email: string;
  role: "admin" | "agent";
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface InboxChannel {
  id: string;
  channel: "instagram" | "facebook" | "whatsapp";
  name: string;
  handle: string | null;
  is_connected: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const NAV: { key: SettingsTab; label: string; icon: any }[] = [
  { key: "account",     label: "Account",     icon: UserCircle },
  { key: "agents",      label: "Agents",      icon: Users },
  { key: "inboxes",     label: "Inboxes",     icon: Inbox },
  { key: "labels",      label: "Labels",      icon: Tag },
  { key: "automations", label: "Automations", icon: Zap },
];

const LABEL_COLORS = [
  { value: "#185FA5", label: "Blue" },
  { value: "#27500A", label: "Green" },
  { value: "#791F1F", label: "Red" },
  { value: "#633806", label: "Amber" },
  { value: "#3C3489", label: "Purple" },
  { value: "#444441", label: "Gray" },
];

const LABEL_BG: Record<string, string> = {
  "#185FA5": "bg-blue-100 text-blue-800",
  "#27500A": "bg-green-100 text-green-800",
  "#791F1F": "bg-red-100 text-red-800",
  "#633806": "bg-amber-100 text-amber-800",
  "#3C3489": "bg-purple-100 text-purple-800",
  "#444441": "bg-gray-100 text-gray-700",
};

const CHANNEL_META = {
  instagram: { label: "Instagram", icon: "📸", bg: "bg-pink-50" },
  facebook:  { label: "Facebook",  icon: "📘", bg: "bg-blue-50" },
  whatsapp:  { label: "WhatsApp",  icon: "💬", bg: "bg-green-50" },
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-pink-100 text-pink-800",
  "bg-green-100 text-green-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, displayName, initials } = useOutletContext<any>();
  const [tab, setTab] = useState<SettingsTab>("account");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Account
  const [fullName, setFullName] = useState(displayName ?? "");
  const [orgName, setOrgName] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState("");

  // Agents
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // Inboxes
  const [inboxes, setInboxes] = useState<InboxChannel[]>([]);

  // Labels
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#185FA5");
  const [addingLabel, setAddingLabel] = useState(false);

  // Automations
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoForm, setAutoForm] = useState({ name: "", description: "" });
  const [savingAuto, setSavingAuto] = useState(false);
  const [editAuto, setEditAuto] = useState<Automation | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function init() {
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .single();
      if (!memberData) return;
      const oid = memberData.organization_id;
      setOrgId(oid);

      // Org name
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", oid)
        .single();
      setOrgName(org?.name ?? "");

      fetchAgents(oid);
      fetchInboxes(oid);
      fetchLabels(oid);
      fetchAutomations(oid);
    }
    init();
  }, [user]);

  async function fetchAgents(oid: string) {
    const { data } = await supabase
      .from("organization_members")
      .select("user_id, role, profiles:user_id(full_name, email)")
      .eq("organization_id", oid);
    setAgents(
      (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name ?? m.profiles?.email ?? "Unknown",
        email: m.profiles?.email ?? "",
        role: m.role ?? "agent",
      }))
    );
  }

  async function fetchInboxes(oid: string) {
    const { data } = await supabase
      .from("inboxes")
      .select("*")
      .eq("organization_id", oid);
    setInboxes(data ?? []);
  }

  async function fetchLabels(oid: string) {
    const { data } = await supabase
      .from("labels")
      .select("*")
      .eq("organization_id", oid)
      .order("name");
    setLabels(data ?? []);
  }

  async function fetchAutomations(oid: string) {
    const { data } = await supabase
      .from("automations")
      .select("*")
      .eq("organization_id", oid)
      .order("created_at", { ascending: false });
    setAutomations(data ?? []);
  }

  // ── Account ───────────────────────────────────────────────────────────────
  async function saveAccount() {
    setSavingAccount(true);
    setAccountMsg("");
    try {
      // Update display name
      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      // Update org name
      if (orgId) {
        await supabase
          .from("organizations")
          .update({ name: orgName })
          .eq("id", orgId);
      }
      // Change password
      if (newPw) {
        const { error } = await supabase.auth.updateUser({ password: newPw });
        if (error) { setAccountMsg("Password error: " + error.message); setSavingAccount(false); return; }
        setCurrentPw(""); setNewPw("");
      }
      setAccountMsg("Saved successfully!");
    } catch {
      setAccountMsg("Something went wrong.");
    }
    setSavingAccount(false);
  }

  // ── Agents ────────────────────────────────────────────────────────────────
  async function inviteAgent() {
    if (!inviteEmail || !orgId) return;
    setInviting(true);
    // Insert invite (extend with email sending via Resend)
    await supabase.from("invites").insert({
      organization_id: orgId,
      email: inviteEmail,
      invited_by: user.id,
    });
    setInviteEmail("");
    setInviting(false);
  }

  async function removeAgent(userId: string) {
    if (!orgId) return;
    await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", userId);
    fetchAgents(orgId);
  }

  // ── Inboxes ───────────────────────────────────────────────────────────────
  async function toggleInbox(inbox: InboxChannel) {
    await supabase
      .from("inboxes")
      .update({ is_connected: !inbox.is_connected })
      .eq("id", inbox.id);
    if (orgId) fetchInboxes(orgId);
  }

  // ── Labels ────────────────────────────────────────────────────────────────
  async function addLabel() {
    if (!newLabelName.trim() || !orgId) return;
    setAddingLabel(true);
    await supabase.from("labels").insert({
      organization_id: orgId,
      name: newLabelName.trim(),
      color: newLabelColor,
    });
    setNewLabelName("");
    fetchLabels(orgId);
    setAddingLabel(false);
  }

  async function deleteLabel(id: string) {
    if (!orgId) return;
    await supabase.from("labels").delete().eq("id", id);
    fetchLabels(orgId);
  }

  // ── Automations ───────────────────────────────────────────────────────────
  function openAutoModal(auto?: Automation) {
    if (auto) {
      setEditAuto(auto);
      setAutoForm({ name: auto.name, description: auto.description });
    } else {
      setEditAuto(null);
      setAutoForm({ name: "", description: "" });
    }
    setShowAutoModal(true);
  }

  async function saveAutomation() {
    if (!autoForm.name.trim() || !orgId) return;
    setSavingAuto(true);
    if (editAuto) {
      await supabase
        .from("automations")
        .update({ name: autoForm.name, description: autoForm.description })
        .eq("id", editAuto.id);
    } else {
      await supabase.from("automations").insert({
        organization_id: orgId,
        name: autoForm.name,
        description: autoForm.description,
        is_active: false,
      });
    }
    setSavingAuto(false);
    setShowAutoModal(false);
    fetchAutomations(orgId);
  }

  async function toggleAutomation(auto: Automation) {
    await supabase
      .from("automations")
      .update({ is_active: !auto.is_active })
      .eq("id", auto.id);
    if (orgId) fetchAutomations(orgId);
  }

  async function deleteAutomation(id: string) {
    if (!orgId) return;
    await supabase.from("automations").delete().eq("id", id);
    fetchAutomations(orgId);
  }

  // ── Shared UI helpers ─────────────────────────────────────────────────────
  function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? "bg-primary" : "bg-border"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-xl">
        <div>
          <p className="text-base font-semibold text-foreground">Settings</p>
          <p className="text-xs text-muted-foreground">Manage your account and workspace</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Settings body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

        {/* Sidebar nav */}
        <aside className="w-52 shrink-0 border-r border-border bg-secondary/30 flex flex-col py-3">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                tab === item.key
                  ? "bg-background text-foreground border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </aside>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* ── ACCOUNT ── */}
          {tab === "account" && (
            <div className="max-w-lg">
              <h2 className="text-base font-semibold text-foreground mb-1">Account settings</h2>
              <p className="text-xs text-muted-foreground mb-6">Update your profile information</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                  <input
                    value={user?.email ?? ""}
                    disabled
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Organization name</label>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="border-t border-border pt-5 mb-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Change password</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current password</label>
                    <input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">New password</label>
                    <input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {accountMsg && (
                <p className={`text-xs mb-3 ${accountMsg.includes("error") ? "text-red-600" : "text-green-600"}`}>
                  {accountMsg}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={saveAccount}
                  disabled={savingAccount}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingAccount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save changes
                </button>
              </div>
            </div>
          )}

          {/* ── AGENTS ── */}
          {tab === "agents" && (
            <div className="max-w-lg">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-foreground">Agents</h2>
                <span className="text-xs text-muted-foreground">{agents.length} member{agents.length !== 1 ? "s" : ""}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">Team members in your organization</p>

              <div className="space-y-2 mb-6">
                {agents.map((agent, i) => (
                  <div key={agent.user_id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                    <span className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {getInitials(agent.full_name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{agent.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                      agent.role === "admin" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                    }`}>
                      {agent.role}
                    </span>
                    {agent.user_id !== user?.id && (
                      <button
                        onClick={() => removeAgent(agent.user_id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Invite agent</h3>
                <div className="flex gap-2">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="agent@email.com"
                    className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={inviteAgent}
                    disabled={inviting || !inviteEmail}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Invite
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── INBOXES ── */}
          {tab === "inboxes" && (
            <div className="max-w-lg">
              <h2 className="text-base font-semibold text-foreground mb-1">Inboxes</h2>
              <p className="text-xs text-muted-foreground mb-6">Connect your social media channels</p>

              {inboxes.length === 0 ? (
                // Show default channel cards if none in DB yet
                (["instagram", "facebook", "whatsapp"] as const).map((ch) => {
                  const meta = CHANNEL_META[ch];
                  return (
                    <div key={ch} className="flex items-center gap-4 rounded-xl border border-border bg-background px-4 py-3 mb-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${meta.bg}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">Not connected</p>
                      </div>
                      <button className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                        Connect
                      </button>
                    </div>
                  );
                })
              ) : (
                inboxes.map((inbox) => {
                  const meta = CHANNEL_META[inbox.channel];
                  return (
                    <div key={inbox.id} className="flex items-center gap-4 rounded-xl border border-border bg-background px-4 py-3 mb-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${meta.bg}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {inbox.handle ? `${inbox.handle} · ` : ""}
                          {inbox.is_connected ? "Connected" : "Not connected"}
                        </p>
                      </div>
                      <Toggle on={inbox.is_connected} onToggle={() => toggleInbox(inbox)} />
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── LABELS ── */}
          {tab === "labels" && (
            <div className="max-w-lg">
              <h2 className="text-base font-semibold text-foreground mb-1">Labels</h2>
              <p className="text-xs text-muted-foreground mb-6">Tags for organizing conversations and leads</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {labels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No labels yet. Add one below.</p>
                ) : (
                  labels.map((label) => (
                    <div key={label.id} className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium ${LABEL_BG[label.color] ?? "bg-gray-100 text-gray-700"}`}>
                      {label.name}
                      <button
                        onClick={() => deleteLabel(label.id)}
                        className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Add label</h3>
                <div className="flex gap-2 items-center">
                  <input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLabel()}
                    placeholder="Label name..."
                    className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <select
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {LABEL_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={addLabel}
                    disabled={addingLabel || !newLabelName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {addingLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── AUTOMATIONS ── */}
          {tab === "automations" && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-foreground">Automations</h2>
                <button
                  onClick={() => openAutoModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" /> Create automation
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Automation can replace and streamline processes that require manual effort.
              </p>

              {automations.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No automations yet</p>
                  <p className="text-xs mt-1">Create your first automation rule</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_100px_96px] px-4 py-2.5 bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Name</span>
                    <span className="text-center">Active</span>
                    <span className="text-center">Created</span>
                    <span className="text-center">Actions</span>
                  </div>
                  {automations.map((auto) => (
                    <div key={auto.id} className="grid grid-cols-[1fr_80px_100px_96px] px-4 py-3 border-b border-border last:border-0 items-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">{auto.name}</p>
                        {auto.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{auto.description}</p>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <Toggle on={auto.is_active} onToggle={() => toggleAutomation(auto)} />
                      </div>
                      <div className="text-center text-xs text-muted-foreground">
                        {new Date(auto.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openAutoModal(auto)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteAutomation(auto.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-border hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Automation Modal ── */}
      {showAutoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{editAuto ? "Edit automation" : "Create automation"}</p>
              </div>
              <button onClick={() => setShowAutoModal(false)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name *</label>
                <input
                  value={autoForm.name}
                  onChange={(e) => setAutoForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Notify on new lead"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                <textarea
                  value={autoForm.description}
                  onChange={(e) => setAutoForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What does this automation do?"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowAutoModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={saveAutomation}
                disabled={savingAuto || !autoForm.name.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {savingAuto && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editAuto ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}