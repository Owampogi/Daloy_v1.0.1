import {
  Bell,
  Plus,
  Loader2,
  MoreHorizontal,
  Phone,
  Mail,
  X,
  GripVertical,
  Users,
  ChevronDown,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { useOutletContext } from "react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "~/services/supabase-client";

// ── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  name: string;
  source: string;
  status: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

type StageKey = "New" | "Qualified" | "Follow-up" | "Closed" | "Converted" | "Won" | "Cold";

interface Stage {
  key: StageKey;
  label: string;
  color: string;        // dot / accent color (tailwind arbitrary or var)
  headerCls: string;   // subtle header bg
  cardAccent: string;  // left border color on card
}

// ── Stage Config ─────────────────────────────────────────────────────────────
const STAGES: Stage[] = [
  { key: "New",       label: "New",        color: "bg-accent",           headerCls: "bg-accent/8",    cardAccent: "border-l-accent" },
  { key: "Qualified", label: "Qualified",  color: "bg-accent",           headerCls: "bg-accent/8",    cardAccent: "border-l-accent" },
  { key: "Follow-up", label: "Follow-up",  color: "bg-amber-400",        headerCls: "bg-amber-50",    cardAccent: "border-l-amber-400" },
  { key: "Cold",      label: "Cold",       color: "bg-gray-400",         headerCls: "bg-gray-50",     cardAccent: "border-l-gray-300" },
  { key: "Closed",    label: "Closed",     color: "bg-red-400",          headerCls: "bg-red-50",      cardAccent: "border-l-red-400" },
  { key: "Converted", label: "Converted",  color: "bg-emerald-400",      headerCls: "bg-emerald-50",  cardAccent: "border-l-emerald-400" },
];

const statusStyles: Record<string, string> = {
  New:        "bg-accent-soft text-accent",
  Qualified:  "bg-accent/10 text-accent",
  "Follow-up":"bg-amber-50 text-amber-700",
  Cold:       "bg-gray-100 text-gray-500",
  Closed:     "bg-red-50 text-red-600",
  Converted:  "bg-emerald-50 text-emerald-700",
  Won:        "bg-emerald-50 text-emerald-700",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

// ── Lead Card ─────────────────────────────────────────────────────────────────
function LeadCard({
  lead,
  stage,
  onEdit,
  onDragStart,
}: {
  lead: Lead;
  stage: Stage;
  onEdit: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
}) {
  const initials = lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      className={`group relative rounded-xl border border-border border-l-2 ${stage.cardAccent} bg-background p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground leading-tight">{lead.name}</p>
            <p className="text-xs text-muted-foreground">{lead.source} · {timeAgo(lead.created_at)}</p>
          </div>
        </div>
        <button
          onClick={() => onEdit(lead)}
          className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary hover:text-foreground transition-opacity"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {lead.notes && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{lead.notes}</p>
      )}

      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent"
          >
            <Mail className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{lead.email}</span>
          </a>
        )}
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent"
          >
            <Phone className="h-3 w-3" />
            {lead.phone}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  lead,
  onClose,
  onSaved,
  onDeleted,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const STATUS_OPTIONS = ["New", "Qualified", "Follow-up", "Cold", "Closed", "Converted", "Won"];
  const SOURCE_OPTIONS = ["Facebook", "Instagram", "Referral", "Walk-in", "Website", "Other"];

  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    source: lead.source,
    status: lead.status,
    notes: lead.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      const { error: err } = await supabase.from("leads").update({ ...form }).eq("id", lead.id);
      if (err) throw err;
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await supabase.from("leads").delete().eq("id", lead.id);
      onDeleted(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Edit Lead</p>
          <button onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name *</label>
            <input className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
              <input className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Source</label>
              <select className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <select className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
            <textarea rows={3} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`h-9 rounded-lg px-3 text-xs font-medium transition-colors ${confirmDelete ? "bg-red-500 text-white hover:bg-red-600" : "text-red-500 hover:bg-red-50"}`}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : confirmDelete ? "Confirm delete" : "Delete lead"}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-surface h-9 px-4 text-xs">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary h-9 px-4 text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function loader() { return {}; }

export default function PipelinePage() {
  const { user, displayName, initials, plan } = useOutletContext<any>();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // drag state
  const draggingLead = useRef<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  async function fetchLeads(oid: string) {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("leads")
        .select("id, name, source, status, email, phone, notes, created_at")
        .eq("organization_id", oid)
        .order("created_at", { ascending: false });
      setLeads(data ?? []);
    } catch (err) {
      console.error("Pipeline fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.organization_id) {
          setOrgId(data.organization_id);
          fetchLeads(data.organization_id);
        }
      });
  }, [user]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, lead: Lead) {
    draggingLead.current = lead;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageKey);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  async function handleDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    setDragOverStage(null);
    const lead = draggingLead.current;
    if (!lead || lead.status === stageKey) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: stageKey } : l))
    );

    try {
      await supabase.from("leads").update({ status: stageKey }).eq("id", lead.id);
    } catch (err) {
      // revert on error
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: lead.status } : l))
      );
    }
    draggingLead.current = null;
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const convertedCount = leads.filter((l) => ["Converted", "Won"].includes(l.status)).length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;
  const followUpCount = leads.filter((l) => l.status === "Follow-up").length;

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-xl">
        <div>
          <p className="text-base font-semibold text-foreground">Pipeline</p>
          <p className="text-xs text-muted-foreground">
            {totalLeads} leads · {conversionRate}% conversion rate
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
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

      <main className="flex flex-col flex-1 overflow-hidden">

        {/* Summary bar */}
        <div className="flex items-center gap-4 border-b border-border px-6 py-3 bg-background overflow-x-auto">
          {[
            { label: "Total Leads", value: totalLeads },
            { label: "Follow-ups", value: followUpCount, warn: followUpCount > 0 },
            { label: "Converted", value: convertedCount },
            { label: "Conversion Rate", value: `${conversionRate}%` },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <div className="text-center">
                <p className={`text-lg font-semibold leading-none ${s.warn ? "text-amber-600" : "text-foreground"}`}>{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
              </div>
              <div className="ml-2 h-6 w-px bg-border last:hidden" />
            </div>
          ))}

          <div className="ml-auto shrink-0 flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Drag cards to move stages</span>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:block" />
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 gap-4 overflow-x-auto px-6 py-5 pb-8 min-h-0">
            {STAGES.map((stage) => {
              const stageLeads = leads.filter((l) => l.status === stage.key);
              const isDragTarget = dragOverStage === stage.key;

              return (
                <div
                  key={stage.key}
                  className="flex flex-col shrink-0 w-[280px]"
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.key)}
                >
                  {/* Column header */}
                  <div className={`flex items-center justify-between rounded-t-xl border border-b-0 border-border px-3.5 py-3 ${stage.headerCls}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                      <p className="text-xs font-semibold text-foreground">{stage.label}</p>
                    </div>
                    <span className="rounded-full bg-background border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Drop zone */}
                  <div
                    className={`flex flex-1 flex-col gap-2.5 rounded-b-xl border border-border p-2.5 min-h-[120px] transition-colors ${
                      isDragTarget ? "bg-accent/5 border-accent/40" : "bg-secondary/30"
                    }`}
                  >
                    {stageLeads.length === 0 ? (
                      <div className={`flex flex-1 items-center justify-center rounded-lg border-2 border-dashed text-xs text-muted-foreground/60 py-6 transition-colors ${isDragTarget ? "border-accent/40 text-accent" : "border-border/50"}`}>
                        {isDragTarget ? "Drop here" : "No leads"}
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          stage={stage}
                          onEdit={(l) => setEditingLead(l)}
                          onDragStart={handleDragStart}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {editingLead && (
        <EditModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSaved={() => orgId && fetchLeads(orgId)}
          onDeleted={() => {
            setLeads((prev) => prev.filter((l) => l.id !== editingLead.id));
          }}
        />
      )}
    </>
  );
}