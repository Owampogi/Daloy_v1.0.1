import { useEffect, useState } from "react";
import {
  Bell, UserCircle, Users, Inbox, Tag, Zap, Sparkles,
  Plus, Pencil, Trash2, X, Check, Loader2, Mail, CheckCircle2,
} from "lucide-react";
import AIPage from "./ai-page";
import { useOutletContext } from "react-router";
import { supabase } from "~/services/supabase-client";

// ─── Types ─────────────────────────────────────────────────────────────────────
type SettingsTab = "account" | "agents" | "inboxes" | "labels" | "automations" | "ai";

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
  { key: "ai",          label: "AI Assistant", icon: Sparkles },
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

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
  instagram: {
    label: "Instagram",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
        <defs>
          <radialGradient id="igGrad" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="5%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="60%" stopColor="#d6249f" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#igGrad)" />
        <circle cx="12" cy="12" r="5" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1.4" fill="#fff" />
      </svg>
    ),
    bg: "bg-pink-50",
  },
  facebook: {
    label: "Facebook",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
        <path
          d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.791-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.384C19.612 22.954 24 17.99 24 12z"
          fill="#1877F2"
        />
        <path
          d="M16.671 15.47L17.203 12h-3.328V9.75c0-.95.465-1.875 1.956-1.875h1.514V4.923s-1.374-.235-2.686-.235c-2.742 0-4.533 1.66-4.533 4.668V12H7.078v3.47h3.047v8.384a12.09 12.09 0 003.75 0V15.47h2.796z"
          fill="#fff"
        />
      </svg>
    ),
    bg: "bg-blue-50",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
        <path
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
          fill="#25D366"
        />
        <path
          d="M12.05 2C6.532 2 2.005 6.527 2.005 12.045c0 1.768.463 3.48 1.34 4.997L2 22l5.14-1.335a9.987 9.987 0 004.91 1.28h.005c5.517 0 10.044-4.527 10.044-10.045C22.1 6.527 17.573 2 12.05 2zm0 18.348a8.33 8.33 0 01-4.237-1.16l-.304-.18-3.05.793.815-2.97-.198-.306a8.32 8.32 0 01-1.278-4.437c0-4.603 3.743-8.345 8.35-8.345 4.607 0 8.35 3.742 8.35 8.345 0 4.604-3.743 8.256-8.35 8.256v.101z"
          fill="#fff"
        />
      </svg>
    ),
    bg: "bg-green-50",
  },
  email: {
    label: "Customer Email",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M1 5.828v12.344h22V5.828L12 13.5 1 5.828z" fill="#F4B400" />
        <path d="M1 5.828l11 7.672 11-7.672" fill="#EA4335" />
        <path d="M1 18.172V5.828L12 13.5z" fill="#F4B400" />
        <path d="M23 5.828v12.344L12 13.5z" fill="#DB4437" />
        <path d="M1 5.828l11 7.672L23 5.828 12 13.5z" fill="#4285F4" />
      </svg>
    ),
    bg: "bg-amber-50",
  },
  tiktok: {
    label: "TikTok",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
        <path
          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
          fill="#000"
        />
        <path
          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
          fill="#25F4EE"
        />
        <path
          d="M16.43 2.39c-.89-.52-1.57-1.3-1.9-2.27-.07-.23-.11-.47-.14-.71v-.41c.02-.01.06-.02.08-.02.44-.02.88-.01 1.32-.01.03.11.06.22.09.33.41 1.3 1.44 2.31 2.74 2.7.06.02.12.03.18.05v4.11c-1.33-.04-2.65-.33-3.82-.91-.02-.01-.04-.02-.06-.03v-2.88c.01-.01.03-.02.04-.02.47-.22.93-.48 1.36-.8.19-.14.37-.3.54-.46l-.23.01z"
          fill="#FE2C55"
        />
      </svg>
    ),
    bg: "bg-slate-50",
  },
  website: {
    label: "Website",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#6D28D9" strokeWidth="2" />
        <ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="#6D28D9" strokeWidth="1.5" />
        <line x1="2" y1="12" x2="22" y2="12" stroke="#6D28D9" strokeWidth="1.5" />
        <path d="M4.5 7h15" stroke="#6D28D9" strokeWidth="1" fill="none" />
        <path d="M4.5 17h15" stroke="#6D28D9" strokeWidth="1" fill="none" />
      </svg>
    ),
    bg: "bg-violet-50",
  },
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

