// Meta (Facebook/Instagram) OAuth Handler
// Handles: OAuth callback, page subscription, token exchange
// Docs: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_APP_ID = Deno.env.get("META_APP_ID")!;
const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
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
  // Called from frontend: /functions/v1/meta-auth?action=init&org_id=xxx&channel=messenger
  if (url.searchParams.get("action") === "init") {
    const orgId = url.searchParams.get("org_id");
    const channel = url.searchParams.get("channel") || "messenger";

    if (!orgId) {
      return new Response(JSON.stringify({ error: "org_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build scopes based on channel
    let scope = "pages_messaging,pages_manage_metadata,pages_show_list";
    if (channel === "instagram") {
      scope += ",instagram_basic,instagram_manage_messages";
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-auth`;
    const state = `${orgId}:${channel}`;

    const authUrl =
      `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Step 2: OAuth Callback ──────────────────────────────────────────
  // Facebook redirects here after user authorizes
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400, headers: corsHeaders });
  }

  const [orgId, channel] = state.split(":");

  try {
    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-auth`;

    // Exchange code for short-lived user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${META_APP_SECRET}` +
      `&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData.error);
      return Response.redirect(`${SITE_URL}/settings?tab=channels&error=token_exchange_failed`, 302);
    }

    const userAccessToken = tokenData.access_token;

    // Exchange short-lived token for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${userAccessToken}`
    );
    const longTokenData = await longTokenRes.json();
    const longLivedToken = longTokenData.access_token || userAccessToken;

    // Get user's Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longLivedToken}`
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return Response.redirect(
        `${SITE_URL}/settings?tab=channels&error=no_pages_found`,
        302
      );
    }

    // Connect each page as a channel connection
    for (const page of pagesData.data) {
      const pageAccessToken = page.access_token;
      const pageId = page.id;
      const pageName = page.name;

      // Subscribe the page to our webhook
      await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/subscribed_fields?` +
        `subscribed_fields=messages,messaging_postbacks,messaging_optins` +
        `&access_token=${pageAccessToken}`,
        { method: "POST" }
      );

      if (channel === "messenger") {
        // Store Messenger connection
        await supabase.from("channel_connections").upsert(
          {
            organization_id: orgId,
            channel_type: "messenger",
            channel_name: `${pageName} (Messenger)`,
            status: "connected",
            connected_at: new Date().toISOString(),
            config: {
              page_id: pageId,
              page_access_token: pageAccessToken,
              user_access_token: longLivedToken,
              page_name: pageName,
            },
          },
          { onConflict: "organization_id,channel_type,config->>page_id" }
        );
      }

      if (channel === "instagram" && page.instagram_business_account) {
        const igAccountId = page.instagram_business_account.id;

        // Get Instagram account details
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${igAccountId}?fields=username,name&access_token=${pageAccessToken}`
        );
        const igData = await igRes.json();

        await supabase.from("channel_connections").upsert(
          {
            organization_id: orgId,
            channel_type: "instagram",
            channel_name: `@${igData.username || pageName} (Instagram)`,
            status: "connected",
            connected_at: new Date().toISOString(),
            config: {
              ig_account_id: igAccountId,
              page_id: pageId,
              page_access_token: pageAccessToken,
              user_access_token: longLivedToken,
              username: igData.username,
            },
          },
          { onConflict: "organization_id,channel_type,config->>ig_account_id" }
        );
      }
    }

    return Response.redirect(
      `${SITE_URL}/settings?tab=channels&connected=${channel}`,
      302
    );
  } catch (err) {
    console.error("Meta OAuth error:", err);
    return Response.redirect(
      `${SITE_URL}/settings?tab=channels&error=oauth_failed`,
      302
    );
  }
});