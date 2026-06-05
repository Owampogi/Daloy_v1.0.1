import {
  Users,
  CalendarCheck,
  Sparkles,
  Lock,
  Bell,
  ChevronRight,
  MessageSquare,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Link, useOutletContext } from "react-router";
import { useEffect, useState } from "react";
import { supabase } from "~/services/supabase-client";

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
  New: "bg-accent-soft text-accent",
  Qualified: "bg-accent/10 text-accent",
  "Follow-up": "bg-amber-50 text-amber-700",
  Cold: "bg-gray-100 text-gray-500",
};

export function loader() {
  return {};
}

export default function DashboardPage() {
  const { user, displayName, initials, plan } = useOutletContext<any>();

  const config = PLAN_CONFIG[plan as Plan] ?? PLAN_CONFIG.starter;
  const isStarter  = plan === "starter";
  const isBusiness = plan === "business";

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeads: 0, totalLeadsToday: 0, openFollowUps: 0,
    overdueFollowUps: 0, appointmentsThisWeek: 0, aiRepliesUsed: 0,
    is_active: 0, triggered_count: 0, last_triggered_at: 0,
    leads_converted: 0, recentLeads: [],
  });

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        const { data: memberData } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();
        if (!memberData) return;
        const oid = memberData.organization_id;

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
          { data: aiUsage },        // ← maybeSingle
          { data: automationStats }, // ← maybeSingle
          { count: leadsConverted },
        ] = await Promise.all([
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", oid),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", oid).gte("created_at", todayStart.toISOString()),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", oid).eq("status", "Follow-up"),
          supabase.from("appointments").select("*", { count: "exact", head: true }).eq("organization_id", oid).gte("scheduled_at", weekStart.toISOString()).lt("scheduled_at", weekEnd.toISOString()),
          supabase.from("leads").select("id, name, source, status, created_at").eq("organization_id", oid).order("created_at", { ascending: false }).limit(5),
          supabase.from("ai_usage").select("count").eq("organization_id", oid).maybeSingle(),
          supabase.from("automation_stats").select("is_active, triggered_count, last_triggered_at").eq("organization_id", oid).maybeSingle(),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", oid).in("status", ["Closed", "Converted", "Won"]),
        ]);

        setMetrics({
          totalLeads:           totalLeads ?? 0,
          totalLeadsToday:      totalLeadsToday ?? 0,
          openFollowUps:        openFollowUps ?? 0,
          overdueFollowUps:     0,
          appointmentsThisWeek: appointmentsThisWeek ?? 0,
          aiRepliesUsed:        aiUsage?.count ?? 0,
          recentLeads:          recentLeads ?? [],
          is_active:            automationStats?.is_active ?? 0,
          triggered_count:      automationStats?.triggered_count ?? 0,
          last_triggered_at:    automationStats?.last_triggered_at ?? 0,
          leads_converted:      leadsConverted ?? 0,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }
    fetchData();
  }, [user]);

  const aiProgress = config.aiReplies.limit
    ? Math.round((metrics.aiRepliesUsed / config.aiReplies.limit) * 100)
    : null;

  const dashboardMetrics = [
    { label: "Total Leads",     value: metrics.totalLeads.toString(),     delta: `+${metrics.totalLeadsToday} today`, up: true },
    { label: "AI Replies Used", value: config.aiReplies.limit ? metrics.aiRepliesUsed.toLocaleString() : "∞", sub: `of ${config.aiReplies.label}`, progress: aiProgress },
    { label: "Open Follow-ups", value: metrics.openFollowUps.toString(),  delta: metrics.overdueFollowUps > 0 ? `${metrics.overdueFollowUps} overdue` : "All on track", up: metrics.overdueFollowUps === 0 },
    { label: "Appointments",    value: metrics.appointmentsThisWeek.toString(), delta: "this week", up: true },
  ];

  function timeAgo(dateStr: string) {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days > 0)  return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  }

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-xl">
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
              <img src={user.user_metadata.avatar_url} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
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
        {isStarter && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#6DDFF5]/25 bg-[linear-gradient(135deg,#041633_0%,#0B2857_55%,#1F6FE5_100%)] px-5 py-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-[#6DDFF5]" />
              <p className="text-sm font-medium text-white/90">
                You're on Starter — unlock Analytics, Automations, and more channels with Growth.
              </p>
            </div>
            <Link to="/pricing" className="btn-secondary shrink-0 h-9 border-white/30 bg-white/10 px-3 text-xs text-white hover:bg-white/15">
              Upgrade
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {dashboardMetrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-background p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.label}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{m.value}</p>
              {m.progress !== undefined && m.progress !== null ? (
                <div className="mt-2">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${m.progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
                </div>
              ) : (
                <p className={`mt-1 text-xs font-medium ${m.up ? "text-accent" : "text-amber-600"}`}>{m.delta}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
                      <p className="text-xs text-muted-foreground">{lead.source} · {timeAgo(lead.created_at)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[lead.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {lead.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

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
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <span key={d}>{d}</span>)}
              </div>
            </div>
            {config.analyticsLocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                <Lock className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold text-foreground">Analytics is a Growth feature</p>
                <p className="mt-1 text-xs text-muted-foreground">Upgrade to unlock real-time insights</p>
                <Link to="/pricing" className="btn-primary mt-4 h-9 px-3 text-xs">
                  Upgrade to Growth <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {config.automationsLocked ? (
          <div className="mt-6 relative rounded-xl border border-dashed border-border bg-background overflow-hidden px-5 py-6 text-center">
            <Zap className="mx-auto h-6 w-6 text-accent/70" />
            <p className="mt-2 text-sm font-semibold text-foreground">Smart Pipelines & Automations</p>
            <p className="mt-1 text-xs text-muted-foreground">Auto-follow-ups, triggers, and smart pipelines — Growth plan only.</p>
            <Link to="/pricing" className="btn-primary mt-3 h-9 px-3 text-xs">
              Unlock Automations <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-background px-5 py-4">
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
                { label: "Active flows",    value: metrics.is_active.toString() },
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

        {isBusiness && (
          <div className="mt-6 rounded-xl border border-border bg-background px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-foreground">Recent Audit Logs</p>
            </div>
            <div className="divide-y divide-border text-xs">
              {[
                { action: "Lead assigned to Ana Reyes",                  time: "10 min ago", user: "Maria S." },
                { action: "Pipeline stage updated: Qualified → Closed",  time: "1h ago",     user: "Jose M." },
                { action: "AI reply sent to Juan dela Cruz",              time: "2h ago",     user: "System" },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-muted-foreground">
                  <span>{log.action}</span>
                  <span className="ml-4 shrink-0">{log.user} · {log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: MessageSquare, label: "New conversation",  to: "/inbox" },
            { icon: Users,         label: "Add lead",          to: "/leads" },
            { icon: CalendarCheck, label: "Book appointment",  to: "/appointments" },
            { icon: Sparkles,      label: "Ask AI",            to: "/assistant" },
          ].map((a) => (
            <Link key={a.label} to={a.to} className="btn-surface h-auto min-h-[3.25rem] items-center justify-start px-4 py-3 text-sm hover:-translate-y-0.5 hover:border-accent/40" style={{ boxShadow: "var(--shadow-sm)" }}>
              <a.icon className="h-4 w-4 text-accent" />
              {a.label}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}