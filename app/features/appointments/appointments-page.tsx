import { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Bell,
  CalendarCheck,
  Clock,
  User,
} from "lucide-react";
import { useOutletContext } from "react-router";
import { supabase } from "~/services/supabase-client";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ViewMode = "day" | "week" | "month";

interface Appointment {
  id: string;
  title: string;
  notes: string | null;
  scheduled_at: string;
  end_at: string;
  status: "scheduled" | "completed" | "cancelled";
  assigned_to: string | null;
  lead_id: string | null;
  lead?: { name: string } | null;
  agent?: { full_name: string; email: string } | null;
}

interface Agent {
  user_id: string;
  full_name: string;
  email: string;
}

interface NewAppt {
  title: string;
  notes: string;
  scheduled_at: string;
  end_at: string;
  assigned_to: string;
  lead_id: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_STYLES: Record<string, string> = {
  scheduled: "border-l-blue-500 bg-blue-50 text-blue-800",
  completed:  "border-l-green-500 bg-green-50 text-green-800",
  cancelled:  "border-l-red-400 bg-red-50 text-red-700",
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-PH", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function fmtDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-800","bg-pink-100 text-pink-800",
  "bg-green-100 text-green-800","bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800","bg-teal-100 text-teal-800",
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { user, displayName, initials } = useOutletContext<any>();

  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalAgent, setModalAgent] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewAppt>({
    title: "", notes: "", scheduled_at: "", end_at: "",
    assigned_to: "", lead_id: "",
  });

  // Detail popover
  const [detail, setDetail] = useState<Appointment | null>(null);

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

      // Fetch agents
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id, profiles:user_id(full_name, email)")
        .eq("organization_id", oid);

