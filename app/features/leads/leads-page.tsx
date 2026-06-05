import {
  Users,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Bell,
  ChevronDown,
  X,
  Loader2,
  Phone,
  Mail,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { Link, useOutletContext } from "react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "~/services/supabase-client";

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

const STATUS_OPTIONS = ["New", "Qualified", "Follow-up", "Cold", "Closed", "Converted", "Won"];
const SOURCE_OPTIONS = ["Facebook", "Instagram", "Referral", "Walk-in", "Website", "Other"];

const statusStyles: Record<string, string> = {
  New: "bg-accent-soft text-accent",
  Qualified: "bg-accent/10 text-accent",
  "Follow-up": "bg-amber-50 text-amber-700",
  Cold: "bg-gray-100 text-gray-500",
  Closed: "bg-red-50 text-red-600",
  Converted: "bg-emerald-50 text-emerald-700",
  Won: "bg-emerald-50 text-emerald-700",
};

export function loader() {
  return {};
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

// ── Add / Edit Lead Modal ────────────────────────────────────────────────────
function LeadModal({
  lead,
  organizationId,
  onClose,
  onSaved,
}: {
  lead: Lead | null;
  organizationId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!lead;
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    source: lead?.source ?? "Facebook",
    status: lead?.status ?? "New",
    notes: lead?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const { error: err } = await supabase
          .from("leads")
          .update({ ...form })
          .eq("id", lead!.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("leads")
          .insert([{ ...form, organization_id: organizationId }]);
        if (err) throw err;
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-foreground">{isEdit ? "Edit Lead" : "Add New Lead"}</p>
          <button onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name *</label>
            <input
              className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Juan dela Cruz"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="juan@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
              <input
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="09XX XXX XXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Source</label>
              <select
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              placeholder="Any details about this lead..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className="btn-surface h-9 px-4 text-xs">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary h-9 px-4 text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEdit ? "Save changes" : "Add lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const { user, displayName, initials, plan, config: layoutConfig } =
    useOutletContext<any>();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterSource, setFilterSource] = useState<string>("All");
  const [sortField, setSortField] = useState<"created_at" | "name">("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  async function fetchLeads(oid: string) {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("leads")
        .select("id, name, source, status, email, phone, notes, created_at")
        .eq("organization_id", oid)
        .order(sortField, { ascending: sortAsc });
      setLeads(data ?? []);
    } catch (err) {
      console.error("Leads fetch error:", err);
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
  }, [user, sortField, sortAsc]);

  const filtered = leads.filter((l) => {
    const matchSearch =
      search === "" ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? "").includes(search);
    const matchStatus = filterStatus === "All" || l.status === filterStatus;
    const matchSource = filterSource === "All" || l.source === filterSource;
    return matchSearch && matchStatus && matchSource;
  });

  const counts = STATUS_OPTIONS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  function toggleSort(field: "created_at" | "name") {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(true); }
  }

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-xl">
        <div>
          <p className="text-base font-semibold text-foreground">Leads</p>
          <p className="text-xs text-muted-foreground">
            {leads.length} total · {leads.filter((l) => l.status === "New").length} new
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditingLead(null); setShowModal(true); }}
            className="btn-primary h-9 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add lead
          </button>
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

      <main className="flex-1 px-6 py-8">

        {/* Status summary pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[{ label: "All", count: leads.length }, ...STATUS_OPTIONS.map((s) => ({ label: s, count: counts[s] ?? 0 }))].map(({ label, count }) => (
            <button
              key={label}
              onClick={() => setFilterStatus(label)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === label
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filterStatus === label ? "bg-accent/20" : "bg-secondary"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Search by name, email, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-accent focus:outline-none"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="All">All sources</option>
              {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-background overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-border px-5 py-3">
            <button
              onClick={() => toggleSort("name")}
              className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              Name <ArrowUpDown className="h-3 w-3" />
            </button>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <button
              onClick={() => toggleSort("created_at")}
              className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              Added <ArrowUpDown className="h-3 w-3" />
            </button>
            <span />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">No leads found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || filterStatus !== "All" || filterSource !== "All"
                  ? "Try adjusting your filters."
                  : "Add your first lead to get started."}
              </p>
              {!search && filterStatus === "All" && filterSource === "All" && (
                <button
                  onClick={() => { setEditingLead(null); setShowModal(true); }}
                  className="btn-primary mt-4 h-9 px-4 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add lead
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((lead) => (
                <div
                  key={lead.id}
                  className="grid grid-cols-[auto_1fr] sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors"
                >
                  {/* Name + avatar */}
                  <div className="flex items-center gap-3 col-span-1 sm:col-span-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                      {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                      {lead.notes && (
                        <p className="truncate text-xs text-muted-foreground">{lead.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="hidden sm:flex flex-col gap-0.5 min-w-0">
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent truncate">
                        <Mail className="h-3 w-3 shrink-0" /> {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent">
                        <Phone className="h-3 w-3 shrink-0" /> {lead.phone}
                      </a>
                    )}
                    {!lead.email && !lead.phone && (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </div>

                  {/* Source */}
                  <p className="hidden sm:block text-xs text-muted-foreground">{lead.source}</p>

                  {/* Status */}
                  <div className="hidden sm:block">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[lead.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {lead.status}
                    </span>
                  </div>

                  {/* Time */}
                  <p className="hidden sm:block text-xs text-muted-foreground">{timeAgo(lead.created_at)}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingLead(lead); setShowModal(true); }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Edit"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="mt-3 text-right text-xs text-muted-foreground">
            Showing {filtered.length} of {leads.length} leads
          </p>
        )}
      </main>

      {showModal && orgId && (
        <LeadModal
          lead={editingLead}
          organizationId={orgId}
          onClose={() => { setShowModal(false); setEditingLead(null); }}
          onSaved={() => orgId && fetchLeads(orgId)}
        />
      )}
    </>
  );
}