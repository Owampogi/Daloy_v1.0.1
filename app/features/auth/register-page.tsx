import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "~/services/supabase-client";
import { Eye, EyeOff, Loader2, Check, ArrowLeft } from "lucide-react";

// ─── Plan definitions ────────────────────────────────────────────────────────

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "₱1,499",
    amount: "1",
    period: "/month",
    desc: "For solo founders and small teams.",
    features: [
      "1 user seat",
      "Unified inbox (2 channels)",
      "AI replies — 500/mo",
      "Basic pipelines",
    ],
    featured: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "₱4,999",
    amount: "2",
    period: "/month",
    desc: "For growing SMEs ready to scale.",
    features: [
      "5 user seats",
      "All channels",
      "AI replies — 5,000/mo",
      "Smart pipelines & automations",
      "Appointment booking",
      "Priority support",
    ],
    featured: true,
  },
  {
    id: "business",
    name: "Business",
    price: "Custom",
    amount: null,
    period: "",
    desc: "For established businesses.",
    features: [
      "Unlimited seats",
      "Custom AI training",
      "Dedicated success manager",
      "API & integrations",
      "SLA & audit logs",
    ],
    featured: false,
  },
];

// ─── InstaPay config ──────────────────────────────────────────────────────────

const INSTAPAY_NAME   = "Marc Adrian C.";
const INSTAPAY_NUMBER = "09465339112";
const INSTAPAY_QR     = "/qrcode.png"; // place the cropped QR in /public

// ─── Component ───────────────────────────────────────────────────────────────

function RegisterPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [fullName,     setFullName]     = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [selectedPlan, setSelectedPlan] = useState("growth");

  // Step 3
  const [refNumber,      setRefNumber]      = useState("");
  const [orderReference, setOrderReference] = useState<string>("");

  // UI
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState("");

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;

  // Generate order reference when entering Step 3
  useEffect(() => {
    if (step !== 3 || !currentPlan.amount) return;
    setOrderReference(`DLY-${Date.now().toString(36).toUpperCase()}`);
  }, [step, selectedPlan]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
  };

  const handleStep2 = () => {
    if (selectedPlan === "business") {
      window.location.href =
        "mailto:marcadriancuano@gmail.com?subject=Business Plan Inquiry";
      return;
    }
    setError("");
    setStep(3);
  };

  const handleRegister = async () => {
    if (!refNumber.trim()) {
      setError("Please enter your InstaPay reference number.");
      return;
    }

    setError("");
    setLoading(true);

    // 1. Record payment
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_email:        email,
        plan:              selectedPlan,
        amount:            currentPlan.amount,
        order_reference:   orderReference,
        gcash_ref_number:  refNumber,
        status:            "pending_verification",
        created_at:        new Date().toISOString(),
      })
      // .select()
      // .single();

    if (paymentError) {
      setError("Failed to record payment. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Create Supabase auth user
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:       fullName,
          selected_plan:   selectedPlan,
          payment_ref:     refNumber,
          payment_status:  "pending",
          order_reference: orderReference,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/verify-otp", {
      state: {
        email,
        plan: selectedPlan,
        orderReference,
        paymentPending: true,
      },
    });
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold tracking-tight text-foreground">
            DALOY
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your account and start for free.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-3">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  step > s
                    ? "bg-primary text-primary-foreground"
                    : step === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-border text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              {i < 2 && (
                <div className={`h-px w-12 ${step > s ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1 — Account Info ── */}
        {step === 1 && (
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            <h2 className="mb-6 text-lg font-semibold text-foreground">
              Your account details
            </h2>

            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="btn-surface w-full"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleStep1} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Maria Santos"
                  required
                  className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full">
                Next — Choose your plan
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* ── Step 2 — Plan Selection ── */}
        {step === 2 && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Choose your plan
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              All plans include a{" "}
              <span className="font-semibold text-accent">14-day free trial</span>.
              No credit card required.
            </p>

            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative cursor-pointer rounded-2xl border p-5 transition-all ${
                    selectedPlan === plan.id
                      ? "border-accent ring-2 ring-accent/30 bg-card"
                      : "border-border bg-card hover:border-foreground/10"
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {plan.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {plan.desc}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {plan.features.map((f) => (
                          <span
                            key={f}
                            className="flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <Check className="h-3 w-3 text-accent" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-lg font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                  </div>
                  {selectedPlan === plan.id && (
                    <div className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-accent">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button onClick={handleStep2} className="btn-primary mt-6 w-full">
              {selectedPlan === "business"
                ? "Talk to sales"
                : "Continue to payment →"}
            </button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              No credit card required · Cancel anytime
            </p>
          </div>
        )}

        {/* ── Step 3 — InstaPay Payment ── */}
        {step === 3 && currentPlan.amount && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <h2 className="mb-1 text-lg font-semibold text-foreground">
              Payment
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              I-scan ang QR code gamit ang iyong banking app o GCash.
            </p>

            {/* Order summary */}
            <div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {currentPlan.name} Plan
                </p>
                <p className="text-xs text-muted-foreground">{currentPlan.desc}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Order: {orderReference}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  ₱{Number(currentPlan.amount).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{currentPlan.period}</p>
              </div>
            </div>

            {/* InstaPay QR card */}
            <div className="mb-5 flex flex-col items-center rounded-2xl border border-border bg-card p-6">

              {/* InstaPay logo */}
              <div className="mb-3 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-[#E31837]">insta</span>
                  <span className="text-sm font-bold text-[#003087]">Pay</span>
                </div>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Any bank · GCash · Maya
                </span>
              </div>

              {/* Static QR image */}
              <img
                src={INSTAPAY_QR}
                alt="InstaPay QR Code"
                className="mb-3 h-48 w-48 rounded-xl border border-border object-contain"
              />

              <p className="text-sm font-semibold text-foreground">{INSTAPAY_NAME}</p>
              <p className="text-sm text-muted-foreground">{INSTAPAY_NUMBER}</p>
              <p className="mt-2 text-lg font-bold text-foreground">
                ₱{Number(currentPlan.amount).toLocaleString()}
              </p>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Ref: {orderReference}
              </p>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Transfer fees may apply.
              </p>
            </div>

            {/* Reference number input */}
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                InstaPay Reference Number
              </label>
              <input
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="e.g. 1234567890"
                className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Makikita ang reference number sa iyong transaction history pagkatapos ng transfer.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account & start free trial
            </button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Your account will be activated after payment verification · Cancel anytime
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegisterPage;