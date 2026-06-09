// TikTok OAuth Handler
// Handles: OAuth initiation and callback for TikTok Business/Creator accounts
// Docs: https://developers.tiktok.com/doc/oauth-user-access-token-management

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY")!;
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET")!;
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
  // Called from frontend: /functions/v1/tiktok-auth?action=init&org_id=xxx
  if (url.searchParams.get("action") === "init") {
    const orgId = url.searchParams.get("org_id");

    if (!orgId) {
      return new Response(JSON.stringify({ error: "org_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/tiktok-auth`;

    // TikTok uses a CSRF state parameter
    const csrfState = crypto.randomUUID();

    // Required scopes for business messaging
    const scopes = [
      "user.info.basic",
      "video.list",
      "comment.list",
      "comment.list.manage",
      "direct.message.manage",
      "direct.message.read",
    ].join(",");

    const authUrl =
      `https://www.tiktok.com/v2/auth/authorize/?` +
      `client_key=${TIKTOK_CLIENT_KEY}` +
      `&scope=${scopes}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(`${orgId}:${csrfState}`)}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Step 2: OAuth Callback ──────────────────────────────────────────
  // TikTok redirects here after user authorizes
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400, headers: corsHeaders });
  }

  const [orgId, csrfState] = state.split(":");

  try {
    const redirectUri = `${SUPABASE_URL}/functions/v1/tiktok-auth`;

    // Exchange authorization code for access token
    const tokenRes = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("TikTok token error:", tokenData.error);
      return Response.redirect(
        `${SITE_URL}/settings?tab=channels&error=tiktok_token_failed`,
        302
      );
    }

    const accessToken = tokenData.access_token;
    const openId = tokenData.open_id;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in; // seconds

    // Get user info from TikTok
    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const userData = await userRes.json();
    const displayName =
      userData?.data?.user?.display_name || "TikTok Account";
    const avatarUrl = userData?.data?.user?.avatar_url || null;

    // Store the TikTok connection
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await supabase.from("channel_connections").upsert(
      {
        organization_id: orgId,
        channel_type: "tiktok",
        channel_name: `${displayName} (TikTok)`,
        status: "connected",
        connected_at: new Date().toISOString(),
        config: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          open_id: openId,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      },
      { onConflict: "organization_id,channel_type,config->>open_id" }
    );

    return Response.redirect(
      `${SITE_URL}/settings?tab=channels&connected=tiktok`,
      302
    );
  } catch (err) {
    console.error("TikTok OAuth error:", err);
    return Response.redirect(
      `${SITE_URL}/settings?tab=channels&error=tiktok_oauth_failed`,
      302
    );
  }
});