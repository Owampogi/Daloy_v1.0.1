import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Check, Copy, Loader2, ArrowLeft, Smartphone } from "lucide-react";
import { supabase } from "~/services/supabase-client";

// ─── Config ────────────────────────────────────────────────────────────────────
const PLAN_META: Record<string, { label: string; amount: number; color: string }> = {
  starter: { label: "Starter", amount: 1, color: "text-blue-600" },
  growth:  { label: "Growth",  amount: 2, color: "text-primary" },
};

// Replace these with your actual GCash/Maya numbers
const GCASH_NUMBER  = "0946-533-9112";  
const MAYA_NUMBER   = "0946-533-9112";  
const GCASH_NAME    = "Marc Adrian C.";
const MAYA_NAME     = "Marc Adrian C.";

type PaymentMethod = "gcash" | "maya";
type Step = "method" | "qr" | "confirm" | "done";

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const plan = params.get("plan") ?? "starter";
  const meta = PLAN_META[plan] ?? PLAN_META.starter;

  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const [refNumber, setRefNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // QR code URL using api.qrserver.com (free, no API key)
  const number = method === "gcash" ? GCASH_NUMBER : MAYA_NUMBER;
  const name   = method === "gcash" ? GCASH_NAME   : MAYA_NAME;
  const qrPayload = `${method === "gcash" ? "GCash" : "Maya"} Payment\nPay to: ${name}\nNumber: ${number}\nAmount: ₱${meta.amount}.00\nPlan: ${meta.label}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setOrgId(data?.organization_id ?? null));
  }, [user]);

  function copyNumber() {
    navigator.clipboard.writeText(number.replace(/-/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  async function submitPayment() {
    if (!refNumber.trim() || !orgId) return;
    setSaving(true);

    let screenshotUrl = null;

    if (screenshotFile) {
      setUploading(true);
      const ext = screenshotFile.name.split(".").pop();
      const path = `payment-screenshots/${orgId}/${Date.now()}.${ext}`;
      const { data: uploadData } = await supabase.storage
        .from("payments")
        .upload(path, screenshotFile, { upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("payments").getPublicUrl(path);
        screenshotUrl = urlData?.publicUrl ?? null;
      }
      setUploading(false);
    }

    // Save payment record
    await supabase.from("payments").insert({
      organization_id: orgId,
      plan,
      amount: meta.amount,
      payment_method: method,
      reference_number: refNumber.trim(),
      screenshot_url: screenshotUrl,
      status: "pending",
    });

    // Update org to trial + selected plan (admin will verify)
    await supabase
      .from("organizations")
      .update({ selected_plan: plan })
      .eq("id", orgId);

    // Update user metadata
    await supabase.auth.updateUser({
      data: { selected_plan: plan },
    });

    setSaving(false);
    setStep("done");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] font-sans flex flex-col">
      {/* Nav */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border">
        <Link to="/" className="text-lg font-bold tracking-tight">DALOY</Link>
        <Link to="/pricing" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to pricing
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Order summary */}
          <div className="rounded-2xl border border-border bg-background p-5 mb-5">
            <p className="text-xs text-muted-foreground mb-2">Order summary</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Daloy {meta.label} Plan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly subscription · 14-day free trial</p>
              </div>
              <p className="text-lg font-semibold text-foreground">₱{meta.amount}.00</p>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
              <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <p className="text-xs text-green-700">14-day free trial included · No credit card required to start</p>
            </div>
          </div>

          {/* Step: Choose method */}
          {step === "method" && (
            <div className="rounded-2xl border border-border bg-background p-6">
              <p className="text-sm font-semibold text-foreground mb-4">Choose payment method</p>
              <div className="space-y-3 mb-6">
                {(["gcash", "maya"] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3 transition-colors text-left ${
                      method === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl font-bold ${
                      m === "gcash" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                    }`}>
                      {m === "gcash" ? "G" : "M"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {m === "gcash" ? "GCash" : "Maya"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m === "gcash" ? "I-scan ang QR o mag-send sa number" : "I-scan ang QR o mag-send sa number"}
                      </p>
                    </div>
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      method === m ? "border-primary" : "border-border"
                    }`}>
                      {method === m && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep("qr")}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step: QR Code */}
          {step === "qr" && (
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => setStep("method")} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-foreground">
                  Pay via {method === "gcash" ? "GCash" : "Maya"}
                </p>
              </div>

              {/* QR */}
              <div className="flex flex-col items-center mb-5">
                <div className="rounded-xl border border-border p-4 bg-white mb-3">
                  <img
                    src={qrUrl}
                    alt={`${method === "gcash" ? "GCash" : "Maya"} QR code for ₱${meta.amount}`}
                    width={180}
                    height={180}
                    className="block"
                  />
                </div>
                <p className="text-xs text-muted-foreground">I-scan gamit ang {method === "gcash" ? "GCash" : "Maya"} app</p>
              </div>

              {/* Manual send */}
              <div className="rounded-xl bg-secondary/60 px-4 py-3 mb-5">
                <p className="text-xs text-muted-foreground mb-2">O mag-send manually:</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Number</p>
                    <p className="text-sm font-semibold text-foreground">{number}</p>
                  </div>
                  <button
                    onClick={copyNumber}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-background transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-sm font-semibold text-foreground">₱{meta.amount}.00</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep("confirm")}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90"
              >
                Naka-send na ako →
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && (
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => setStep("qr")} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-foreground">Confirm your payment</p>
              </div>

              <div className="space-y-4">
                {/* Reference number */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Reference / Transaction number *
                  </label>
                  <input
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Makikita sa {method === "gcash" ? "GCash" : "Maya"} receipt o transaction history mo
                  </p>
                </div>

                {/* Screenshot upload */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Screenshot ng payment (optional pero recommended)
                  </label>
                  {screenshotPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img src={screenshotPreview} alt="Payment screenshot" className="w-full object-cover max-h-48" />
                      <button
                        onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                        className="absolute top-2 right-2 h-7 w-7 bg-black/50 rounded-full flex items-center justify-center text-white text-xs hover:bg-black/70"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 cursor-pointer hover:bg-secondary/40 transition-colors">
                      <Smartphone className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center">
                        I-upload ang screenshot ng receipt<br />
                        <span className="text-primary">Browse files</span>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshot}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                onClick={submitPayment}
                disabled={saving || uploading || !refNumber.trim()}
                className="w-full mt-5 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? "Uploading..." : saving ? "Submitting..." : "Submit payment"}
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="rounded-2xl border border-border bg-background p-8 text-center">
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Payment submitted!</h2>
              <p className="text-sm text-muted-foreground mb-1">
                Salamat! Ive-verify namin ang iyong payment within 24 hours.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Habang hindi pa na-verify, magagamit mo pa rin ang Daloy via your 14-day free trial.
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90"
              >
                Go to dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}