import { Check, Zap, Building2, Rocket } from "lucide-react";
import { Link, useNavigate } from "react-router";

const PLANS = [
  {
    key: "starter",
    label: "Starter",
    price: "₱1,499",
    amount: 1,
    period: "/mo",
    description: "Para sa solo entrepreneurs at bagong negosyo",
    icon: Rocket,
    color: "border-border",
    badge: null,
    features: [
      "1 seat",
      "500 AI replies/mo",
      "2 channels (FB + IG)",
      "Lead management",
      "Basic inbox",
      "Appointments",
      "14-day free trial",
    ],
  },
  {
    key: "growth",
    label: "Growth",
    price: "₱4,999",
    amount: 2,
    period: "/mo",
    description: "Para sa lumalaking SME na may team",
    icon: Zap,
    color: "border-primary",
    badge: "Most Popular",
    features: [
      "5 seats",
      "5,000 AI replies/mo",
      "All channels (FB, IG, TikTok, WA)",
      "Analytics dashboard",
      "Automations",
      "Pipeline management",
      "Priority support",
      "14-day free trial",
    ],
  },
  {
    key: "business",
    label: "Business",
    price: "Custom",
    amount: null,
    period: "",
    description: "Para sa malaking negosyo at agencies",
    icon: Building2,
    color: "border-border",
    badge: null,
    features: [
      "Unlimited seats",
      "Unlimited AI replies",
      "All channels",
      "Audit logs",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];

export default function PricingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] font-sans">
      {/* Nav */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border">
        <Link to="/" className="text-lg font-bold tracking-tight">DALOY</Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link to="/register" className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90">
            Get started
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center px-6 pt-16 pb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          All plans include a 14-day free trial · No credit card required
        </div>
        <h1 className="text-4xl font-semibold text-foreground mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Piliin ang plan na angkop sa inyong negosyo. I-upgrade o i-downgrade anytime.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border-2 bg-background p-7 flex flex-col ${plan.color}`}
              style={plan.badge ? { boxShadow: "0 0 0 1px rgba(24,95,165,0.15)" } : {}}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${plan.badge ? "bg-primary" : "bg-secondary"}`}>
                  <plan.icon className={`h-4 w-4 ${plan.badge ? "text-primary-foreground" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
                {plan.amount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Demo price: ₱{plan.amount}.00
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.key === "business" ? (
                <a
                  href="mailto:marcadriancuano@gmail.com"
                  className="w-full py-2.5 text-sm font-medium rounded-xl border border-border text-center text-foreground hover:bg-secondary transition-colors block"
                >
                  Contact sales
                </a>
              ) : (
                <button
                  onClick={() => navigate(`/checkout?plan=${plan.key}`)}
                  className={`w-full py-2.5 text-sm font-medium rounded-xl transition-opacity ${
                    plan.badge
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  Start free trial
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Trial note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          14-day free trial on all plans · Cancel anytime · Hindi kailangan ng credit card para magsimula
        </p>
      </div>
    </div>
  );
}