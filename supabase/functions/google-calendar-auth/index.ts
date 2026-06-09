// Google Calendar OAuth Handler
// Handles: OAuth initiation and callback for Google Calendar integration
// Docs: https://developers.google.com/calendar/api/guides/auth

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ── Step 1: Initiate OAuth ──────────────────────────────────────────
  // Called from frontend: /functions/v1/google-calendar-auth?action=init&org_id=xxx&user_id=xxx
  if (url.searchParams.get("action") === "init") {
    const orgId = url.searchParams.get("org_id");
    const userId = url.searchParams.get("user_id");

    if (!orgId || !userId) {
      return new Response(JSON.stringify({ error: "org_id and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth`;

    const csrfState = crypto.randomUUID();

    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" ");

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(`${orgId}:${userId}:${csrfState}`)}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Step 2: OAuth Callback ──────────────────────────────────────────
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400, headers: corsHeaders });
  }

  const [orgId, userId, csrfState] = state.split(":");

  try {
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth`;

    // Exchange authorization code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Google token error:", tokenData.error);
      return Response.redirect(
        `${SITE_URL}/appointments?error=google_token_failed`,
        302
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in; // seconds

    // Get user email from Google
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const userData = await userRes.json();
    const googleEmail = userData.email || "unknown@gmail.com";

    // Store the Google Calendar connection
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await supabase.from("google_calendar_connections").upsert(
      {
        organization_id: orgId,
        user_id: userId,
        google_email: googleEmail,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        calendar_id: "primary",
        sync_enabled: true,
        status: "connected",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id" }
    );

    // Also store as a channel connection for unified view
    await supabase.from("channel_connections").upsert(
      {
        organization_id: orgId,
        channel_type: "email", // closest type
        channel_name: `${googleEmail} (Google Calendar)`,
        status: "connected",
        connected_at: new Date().toISOString(),
        config: {
          google_calendar: true,
          google_email: googleEmail,
        },
      },
      { onConflict: "organization_id,channel_type,config->>google_email" }
    );

    return Response.redirect(
      `${SITE_URL}/appointments?connected=google_calendar`,
      302
    );
  } catch (err) {
    console.error("Google OAuth error:", err);
    return Response.redirect(
      `${SITE_URL}/appointments?error=google_oauth_failed`,
      302
    );
  }
});