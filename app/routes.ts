import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "features/auth/login-page.tsx"),
  route("register", "features/auth/register-page.tsx"),
  route("verify-otp", "features/auth/verify-otp-page.tsx"),
  route("forgot-password", "features/auth/forgot-password-page.tsx"),
  route("auth/callback", "features/auth/auth-callback-page.tsx"),
  route("pricing", "features/billing/pricing-page.tsx"),        // ← new
  route("checkout", "features/billing/checkout-page.tsx"),      // ← new

  layout("layouts/main-layout.tsx", [
    route("dashboard", "features/dashboard/dashboard-page.tsx"),
    route("inbox", "features/inbox/inbox-page.tsx"),
    route("leads", "features/leads/leads-page.tsx"),
    route("pipeline", "features/pipeline/pipeline-page.tsx"),
    route("appointments", "features/appointments/appointments-page.tsx"),
    route("analytics", "features/analytics/analytics-page.tsx"),
    route("assistant", "features/assistant/assistant-page.tsx"),
    route("settings", "features/settings/settings-page.tsx"),
  ]),
] satisfies RouteConfig;