      const agentList: Agent[] = (members ?? []).map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name ?? m.profiles?.email ?? "Unknown",
        email: m.profiles?.email ?? "",
      }));
      setAgents(agentList);

      // Fetch leads
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, name")
        .eq("organization_id", oid)
        .order("name");
      setLeads(leadData ?? []);

      fetchAppointments(oid);
    }
    init();
  }, [user]);

  async function fetchAppointments(oid: string) {
    const { data } = await supabase
      .from("appointments")
      .select("*, lead:leads(name)")
      .eq("organization_id", oid)
      .order("scheduled_at");
    setAppointments(data ?? []);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  }

  function goToday() { setCurrentDate(new Date()); }

  // ── Open modal ────────────────────────────────────────────────────────────
  function openModal(date?: Date, agentId?: string) {
    const base = date ?? new Date();
    base.setSeconds(0, 0);
    const end = new Date(base);
    end.setHours(end.getHours() + 1);
    setForm({
      title: "", notes: "",
      scheduled_at: fmtDatetimeLocal(base),
      end_at: fmtDatetimeLocal(end),
      assigned_to: agentId ?? agents[0]?.user_id ?? "",
      lead_id: "",
    });
    setModalDate(base);
    setModalAgent(agentId ?? "");
    setShowModal(true);
  }

  async function saveAppointment() {
    if (!orgId || !form.title || !form.scheduled_at || !form.end_at) return;
    setSaving(true);
    await supabase.from("appointments").insert({
      organization_id: orgId,
      title: form.title,
      notes: form.notes || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
      assigned_to: form.assigned_to || null,
      lead_id: form.lead_id || null,
      status: "scheduled",
    });
    setSaving(false);
    setShowModal(false);
    fetchAppointments(orgId);
  }

  async function updateStatus(id: string, status: Appointment["status"]) {
    if (!orgId) return;
    await supabase.from("appointments").update({ status }).eq("id", id);
    setDetail(null);
    fetchAppointments(orgId);
  }

  async function deleteAppointment(id: string) {
    if (!orgId) return;
    await supabase.from("appointments").delete().eq("id", id);
    setDetail(null);
    fetchAppointments(orgId);
  }

  // ── Header label ──────────────────────────────────────────────────────────
  function headerLabel() {
    if (view === "day") {
      return currentDate.toLocaleDateString("en-PH", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    }
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return `${MONTHS[ws.getMonth()]} ${ws.getDate()} – ${we.getDate()}, ${we.getFullYear()}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }

  // ── Week days ─────────────────────────────────────────────────────────────
  function getWeekDays() {
    const ws = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws); d.setDate(d.getDate() + i); return d;
    });
  }

  // ── Month grid ────────────────────────────────────────────────────────────
  function getMonthDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days: (Date | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  function apptForDay(date: Date, agentId?: string) {
    return appointments.filter((a) => {
      const match = isSameDay(new Date(a.scheduled_at), date);
      if (agentId) return match && a.assigned_to === agentId;
      return match;
    });
  }

  // ── Appt card ─────────────────────────────────────────────────────────────
  function ApptCard({ appt }: { appt: Appointment }) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); setDetail(appt); }}
        className={`border-l-4 rounded-md px-2 py-1.5 cursor-pointer mb-1 text-xs ${STATUS_STYLES[appt.status]}`}
      >
        <p className="font-semibold truncate">{appt.title}</p>
        <p className="opacity-70">{fmtTime(appt.scheduled_at)} – {fmtTime(appt.end_at)}</p>
        {appt.lead?.name && <p className="opacity-60 truncate">{appt.lead.name}</p>}
      </div>
    );
  }

  // ── Views ──────────────────────────────────────────────────────────────────

  // DAY VIEW
  function DayView() {
    return (
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-36 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Agent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                {currentDate.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" })}
              </th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, i) => {
              const appts = apptForDay(currentDate, agent.user_id);
              return (
                <tr key={agent.user_id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {agent.full_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate max-w-[80px]">{agent.full_name}</span>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 align-top cursor-pointer min-h-[80px]"
                    onClick={() => openModal(new Date(currentDate), agent.user_id)}
                  >
                    {appts.length === 0 ? (
                      <span className="text-xs text-muted-foreground/40">+ Add</span>
                    ) : (
                      appts.map(a => <ApptCard key={a.id} appt={a} />)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // WEEK VIEW
  function WeekView() {
    const days = getWeekDays();
    const today = new Date();
    return (
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-36 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase sticky left-0 bg-secondary/50">Agent</th>
              {days.map((d) => (
                <th key={d.toISOString()} className={`px-2 py-3 text-center text-xs font-semibold min-w-[120px] ${isSameDay(d, today) ? "text-primary" : "text-muted-foreground"}`}>
                  <div className="uppercase">{DAYS[d.getDay()]}</div>
                  <div className={`mt-0.5 mx-auto h-7 w-7 flex items-center justify-center rounded-full text-sm font-bold ${isSameDay(d, today) ? "bg-primary text-primary-foreground" : ""}`}>
                    {d.getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, i) => (
              <tr key={agent.user_id} className="border-b border-border">
                <td className="px-4 py-3 align-top sticky left-0 bg-background border-r border-border">
                  <div className="flex items-center gap-2">
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {agent.full_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate max-w-[80px]">{agent.full_name}</span>
                  </div>
                </td>
                {days.map((day) => {
                  const appts = apptForDay(day, agent.user_id);
                  return (
                    <td
                      key={day.toISOString()}
                      className={`px-2 py-2 align-top cursor-pointer min-h-[80px] transition-colors hover:bg-secondary/40 ${isSameDay(day, today) ? "bg-primary/5" : ""}`}
                      onClick={() => openModal(new Date(day), agent.user_id)}
                    >
                      {appts.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground/30">+</span>
                      ) : (
                        appts.map(a => <ApptCard key={a.id} appt={a} />)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // MONTH VIEW
  function MonthView() {
    const days = getMonthDays();
    const today = new Date();
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground uppercase py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[100px]" />;
            const appts = apptForDay(day);
            const isToday = isSameDay(day, today);
            const isCurMonth = day.getMonth() === currentDate.getMonth();
            return (
              <div
                key={i}
                onClick={() => openModal(new Date(day))}
                className={`min-h-[100px] rounded-lg border p-2 cursor-pointer transition-colors hover:bg-secondary/40 ${
                  isToday ? "border-primary bg-primary/5" : "border-border"
                } ${!isCurMonth ? "opacity-40" : ""}`}
              >
                <p className={`text-xs font-semibold mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {day.getDate()}
                </p>
                {appts.slice(0, 3).map(a => (
                  <div
                    key={a.id}
                    onClick={(e) => { e.stopPropagation(); setDetail(a); }}
                    className={`border-l-2 rounded px-1 py-0.5 mb-0.5 text-[10px] truncate font-medium cursor-pointer ${STATUS_STYLES[a.status]}`}
                  >
                    {a.title}
                  </div>
                ))}
                {appts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">+{appts.length - 3} more</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-xl">
        <div>
          <p className="text-base font-semibold text-foreground">Appointments</p>
          <p className="text-xs text-muted-foreground">Manage your team's schedule</p>
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

      {/* Calendar toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => navigate(1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="px-3 h-8 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-colors">
            Today
          </button>
          <h2 className="ml-2 text-sm font-semibold text-foreground">{headerLabel()}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["day","week","month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 h-8 text-xs font-medium transition-colors capitalize ${
                  view === v ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 h-8 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> New Appointment
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ height: "calc(100vh - 130px)" }}>
        {view === "day" && <DayView />}
        {view === "week" && <WeekView />}
        {view === "month" && <MonthView />}
      </div>

      {/* ── Create Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">New Appointment</p>
              </div>
              <button onClick={() => setShowModal(false)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Discovery Call"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Start / End */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Start *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                    <Clock className="h-3 w-3" /> End *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Assign to */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <User className="h-3 w-3" /> Assign to
                </label>
                <select
                  value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                >
                  <option value="">Unassigned</option>
                  {agents.map(a => (
                    <option key={a.user_id} value={a.user_id}>{a.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Lead */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Lead (optional)</label>
                <select
                  value={form.lead_id}
                  onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                >
                  <option value="">No lead</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 h-9 text-sm rounded-lg border border-border hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={saveAppointment}
                disabled={saving || !form.title || !form.scheduled_at || !form.end_at}
                className="px-4 h-9 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? "Saving..." : "Save Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Popover ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <p className="text-sm font-semibold truncate">{detail.title}</p>
              <button onClick={() => setDetail(null)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{fmtTime(detail.scheduled_at)} – {fmtTime(detail.end_at)}</span>
              </div>
              {detail.lead?.name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>{detail.lead.name}</span>
                </div>
              )}
              {detail.notes && (
                <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2 mt-2">{detail.notes}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border-l-0 ${STATUS_STYLES[detail.status]}`}>
                  {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex flex-wrap gap-2">
              {detail.status !== "completed" && (
                <button onClick={() => updateStatus(detail.id, "completed")} className="flex-1 h-8 text-xs rounded-lg bg-green-600 text-white hover:opacity-90 transition-opacity">
                  Mark Complete
                </button>
              )}
              {detail.status !== "cancelled" && (
                <button onClick={() => updateStatus(detail.id, "cancelled")} className="flex-1 h-8 text-xs rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
              )}
              <button onClick={() => deleteAppointment(detail.id)} className="flex-1 h-8 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}