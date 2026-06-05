import { useEffect, useRef, useState } from "react";
import {
  Bell, TrendingUp, Users, CalendarCheck,
  Sparkles, RefreshCw, ChevronDown,
} from "lucide-react";
import { useOutletContext } from "react-router";
import { supabase } from "~/services/supabase-client";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Filler, Tooltip, Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Filler, Tooltip, Legend
);

// ─── Types ─────────────────────────────────────────────────────────────────────
type Range = "7d" | "30d" | "90d" | "custom";

interface Metrics {
  totalLeads: number;
  totalLeadsPrev: number;
  conversionRate: number;
  conversionRatePrev: number;
  aiRepliesUsed: number;
  aiLimit: number;
  appointmentsBooked: number;
  appointmentsPrev: number;
  revenuePipeline: number;
  revenuePrev: number;
}

interface ChartData {
  labels: string[];
  leadsThis: number[];
  leadsPrev: number[];
  apptBooked: number[];
  apptCompleted: number[];
  aiDaily: number[];
  pipeline: { stage: string; value: number; pct: number }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtPeso(n: number) {
  if (n >= 1000000) return `₱${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₱${(n / 1000).toFixed(0)}k`;
  return `₱${n}`;
}

function fmtDelta(curr: number, prev: number, isCurrency = false) {
  if (prev === 0) return null;
  const diff = curr - prev;
  const pct = Math.round((diff / prev) * 100);
  const sign = diff >= 0 ? "↑ +" : "↓ ";
  const val = isCurrency ? fmtPeso(Math.abs(diff)) : `${Math.abs(pct)}%`;
  return { label: `${sign}${val} vs last period`, up: diff >= 0 };
}

function getDates(range: Range, from: string, to: string) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);
  if (range === "7d") start.setDate(start.getDate() - 7);
  else if (range === "30d") start.setDate(start.getDate() - 30);
  else if (range === "90d") start.setDate(start.getDate() - 90);
  else {
    start = from ? new Date(from) : new Date(now.setDate(now.getDate() - 30));
    return {
      start,
      end: to ? new Date(to + "T23:59:59") : end,
      days: Math.ceil((end.getTime() - start.getTime()) / 86400000),
    };
  }
  return { start, end, days: range === "7d" ? 7 : range === "30d" ? 30 : 90 };
}

function groupByDay(rows: { created_at: string }[], start: Date, days: number) {
  const counts = Array(days).fill(0);
  rows.forEach((r) => {
    const diff = Math.floor(
      (new Date(r.created_at).getTime() - start.getTime()) / 86400000
    );
    if (diff >= 0 && diff < days) counts[diff]++;
  });
  return counts;
}

function groupByWeek(daily: number[]) {
  const weeks: number[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    weeks.push(daily.slice(i, i + 7).reduce((a, b) => a + b, 0));
  }
  return weeks;
}

const PIPELINE_STAGES = ["New", "Qualified", "Follow-up", "Negotiation", "Won"];

const PLAN_AI_LIMITS: Record<string, number> = {
  starter: 500,
  growth: 5000,
  business: Infinity,
};

