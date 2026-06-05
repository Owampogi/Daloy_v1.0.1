import {
  Users,
  Inbox,
  CalendarCheck,
  Sparkles,
  TrendingUp,
  Lock,
  ChartPie,
  LayoutDashboard,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import { Link, Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { supabase } from "~/services/supabase-client";
import type { User } from "@supabase/supabase-js";

type Plan = "starter" | "growth" | "business";

const PLAN_CONFIG = {
  starter: {
    label: "Starter",
    price: "₱1,499/mo",
    seats: { total: 1 },
    aiReplies: { limit: 500 },
    channels: { label: "2 channels" },
  },
  growth: {
    label: "Growth",
    price: "₱4,999/mo",
    seats: { total: 5 },
    aiReplies: { limit: 5000 },
    channels: { label: "All channels" },
  },
  business: {
    label: "Business",
    price: "Custom",
    seats: { total: null },
    aiReplies: { limit: null },
    channels: { label: "All channels" },
  },
};

const NAV = [
  { icon: LayoutDashboard, label: "Command Center", to: "/dashboard" },
  { icon: Inbox,           label: "Inbox",          to: "/inbox" },
  { icon: Users,           label: "Leads",          to: "/leads" },
  { icon: ChartPie,        label: "Pipeline",       to: "/pipeline" },
  { icon: CalendarCheck,   label: "Appointments",   to: "/appointments" },
  { icon: TrendingUp,      label: "Analytics",      to: "/analytics", planLock: ["starter"] },
  { icon: Sparkles,        label: "AI Assistant",   to: "/assistant" },
  { icon: Settings,        label: "Settings",       to: "/settings" },
];

export default function MainLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser]                       = useState<User | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [seatCount, setSeatCount]             = useState(1);
  const [aiRepliesUsed, setAiRepliesUsed]     = useState(0);
  const [trialEndsAt, setTrialEndsAt]         = useState<Date | null>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  const now         = new Date();
  const msLeft      = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : null;
  const hoursLeft   = msLeft !== null ? Math.ceil(msLeft / 3_600_000) : null;
  const daysLeft    = hoursLeft !== null ? Math.ceil(hoursLeft / 24) : null;
  const isExpired   = trialEndsAt ? now > trialEndsAt : false;
  const showWarning = !isExpired && daysLeft !== null && daysLeft <= 1;

  const rawPlan = user?.user_metadata?.selected_plan;
  const plan: Plan = (["starter","growth","business"].includes(rawPlan)
    ? rawPlan : "starter") as Plan;
  const config    = PLAN_CONFIG[plan];
  const isStarter = plan === "starter";

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let initialized = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      initialized = true;
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!initialized) return;
        if (!session) { navigate("/login"); }
        else { setUser(session.user); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // ── Sidebar + trial data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function fetchSidebarData() {
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();
      if (!memberData) return;

      const oid = memberData.organization_id;

      const { count: seats } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", oid);
      setSeatCount(seats ?? 1);

      // ← maybeSingle para hindi mag-error kung walang row
      const { data: aiUsage } = await supabase
        .from("ai_usage")
        .select("count")
        .eq("organization_id", oid)
        .maybeSingle();
      setAiRepliesUsed(aiUsage?.count ?? 0);

      const { data: org } = await supabase
        .from("organizations")
        .select("trial_ends_at, subscription_status")
        .eq("id", oid)
        .single();

      if (org) {
        const ends = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
        setTrialEndsAt(ends);
        if (ends && new Date() > ends) setShowExpiredModal(true);
      }
    }
    fetchSidebarData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

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
    ? Math.round((aiRepliesUsed / config.aiReplies.limit) * 100)
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] font-sans text-foreground antialiased">

      {/* ── Sidebar ── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background/95 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <span className="text-lg font-bold tracking-tight">DALOY</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const locked   = item.planLock?.includes(plan) ?? false;
            const isActive = location.pathname === item.to;
            return locked ? (
              <div
                key={item.label}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium cursor-not-allowed text-muted-foreground/50"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <Lock className="h-3 w-3 shrink-0 opacity-50" />
              </div>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Plan badge ── */}
        <div className="m-3 rounded-xl border border-border bg-secondary/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {config.label} plan
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{config.price}</p>
            </div>
            {isStarter && (
              <Link to="/pricing" className="btn-primary h-8 px-2.5 text-xs">
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
                  ? `${aiRepliesUsed} / ${config.aiReplies.limit.toLocaleString()}`
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

          {/* Trial countdown */}
          {trialEndsAt && !isExpired && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${
              showWarning ? "bg-amber-50 border border-amber-200" : "bg-secondary"
            }`}>
              <p className={`font-medium ${showWarning ? "text-amber-700" : "text-muted-foreground"}`}>
                {showWarning ? "⚠️ Trial expiring soon" : "🕐 Free trial"}
              </p>
              <p className={`mt-0.5 ${showWarning ? "text-amber-600" : "text-muted-foreground"}`}>
                {hoursLeft! <= 24
                  ? `${hoursLeft}h left`
                  : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
              </p>
              <p className={`mt-0.5 ${showWarning ? "text-amber-500" : "text-muted-foreground/70"}`}>
                Ends {trialEndsAt.toLocaleDateString("en-PH", {
                  month: "short", day: "numeric", year: "numeric",
                })} at {trialEndsAt.toLocaleTimeString("en-PH", {
                  hour: "numeric", minute: "2-digit", hour12: true,
                })}
              </p>
            </div>
          )}

          {/* Expired */}
          {isExpired && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs">
              <p className="font-medium text-red-700">Trial expired</p>
              <p className="text-red-500 mt-0.5">
                Expired {trialEndsAt?.toLocaleDateString("en-PH", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
              <Link to="/pricing" className="text-red-600 underline mt-1 block font-medium">
                Renew subscription →
              </Link>
            </div>
          )}

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

      {/* ── Page content ── */}
      <div className="flex flex-1 flex-col">
        {showWarning && (
          <div className="flex items-center justify-between gap-3 bg-amber-500 px-5 py-2.5 shrink-0">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>⚠️</span>
              <span className="font-medium">
                {hoursLeft! <= 24
                  ? `Trial expires in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}!`
                  : "Your trial expires tomorrow!"}
              </span>
              <span className="hidden sm:inline text-amber-100 text-xs">
                Mag-subscribe na para hindi maputol ang access.
              </span>
            </div>
            <Link
              to="/pricing"
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
            >
              Subscribe now
            </Link>
          </div>
        )}
        <Outlet context={{ user, displayName, initials, plan, config, trialEndsAt, daysLeft, isExpired }} />
      </div>

      {/* ── Expired modal ── */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-[linear-gradient(135deg,#041633_0%,#0B2857_55%,#1F6FE5_100%)] px-6 py-8 text-center">
              <div className="text-5xl mb-3">⏰</div>
              <h2 className="text-xl font-semibold text-white mb-1">Trial expired</h2>
              <p className="text-sm text-white/70">Nag-expire na ang iyong 2-day free trial.</p>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-muted-foreground text-center mb-5">
                I-renew ang iyong subscription para ma-access muli ang lahat ng features ng Daloy.
              </p>
              <div className="space-y-2">
                <Link
                  to="/pricing"
                  onClick={() => setShowExpiredModal(false)}
                  className="flex items-center justify-center w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                >
                  View plans & subscribe →
                </Link>
                <button
                  onClick={() => setShowExpiredModal(false)}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Continue with limited access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}