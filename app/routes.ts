import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dashboard", "features/dashboard/dashboard-page.tsx"),
  route("login", "features/auth/login-page.tsx"),
  route("register", "features/auth/register-page.tsx"),
  route("forgot-password", "features/auth/forgot-password-page.tsx"),
  route("auth/callback", "features/auth/auth-callback-page.tsx"),
] satisfies RouteConfig;