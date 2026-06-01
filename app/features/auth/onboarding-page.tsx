import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "~/services/supabase-client";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "₱1,499",
    period: "/month",
    desc: "For solo founders and small teams getting started.",
    features: ["1 user seat", "Unified inbox (2 channels)", "AI replies — 500/mo", "Basic pipelines"],
    featured: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "₱4,999",
    period: "/month",
    desc: "For growing SMEs ready to scale their lead flow.",
    features: ["5 user seats", "All channels", "AI replies — 5,000/mo", "Smart pipelines & automations", "Appointment booking", "Priority support"],
    featured: true,
  },
  {
    id: "business",
    name: "Business",
    price: "Custom",
    period: "",
    desc: "For established businesses with custom needs.",
    features: ["Unlimited seats", "Custom AI training", "Dedicated success manager", "API & integrations", "SLA & audit logs"],
    featured: false,
  },
];

const planConfig: Record<string, { max_seats: number; ai_quota: number }> = {
  starter:  { max_seats: 1,    ai_quota: 500   },
  growth:   { max_seats: 5,    ai_quota: 5000  },
  business: { max_seats: 9999, ai_quota: 999999 },
};

export function loader() {
  return {};
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>("growth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (selectedPlan === "business") {
      window.location.href = "mailto:sales@daloy.app?subject=Business Plan Inquiry";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const config = planConfig[selectedPlan];

      // Update org plan
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!member) throw new Error("No organization found");

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          plan: selectedPlan,
          max_seats: config.max_seats,
          ai_quota: config.ai_quota,
          is_trial: true,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", member.organization_id);

      if (updateError) throw updateError;

      // Store selected plan
      sessionStorage.setItem("selected_plan", selectedPlan);

      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/40 font-sans antialiased">
      <div className="mx-auto max-w-5xl px-6 py-16">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Choose your plan
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start with a <span className="font-semibold text-accent">14-day free trial</span> — no credit card required.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative flex cursor-pointer flex-col rounded-2xl border p-8 transition-all ${
                selectedPlan === plan.id
                  ? "border-accent ring-2 ring-accent/30 bg-card"
                  : plan.featured
                  ? "border-accent/40 bg-card"
                  : "border-border bg-card hover:border-foreground/10"
              }`}
              style={
                plan.featured && selectedPlan !== plan.id
                  ? { boxShadow: "var(--shadow-glow)" }
                  : { boxShadow: "var(--shadow-sm)" }
              }
            >
              {plan.featured && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  Most popular
                </div>
              )}

              {selectedPlan === plan.id && (
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}

              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-foreground/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-6 text-center text-sm text-destructive">{error}</p>
        )}

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-10 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary-hover disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {selectedPlan === "business"
              ? "Talk to sales"
              : `Start 14-day free trial with ${plans.find(p => p.id === selectedPlan)?.name}`}
          </button>
          <p className="text-xs text-muted-foreground">
            No credit card required · Cancel anytime · 14-day free trial
          </p>
        </div>

      </div>
    </div>
  );
}

export default OnboardingPage;