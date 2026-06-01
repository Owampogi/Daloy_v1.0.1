import { useEffect, useState } from "react";
import {
  Users,
  Inbox,
  CalendarCheck,
  Sparkles,
  TrendingUp,
  Lock,
  ChartPie,
  LayoutDashboard,
  Bell,
  Settings,
  ChevronRight,
  MessageSquare,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  LogOut,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { supabase } from "~/services/supabase-client";
import type { User } from "@supabase/supabase-js";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Plan = "starter" | "growth" | "business";

interface Lead {
  id: string;
  name: string;
  source: string;
  status: string;
  created_at: string;
}

interface DashboardMetrics {
  totalLeads: number;
  totalLeadsToday: number;
  openFollowUps: number;
  overdueFollowUps: number;
  appointmentsThisWeek: number;
  aiRepliesUsed: number;
  is_active: number;
  triggered_count: number;
  last_triggered_at: number;
  leads_converted: number;
  recentLeads: Lead[];
}

// ─── Plan config ───────────────────────────────────────────────────────────────
const PLAN_CONFIG = {
  starter: {
    label: "Starter",
    price: "₱1,499/mo",
    seats: { total: 1 },
    aiReplies: { limit: 500, label: "500/mo" },
    channels: { label: "2 channels" },
    analyticsLocked: true,
    automationsLocked: true,
    auditLogs: false,
  },
  growth: {
    label: "Growth",
    price: "₱4,999/mo",
    seats: { total: 5 },
    aiReplies: { limit: 5000, label: "5,000/mo" },
    channels: { label: "All channels" },
    analyticsLocked: false,
    automationsLocked: false,
    auditLogs: false,
  },
  business: {
    label: "Business",
    price: "Custom",
    seats: { total: null },
    aiReplies: { limit: null, label: "Unlimited" },
    channels: { label: "All channels" },
    analyticsLocked: false,
    automationsLocked: false,
    auditLogs: true,
  },
};

const statusStyles: Record<string, string> = {
  New: "bg-emerald-50 text-emerald-700",
  Qualified: "bg-blue-50 text-blue-700",
  "Follow-up": "bg-amber-50 text-amber-700",
  Cold: "bg-gray-100 text-gray-500",
};

const NAV = [
  { icon: LayoutDashboard, label: "Command Center", to: "/dashboard", active: true },
  { icon: Inbox, label: "Inbox", to: "/inbox", active: false },
  { icon: Users, label: "Leads", to: "/leads", active: false },
  { icon: ChartPie, label: "Pipeline", to: "/pipeline", active: false },
  { icon: CalendarCheck, label: "Appointments", to: "/appointments", active: false },
  { icon: TrendingUp, label: "Analytics", to: "/analytics", active: false, planLock: ["starter"] },
  { icon: Sparkles, label: "AI Assistant", to: "/assistant", active: false },
  { icon: Settings, label: "Settings", to: "/settings", active: false },
];

export function loader() {
  return {};
}

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeads: 0,
    totalLeadsToday: 0,
    openFollowUps: 0,
    overdueFollowUps: 0,
    appointmentsThisWeek: 0,
    aiRepliesUsed: 0,
    is_active: 0,
    triggered_count: 0,
    last_triggered_at: 0,
    leads_converted: 0,
    recentLeads: [],
  });

  const rawPlan = user?.user_metadata?.selected_plan;
  const plan: Plan = (["starter", "growth", "business"].includes(rawPlan) ? rawPlan : "starter") as Plan;
  const config = PLAN_CONFIG[plan];
  const isStarter = plan === "starter";
  const isBusiness = plan === "business";

  // ─── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // ─── Fetch org + metrics ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        // 1. Get user's organization
        const { data: memberData } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user!.id)
          .single();

        if (!memberData) return;
        const oid = memberData.organization_id;
        setOrgId(oid);

        // 2. Get seat count
        const { count: seats } = await supabase
          .from("organization_members")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", oid);
        setSeatCount(seats ?? 1);

        // 3. Get all leads metrics in parallel
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const [
          { count: totalLeads },
          { count: totalLeadsToday },
          { count: openFollowUps },
          { count: appointmentsThisWeek },
          { data: recentLeads },
          { data: aiUsage },
          { data: automationStats },
          { count: leadsConverted },
        ] = await Promise.all([
          // Total leads
          supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", oid),

          // Leads added today
          supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", oid)
            .gte("created_at", todayStart.toISOString()),

          // Open follow-ups
          supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", oid)
            .eq("status", "Follow-up"),

          // Appointments this week
          supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", oid)
            .gte("scheduled_at", weekStart.toISOString())
            .lt("scheduled_at", weekEnd.toISOString()),

          // Recent leads (last 5)
          supabase
            .from("leads")
            .select("id, name, source, status, created_at")
            .eq("organization_id", oid)
            .order("created_at", { ascending: false })
            .limit(5),

          // AI usage
          supabase
            .from("ai_usage")
            .select("count")
            .eq("organization_id", oid)
            .single(),

          // Automation stats
          supabase
            .from("automation_stats")
            .select("is_active, triggered_count, last_triggered_at")
            .eq("organization_id", oid)
            .single(),

          // Leads converted (e.g., leads with status 'Closed' or 'Converted')
          supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", oid)
            .in("status", ["Closed", "Converted", "Won"]),
        ]);

        setMetrics({
          totalLeads: totalLeads ?? 0,
          totalLeadsToday: totalLeadsToday ?? 0,
          openFollowUps: openFollowUps ?? 0,
          overdueFollowUps: 0, // extend later with due_date column
          appointmentsThisWeek: appointmentsThisWeek ?? 0,
          aiRepliesUsed: aiUsage?.count ?? 0,
          recentLeads: recentLeads ?? [],
          is_active: automationStats?.is_active ?? 0,
          triggered_count: automationStats?.triggered_count ?? 0,
          last_triggered_at: automationStats?.last_triggered_at ?? 0,
          leads_converted: leadsConverted ?? 0,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // ─── Display helpers ───────────────────────────────────────────────────────
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const aiProgress = config.aiReplies.limit
    ? Math.round((metrics.aiRepliesUsed / config.aiReplies.limit) * 100)
    : null;

  const dashboardMetrics = [
    {
      label: "Total Leads",
      value: metrics.totalLeads.toString(),
      delta: `+${metrics.totalLeadsToday} today`,
      up: true,
    },
    {
      label: "AI Replies Used",
      value: config.aiReplies.limit ? metrics.aiRepliesUsed.toLocaleString() : "∞",
      sub: `of ${config.aiReplies.label}`,
      progress: aiProgress,
    },
    {
      label: "Open Follow-ups",
      value: metrics.openFollowUps.toString(),
      delta: metrics.overdueFollowUps > 0 ? `${metrics.overdueFollowUps} overdue` : "All on track",
      up: metrics.overdueFollowUps === 0,
    },
    {
      label: "Appointments",
      value: metrics.appointmentsThisWeek.toString(),
      delta: "this week",
      up: true,
    },
  ];

  // ─── Relative time helper ──────────────────────────────────────────────────
  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary/40 font-sans text-foreground antialiased">

      {/* ── Sidebar ── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <span className="text-lg font-bold tracking-tight">DALOY</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const locked = item.planLock?.includes(plan) ?? false;
            return (
              <div
                key={item.label}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : locked
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {locked && <Lock className="h-3 w-3 shrink-0 opacity-50" />}
              </div>
            );
          })}
        </nav>

        {/* Plan badge */}
        <div className="m-3 rounded-xl border border-border bg-secondary/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {config.label} plan
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{config.price}</p>
            </div>
            {isStarter && (
              <Link
                to="/pricing"
                className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Upgrade
              </Link>
            )}
          </div>

          {/* Seats */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Seats</span>
              <span>{seatCount} / {config.seats.total ?? "∞"}</span>
            </div>
            {config.seats.total && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(seatCount / config.seats.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* AI replies */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>AI replies</span>
              <span>
                {config.aiReplies.limit
                  ? `${metrics.aiRepliesUsed} / ${config.aiReplies.limit.toLocaleString()}`
                  : "Unlimited"}
              </span>
            </div>
            {aiProgress !== null && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${aiProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Channels */}
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Channels</span>
            <span>{config.channels.label}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col">

        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-lg">
          <div>
            <p className="text-base font-semibold text-foreground">Command Center</p>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
            </button>
            <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-background pl-1 pr-3">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={displayName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </span>
              )}
              <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
              <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
                {config.label}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8">

          {/* Upgrade banner */}
          {isStarter && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                  You're on Starter — unlock Analytics, Automations & more channels with Growth.
                </p>
              </div>
              <Link
                to="/pricing"
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Upgrade →
              </Link>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {dashboardMetrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-border bg-background p-4"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{m.value}</p>
                {m.progress !== undefined && m.progress !== null ? (
                  <div className="mt-2">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${m.progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
                  </div>
                ) : m.progress === null && m.sub ? (
                  <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
                ) : (
                  <p className={`mt-1 text-xs font-medium ${m.up ? "text-emerald-600" : "text-amber-600"}`}>
                    {m.delta}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Recent Leads — now real data */}
            <div className="rounded-xl border border-border bg-background" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Recent leads</p>
                <Link to="/leads" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {metrics.recentLeads.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                    No leads yet. <Link to="/leads" className="text-accent hover:underline">Add your first lead →</Link>
                  </p>
                ) : (
                  metrics.recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                        {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.source} · {timeAgo(lead.created_at)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[lead.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {lead.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Analytics */}
            <div className="relative rounded-xl border border-border bg-background overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Analytics</p>
                {config.analyticsLocked && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    <Lock className="h-3 w-3" /> Growth only
                  </span>
                )}
              </div>
              <div className={`px-5 py-6 ${config.analyticsLocked ? "blur-sm pointer-events-none select-none" : ""}`}>
                <div className="flex items-end gap-2 h-28">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-accent/20" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </div>
              {config.analyticsLocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold text-foreground">Analytics is a Growth feature</p>
                  <p className="mt-1 text-xs text-muted-foreground">Upgrade to unlock real-time insights</p>
                  <Link to="/pricing" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
                    Upgrade to Growth <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Automations */}
          {config.automationsLocked ? (
            <div className="mt-6 relative rounded-xl border border-dashed border-border bg-background overflow-hidden px-5 py-6 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
              <Zap className="mx-auto h-6 w-6 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-semibold text-foreground">Smart Pipelines & Automations</p>
              <p className="mt-1 text-xs text-muted-foreground">Auto-follow-ups, triggers, and smart pipelines — Growth plan only.</p>
              <Link to="/pricing" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
                Unlock Automations <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-background px-5 py-4" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <p className="text-sm font-semibold text-foreground">Automations</p>
                </div>
                <Link to="/pipeline" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  Manage <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { label: "Active flows", value: metrics.is_active.toString() },
                  { label: "Triggered today", value: metrics.triggered_count.toString() },
                  { label: "Leads converted", value: metrics.leads_converted.toString() },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-secondary/60 px-3 py-2 text-center">
                    <p className="text-xl font-semibold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Logs (Business only) */}
          {isBusiness && (
            <div className="mt-6 rounded-xl border border-border bg-background px-5 py-4" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <p className="text-sm font-semibold text-foreground">Recent Audit Logs</p>
              </div>
              <div className="divide-y divide-border text-xs">
                {[
                  { action: "Lead assigned to Ana Reyes", time: "10 min ago", user: "Maria S." },
                  { action: "Pipeline stage updated: Qualified → Closed", time: "1h ago", user: "Jose M." },
                  { action: "AI reply sent to Juan dela Cruz", time: "2h ago", user: "System" },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-2 text-muted-foreground">
                    <span>{log.action}</span>
                    <span className="ml-4 shrink-0">{log.user} · {log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: MessageSquare, label: "New conversation", to: "/inbox" },
              { icon: Users, label: "Add lead", to: "/leads" },
              { icon: CalendarCheck, label: "Book appointment", to: "/appointments" },
              { icon: Sparkles, label: "Ask AI", to: "/assistant" },
            ].map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-accent/40"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <a.icon className="h-4 w-4 text-accent" />
                {a.label}
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;