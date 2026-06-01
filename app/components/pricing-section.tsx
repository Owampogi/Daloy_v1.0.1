import { Check } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

const tiers = [
  {
    name: "Starter",
    price: "₱1,499",
    period: "/month",
    desc: "For solo founders and small teams getting started.",
    features: ["1 user seat", "Unified inbox (2 channels)", "AI replies — 500/mo", "Basic pipelines"],
    cta: "Start free",
    featured: false,
    plan: "starter",
  },
  {
    name: "Growth",
    price: "₱4,999",
    period: "/month",
    desc: "For growing SMEs ready to scale their lead flow.",
    features: ["5 user seats", "All channels", "AI replies — 5,000/mo", "Smart pipelines & automations", "Appointment booking", "Priority support"],
    cta: "Start free trial",
    featured: true,
    plan: "growth",
  },
  {
    name: "Business",
    price: "Custom",
    period: "",
    desc: "For established businesses with custom needs.",
    features: ["Unlimited seats", "Custom AI training", "Dedicated success manager", "API & integrations", "SLA & audit logs"],
    cta: "Talk to sales",
    featured: false,
    plan: "business",
  },
];

export function PricingSection() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelect = (plan: string, cta: string) => {
    if (cta === "Talk to sales") {
      window.location.href = "mailto:sales@daloy.app";
      return;
    }
    setSelectedPlan(plan);
    // Store selected plan then redirect to signup
    sessionStorage.setItem("selected_plan", plan);
    navigate("/login?mode=signup");
  };

  return (
    <section id="pricing" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Pricing</span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Plans that grow with you.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Transparent pricing in pesos. No surprises, no annual lock-in.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              onClick={() => setSelectedPlan(t.plan)}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all cursor-pointer ${
                selectedPlan === t.plan
                  ? "border-accent ring-2 ring-accent/30"
                  : t.featured
                  ? "border-accent/50 bg-card"
                  : "border-border bg-card hover:border-foreground/10"
              }`}
              style={
                t.featured && selectedPlan !== t.plan
                  ? { boxShadow: "var(--shadow-glow)" }
                  : { boxShadow: "var(--shadow-sm)" }
              }
            >
              {t.featured && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  Most popular
                </div>
              )}

              {/* Selected indicator */}
              {selectedPlan === t.plan && (
                <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}

              <h3 className="text-lg font-semibold text-foreground">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.period}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-foreground/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(t.plan, t.cta);
                }}
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-all ${
                  t.featured || selectedPlan === t.plan
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-border bg-secondary text-foreground hover:bg-muted"
                }`}
              >
                {t.cta}
              </button>
            </div>
          ))}
        </div>

        {selectedPlan && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            You selected{" "}
            <span className="font-semibold text-foreground capitalize">{selectedPlan}</span>
            {" "}— click the button above to continue.
          </p>
        )}
      </div>
    </section>
  );
}