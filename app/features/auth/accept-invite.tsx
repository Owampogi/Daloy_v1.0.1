import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { supabase } from "~/services/supabase-client";
import { Loader2, CheckCircle, KeyRound, Eye, EyeOff, UserPlus } from "lucide-react";

export function loader() {
  return {};
}

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orgId = searchParams.get("org");
  const emailParam = searchParams.get("email") ?? "";

  const [step, setStep] = useState<"loading" | "form" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ── On mount: Supabase processes the invite token from the URL hash ────────
  useEffect(() => {
    async function handleInviteToken() {
      // Supabase automatically processes the #access_token from the URL
      // when the page loads — we just need to check the session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Try to get from hash (Supabase sets it in the URL hash after redirect)
        const hash = window.location.hash;
        if (hash.includes("access_token")) {
          // Give Supabase a moment to process the hash
          await new Promise((r) => setTimeout(r, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setStep("form");
            return;
          }
        }
        setErrorMsg("Invalid or expired invite link. Please ask your admin to send a new invitation.");
        setStep("error");
        return;
      }

      // Session exists — pre-fill name if available
      const meta = session.user.user_metadata;
      if (meta?.full_name) setFullName(meta.full_name);

      setStep("form");
    }

    handleInviteToken();
  }, []);

  // ── Submit: set password + full name, then join org ───────────────────────
  async function handleSubmit() {
    setFormError("");

    if (!fullName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      // 1. Update user's password and full name
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName.trim() },
      });

      if (updateError) throw updateError;

      // 2. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Could not get user session.");

      // 3. Upsert into profiles
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim(),
        email: user.email,
      });

      // 4. Add to organization_members if orgId present
      if (orgId) {
        const { error: memberError } = await supabase
          .from("organization_members")
          .upsert(
            {
              user_id: user.id,
              organization_id: orgId,
              role: "agent",
            },
            { onConflict: "user_id,organization_id" }
          );

        if (memberError) {
          console.error("Could not add to org:", memberError.message);
          // Non-fatal — admin can fix manually
        }

        // 5. Update invite status to accepted
        await supabase
          .from("invites")
          .update({ status: "accepted" })
          .eq("email", user.email)
          .eq("organization_id", orgId);
      }

      setStep("success");
      setTimeout(() => navigate("/dashboard"), 2000);

    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <UserPlus className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Invite link invalid</h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
          <Link
            to="/"
            className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">You're all set!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is ready. Redirecting you to the dashboard...
          </p>
          <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold tracking-tight text-foreground">
            DALOY
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Accept your invitation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up your account to join the team on Daloy.
            </p>
            {emailParam && (
              <p className="mt-1 text-sm font-medium text-foreground">{decodeURIComponent(emailParam)}</p>
            )}
          </div>

          {/* Full name */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan dela Cruz"
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Re-enter your password"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="mb-4 -mt-3">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= level * 3
                        ? password.length >= 12 ? "bg-green-500"
                          : password.length >= 8 ? "bg-amber-400"
                          : "bg-red-400"
                        : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {password.length < 8 ? "Too short" : password.length < 12 ? "Acceptable" : "Strong password"}
              </p>
            </div>
          )}

          {/* Error */}
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || !fullName.trim() || !password || !confirmPassword}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {saving ? "Setting up your account..." : "Accept & join team"}
          </button>

        </div>
      </div>
    </div>
  );
}