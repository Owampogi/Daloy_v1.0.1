import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { supabase } from "~/services/supabase-client";
import { Loader2, CheckCircle, Mail } from "lucide-react";

export function loader() {
  return {};
}

function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email passed from register page via navigation state
  const email = (location.state as any)?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    // Handle paste of full OTP
    if (value.length === 6) {
      const digits = value.slice(0, 6).split("");
      setOtp(digits);
      inputRefs.current[5]?.focus();
      return;
    }

    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const token = otp.join("");
    if (token.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  const handleResend = async () => {
    setResending(true);
    setError("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      setError(error.message);
    } else {
      setResendCooldown(60);
    }

    setResending(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto h-12 w-12 text-accent" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Email verified!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting you to your dashboard...
          </p>
          <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a 6-digit code to
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {email || "your email address"}
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`h-12 w-12 rounded-xl border text-center text-lg font-semibold text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  digit
                    ? "border-primary bg-primary/5"
                    : "border-border bg-secondary/40"
                }`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={loading || otp.join("").length !== 6}
            className="btn-primary w-full"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify & continue
          </button>

          {/* Resend */}
          <div className="mt-5 text-center">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              {resendCooldown > 0 ? (
                <span className="text-muted-foreground">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="font-medium text-accent hover:underline disabled:opacity-60"
                >
                  {resending ? "Sending..." : "Resend code"}
                </button>
              )}
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/register"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Use a different email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyOtpPage;