// ─── Chart options ─────────────────────────────────────────────────────────────
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { font: { size: 10 }, color: "#888780" },
      grid: { display: false },
    },
    y: {
      ticks: { font: { size: 10 }, color: "#888780" },
      grid: { color: "rgba(136,135,128,0.12)" },
    },
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user, displayName, initials, plan } = useOutletContext<any>();

  const [range, setRange] = useState<Range>("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    totalLeads: 0, totalLeadsPrev: 0,
    conversionRate: 0, conversionRatePrev: 0,
    aiRepliesUsed: 0, aiLimit: 5000,
    appointmentsBooked: 0, appointmentsPrev: 0,
    revenuePipeline: 0, revenuePrev: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    labels: [], leadsThis: [], leadsPrev: [],
    apptBooked: [], apptCompleted: [], aiDaily: [],
    pipeline: [],
  });

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
      setOrgId(memberData.organization_id);
    }
    init();
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    fetchAnalytics();
  }, [orgId, range, fromDate, toDate]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchAnalytics() {
    if (!orgId) return;
    setLoading(true);

    const { start, end, days } = getDates(range, fromDate, toDate);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);
    const prevEnd = new Date(start);

    const [
      { data: leadsThis },
      { data: leadsPrev },
      { data: wonThis },
      { data: wonPrev },
      { data: aiUsage },
      { data: apptThis },
      { data: apptPrev },
      { data: allLeads },
    ] = await Promise.all([
      supabase.from("leads").select("created_at").eq("organization_id", orgId)
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("leads").select("created_at").eq("organization_id", orgId)
        .gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString()),
      supabase.from("leads").select("id").eq("organization_id", orgId)
        .in("status", ["Won", "Converted", "Closed"])
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("leads").select("id").eq("organization_id", orgId)
        .in("status", ["Won", "Converted", "Closed"])
        .gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString()),
      supabase.from("ai_usage").select("count, date").eq("organization_id", orgId)
        .gte("date", start.toISOString()).lte("date", end.toISOString()),
      supabase.from("appointments").select("created_at, status").eq("organization_id", orgId)
        .gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString()),
      supabase.from("appointments").select("id").eq("organization_id", orgId)
        .gte("scheduled_at", prevStart.toISOString()).lte("scheduled_at", prevEnd.toISOString()),
      supabase.from("leads").select("status, deal_value").eq("organization_id", orgId),
    ]);

    // Metrics
    const totalLeads = leadsThis?.length ?? 0;
    const totalLeadsPrev = leadsPrev?.length ?? 0;
    const won = wonThis?.length ?? 0;
    const wonP = wonPrev?.length ?? 0;
    const convRate = totalLeads > 0 ? Math.round((won / totalLeads) * 100) : 0;
    const convPrev = totalLeadsPrev > 0 ? Math.round((wonP / totalLeadsPrev) * 100) : 0;
    const aiTotal = (aiUsage ?? []).reduce((s: number, r: any) => s + (r.count ?? 0), 0);
    const apptCount = apptThis?.length ?? 0;
    const apptPrevCount = apptPrev?.length ?? 0;

    // Pipeline value by stage
    const stageValues = PIPELINE_STAGES.map((stage) => {
      const total = (allLeads ?? [])
        .filter((l: any) => l.status === stage)
        .reduce((s: number, l: any) => s + (l.deal_value ?? 0), 0);
      return total;
    });
    const totalPipeline = stageValues.reduce((a, b) => a + b, 0);
    const pipeline = PIPELINE_STAGES.map((stage, i) => ({
      stage,
      value: stageValues[i],
      pct: totalPipeline > 0 ? Math.round((stageValues[i] / totalPipeline) * 100) : 0,
    }));

    setMetrics({
      totalLeads,
      totalLeadsPrev,
      conversionRate: convRate,
      conversionRatePrev: convPrev,
      aiRepliesUsed: aiTotal,
      aiLimit: PLAN_AI_LIMITS[plan] ?? 5000,
      appointmentsBooked: apptCount,
      appointmentsPrev: apptPrevCount,
      revenuePipeline: totalPipeline,
      revenuePrev: 0,
      pipeline,
    } as any);

    // Chart data
    const leadsDaily = groupByDay(leadsThis ?? [], start, days);
    const leadsPrevDaily = groupByDay(leadsPrev ?? [], prevStart, days);
    const apptBookedDaily = groupByDay(apptThis ?? [], start, days);
    const apptCompletedDaily = groupByDay(
      (apptThis ?? []).filter((a: any) => a.status === "completed"),
      start, days
    );

    // AI daily
    const aiMap: Record<string, number> = {};
    (aiUsage ?? []).forEach((r: any) => {
      const d = new Date(r.date).toDateString();
      aiMap[d] = (aiMap[d] ?? 0) + (r.count ?? 0);
    });
    const aiDaily = Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return aiMap[d.toDateString()] ?? 0;
    });

    // Use weeks if > 14 days
    const useWeeks = days > 14;
    const weekCount = Math.ceil(days / 7);
    const labels = useWeeks
      ? Array.from({ length: weekCount }, (_, i) => `W${i + 1}`)
      : Array.from({ length: days }, (_, i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });

    setChartData({
      labels,
      leadsThis: useWeeks ? groupByWeek(leadsDaily) : leadsDaily,
      leadsPrev: useWeeks ? groupByWeek(leadsPrevDaily) : leadsPrevDaily,
      apptBooked: useWeeks ? groupByWeek(apptBookedDaily) : apptBookedDaily,
      apptCompleted: useWeeks ? groupByWeek(apptCompletedDaily) : apptCompletedDaily,
      aiDaily: useWeeks ? groupByWeek(aiDaily) : aiDaily,
      pipeline,
    });

    setLoading(false);
  }

  // ── Stat cards ────────────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Total leads",
      value: metrics.totalLeads.toLocaleString(),
      delta: fmtDelta(metrics.totalLeads, metrics.totalLeadsPrev),
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Conversion rate",
      value: `${metrics.conversionRate}%`,
      delta: fmtDelta(metrics.conversionRate, metrics.conversionRatePrev),
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "AI replies used",
      value: metrics.aiRepliesUsed.toLocaleString(),
      sub: metrics.aiLimit === Infinity
        ? "Unlimited"
        : `of ${metrics.aiLimit.toLocaleString()}/mo`,
      icon: Sparkles,
      color: "text-purple-600",
      progress: metrics.aiLimit === Infinity
        ? null
        : Math.round((metrics.aiRepliesUsed / metrics.aiLimit) * 100),
    },
    {
      label: "Appointments",
      value: metrics.appointmentsBooked.toLocaleString(),
      delta: fmtDelta(metrics.appointmentsBooked, metrics.appointmentsPrev),
      icon: CalendarCheck,
      color: "text-teal-600",
    },
    {
      label: "Revenue pipeline",
      value: fmtPeso(metrics.revenuePipeline),
      delta: metrics.revenuePrev
        ? fmtDelta(metrics.revenuePipeline, metrics.revenuePrev, true)
        : null,
      icon: TrendingUp,
      color: "text-amber-600",
    },
  ];

  const STAGE_COLORS = [
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-amber-100 text-amber-800",
    "bg-orange-100 text-orange-800",
    "bg-green-100 text-green-800",
  ];
  const STAGE_BAR = ["#B5D4F4","#AFA9EC","#FAC775","#F0997B","#97C459"];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-xl">
        <div>
          <p className="text-base font-semibold text-foreground">Analytics</p>
          <p className="text-xs text-muted-foreground">Performance overview ng iyong business</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 h-8 px-3 text-xs border border-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
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

      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Date range toolbar */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["7d","30d","90d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 h-8 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setRange("custom"); }}
              className="h-8 rounded-lg border border-border bg-secondary px-3 text-xs text-foreground outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setRange("custom"); }}
              className="h-8 rounded-lg border border-border bg-secondary px-3 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
          )}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl bg-secondary/60 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
              <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              {card.progress !== undefined && card.progress !== null ? (
                <div className="mt-2">
                  <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${card.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
                </div>
              ) : card.delta ? (
                <p className={`text-xs mt-1 font-medium ${card.delta.up ? "text-green-700" : "text-red-600"}`}>
                  {card.delta.label}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1">{card.sub ?? ""}</p>
              )}
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-5">

          {/* Leads over time */}
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Leads over time</p>
            <p className="text-xs text-muted-foreground mb-3">This period vs last period</p>
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#185FA5]" />
                This period
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#B5D4F4]" />
                Last period
              </div>
            </div>
            <div style={{ position: "relative", height: 200 }}>
              <Bar
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      label: "This period",
                      data: chartData.leadsThis,
                      backgroundColor: "#185FA5",
                      borderRadius: 4,
                    },
                    {
                      label: "Last period",
                      data: chartData.leadsPrev,
                      backgroundColor: "#B5D4F4",
                      borderRadius: 4,
                    },
                  ],
                }}
                options={baseOptions as any}
              />
            </div>
          </div>

          {/* Appointments */}
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Appointments booked</p>
            <p className="text-xs text-muted-foreground mb-3">Booked vs completed</p>
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#1D9E75]" />
                Booked
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#97C459]" style={{ borderStyle: "dashed", borderWidth: 1 }} />
                Completed
              </div>
            </div>
            <div style={{ position: "relative", height: 200 }}>
              <Line
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      label: "Booked",
                      data: chartData.apptBooked,
                      borderColor: "#1D9E75",
                      backgroundColor: "rgba(29,158,117,0.1)",
                      tension: 0.4,
                      fill: true,
                      pointRadius: 3,
                    },
                    {
                      label: "Completed",
                      data: chartData.apptCompleted,
                      borderColor: "#639922",
                      backgroundColor: "transparent",
                      tension: 0.4,
                      borderDash: [4, 3],
                      pointRadius: 3,
                    },
                  ],
                }}
                options={baseOptions as any}
              />
            </div>
          </div>
        </div>

        {/* AI Replies chart */}
        <div className="rounded-xl border border-border bg-background p-5 mb-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-foreground">AI replies used</p>
            <span className="text-xs text-muted-foreground">
              {metrics.aiRepliesUsed.toLocaleString()} / {metrics.aiLimit === Infinity ? "∞" : metrics.aiLimit.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Daily usage over selected period</p>
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#7F77DD]" />
              AI replies
            </div>
          </div>
          <div style={{ position: "relative", height: 140 }}>
            <Line
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: "AI replies",
                    data: chartData.aiDaily,
                    borderColor: "#7F77DD",
                    backgroundColor: "rgba(127,119,221,0.12)",
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                  },
                ],
              }}
              options={{
                ...baseOptions,
                scales: {
                  ...baseOptions.scales,
                  x: {
                    ...baseOptions.scales.x,
                    ticks: {
                      ...baseOptions.scales.x.ticks,
                      maxTicksLimit: 10,
                    },
                  },
                },
              } as any}
            />
          </div>
        </div>

        {/* Revenue pipeline */}
        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-sm font-semibold text-foreground mb-1">Revenue pipeline by stage</p>
          <p className="text-xs text-muted-foreground mb-4">
            Total: {fmtPeso(metrics.revenuePipeline)}
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {chartData.pipeline.map((stage, i) => (
              <div key={stage.stage} className={`rounded-xl p-4 text-center ${STAGE_COLORS[i]}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1">
                  {stage.stage}
                </p>
                <p className="text-lg font-semibold">{fmtPeso(stage.value)}</p>
                <p className="text-[11px] opacity-60 mt-0.5">{stage.pct}%</p>
                <div className="mt-2 h-1 w-full rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-current opacity-40 transition-all"
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline bar */}
          {metrics.revenuePipeline > 0 && (
            <div className="mt-4">
              <div className="flex h-3 w-full rounded-full overflow-hidden gap-px">
                {chartData.pipeline.map((stage, i) => (
                  stage.pct > 0 && (
                    <div
                      key={stage.stage}
                      style={{ width: `${stage.pct}%`, background: STAGE_BAR[i] }}
                      title={`${stage.stage}: ${stage.pct}%`}
                    />
                  )
                ))}
              </div>
              <div className="flex gap-4 mt-2 flex-wrap">
                {chartData.pipeline.map((stage, i) => (
                  <div key={stage.stage} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-sm" style={{ background: STAGE_BAR[i] }} />
                    {stage.stage}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}