// ─── Toast ─────────────────────────────────────────────────────────────────────
interface ToastState {
  show: boolean;
  type: "success" | "error";
  title: string;
  message: string;
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast.show]);

  if (!toast.show) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-bottom-4 max-w-sm ${
      toast.type === "success"
        ? "border-green-200 bg-green-50 text-green-900"
        : "border-red-200 bg-red-50 text-red-900"
    }`}>
      {toast.type === "success"
        ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
        : <X className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
      </div>
      <button onClick={onClose} className="h-5 w-5 flex items-center justify-center rounded hover:opacity-60 shrink-0">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, displayName, initials } = useOutletContext<any>();
  const [tab, setTab] = useState<SettingsTab>("account");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState>({
    show: false, type: "success", title: "", message: "",
  });

  function showToast(type: "success" | "error", title: string, message: string) {
    setToast({ show: true, type, title, message });
  }

  // Account
  const [fullName, setFullName] = useState(displayName ?? "");
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgTiktok, setOrgTiktok] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState("");

  // Agents
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Inboxes
  const [inboxes, setInboxes] = useState<InboxChannel[]>([]);
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [connectValue, setConnectValue] = useState("");
  const [savingConnect, setSavingConnect] = useState(false);

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
        const { data: memberData, error } = await supabase
          .from("organization_members")
          .select("organization_id, role")
          .eq("user_id", user.id)
          .maybeSingle(); // ← change .single() to .maybeSingle()

        if (!memberData) {
          console.warn("No organization found for user:", user.id);
          return;
        }

        const oid = memberData.organization_id;
        setOrgId(oid);

        const { data: org } = await supabase
          .from("organizations")
          .select("name, email, tiktok, website")
          .eq("id", oid)
          .maybeSingle(); // ← also here

        setOrgName(org?.name ?? "");
        setOrgEmail(org?.email ?? "");
        setOrgTiktok(org?.tiktok ?? "");
        setOrgWebsite(org?.website ?? "");

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
      await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (orgId) {
        await supabase.from("organizations").update({ name: orgName }).eq("id", orgId);
      }
      if (newPw) {
        const { error } = await supabase.auth.updateUser({ password: newPw });
        if (error) {
          setAccountMsg("Password error: " + error.message);
          setSavingAccount(false);
          return;
        }
        setCurrentPw(""); setNewPw("");
      }
      setAccountMsg("Saved successfully!");
      showToast("success", "Account updated", "Your profile changes have been saved.");
    } catch {
      setAccountMsg("Something went wrong.");
      showToast("error", "Save failed", "Something went wrong. Please try again.");
    }
    setSavingAccount(false);
  }

  // ── Agents — invite via Supabase Edge Function ────────────────────────────
  async function inviteAgent() {
    if (!inviteEmail.trim() || !orgId) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      showToast("error", "Invalid email", "Please enter a valid email address.");
      return;
    }

    setInviting(true);
    setInviteSuccess(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            organization_id: orgId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error ?? "Failed to send invitation.");
      }

      setInviteSuccess(true);
      setInviteEmail("");
      showToast("success", "Invitation sent!", `An invite email has been sent to ${inviteEmail.trim()}.`);
      setTimeout(() => setInviteSuccess(false), 3000);

    } catch (err: any) {
      showToast("error", "Invite failed", err.message ?? "Could not send the invitation. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function removeAgent(userId: string) {
    if (!orgId) return;
    await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", userId);
    fetchAgents(orgId);
    showToast("success", "Agent removed", "The agent has been removed from your organization.");
  }

  // ── Inboxes ───────────────────────────────────────────────────────────────
  function openConnectModal(channel: string) {
    const currentValue =
      channel === "email" ? orgEmail :
      channel === "tiktok" ? orgTiktok :
      channel === "website" ? orgWebsite : "";
    setConnectModal(channel);
    setConnectValue(currentValue);
  }

  async function saveConnect() {
    if (!orgId || !connectModal) return;
    setSavingConnect(true);
    const field = connectModal === "email" ? "email" : connectModal === "tiktok" ? "tiktok" : "website";
    await supabase.from("organizations").update({ [field]: connectValue || null }).eq("id", orgId);
    if (field === "email") setOrgEmail(connectValue);
    if (field === "tiktok") setOrgTiktok(connectValue);
    if (field === "website") setOrgWebsite(connectValue);
    setSavingConnect(false);
    setConnectModal(null);
    showToast("success", `${CHANNEL_META[connectModal]?.label} connected`, "Your contact info has been saved.");
  }

  function disconnectChannel(channel: string) {
    if (!orgId) return;
    const field = channel === "email" ? "email" : channel === "tiktok" ? "tiktok" : "website";
    supabase.from("organizations").update({ [field]: null }).eq("id", orgId);
    if (field === "email") setOrgEmail("");
    if (field === "tiktok") setOrgTiktok("");
    if (field === "website") setOrgWebsite("");
    showToast("success", `${CHANNEL_META[channel]?.label} disconnected`, "The channel has been disconnected.");
  }

  function isChannelConnected(channel: string) {
    return channel === "email" ? !!orgEmail : channel === "tiktok" ? !!orgTiktok : channel === "website" ? !!orgWebsite : false;
  }

  function getChannelHandle(channel: string) {
    return channel === "email" ? orgEmail : channel === "tiktok" ? orgTiktok : channel === "website" ? orgWebsite : "";
  }

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
      {/* Toast notification */}
      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />

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

              {/* ── Invite agent section ── */}
              <div className="border-t border-border pt-5">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Invite agent</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  They'll receive an email to create their account and join your organization.
                </p>

                <div className="flex gap-2">
                  <input
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setInviteSuccess(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && inviteAgent()}
                    placeholder="agent@email.com"
                    disabled={inviting}
                    className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
                  />
                  <button
                    onClick={inviteAgent}
                    disabled={inviting || !inviteEmail.trim()}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium transition-all disabled:opacity-50 ${
                      inviteSuccess
                        ? "bg-green-600 text-white"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {inviting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : inviteSuccess ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {inviteSuccess ? "Sent!" : "Invite"}
                  </button>
                </div>

                {/* Pending invite note */}
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="opacity-60">ℹ</span>
                  The invite link expires in 24 hours. The agent will appear here once they accept.
                </p>
              </div>
            </div>
          )}

          {/* ── INBOXES ── */}
          {tab === "inboxes" && (
            <div className="max-w-lg">
              <h2 className="text-base font-semibold text-foreground mb-1">Inboxes</h2>
              <p className="text-xs text-muted-foreground mb-6">Connect your social media channels</p>

              {inboxes.length === 0 ? (
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

              {/* Additional Channels */}
              <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-sm font-semibold text-foreground mb-1">Additional channels</h3>
                <p className="text-xs text-muted-foreground mb-4">Connect your email, TikTok, or website</p>

                {(["email", "tiktok", "website"] as const).map((ch) => {
                  const meta = CHANNEL_META[ch];
                  const connected = isChannelConnected(ch);
                  const handle = getChannelHandle(ch);
                  return (
                    <div key={ch} className="flex items-center gap-4 rounded-xl border border-border bg-background px-4 py-3 mb-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${meta.bg}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{meta.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {handle ? `${handle} · ` : ""}
                          {connected ? "Connected" : "Not connected"}
                        </p>
                      </div>
                      {connected ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => disconnectChannel(ch)}
                            className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openConnectModal(ch)}
                          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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

          {/* ── AI ASSISTANT ── */}
          {tab === "ai" && <AIPage />}

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

      {/* ── Connect Channel Modal ── */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-lg">{CHANNEL_META[connectModal]?.icon}</span>
                <p className="text-sm font-semibold">Connect {CHANNEL_META[connectModal]?.label}</p>
              </div>
              <button onClick={() => setConnectModal(null)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {connectModal === "email" ? "Email address" : connectModal === "tiktok" ? "TikTok username or URL" : "Website URL"}
              </label>
              <input
                value={connectValue}
                onChange={(e) => setConnectValue(e.target.value)}
                placeholder={
                  connectModal === "email" ? "customer@example.com" : connectModal === "tiktok" ? "@yourtiktok" : "https://yourbusiness.com"
                }
                type={connectModal === "email" ? "email" : connectModal === "website" ? "url" : "text"}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveConnect()}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setConnectModal(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={saveConnect}
                disabled={savingConnect || !connectValue.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {savingConnect ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

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