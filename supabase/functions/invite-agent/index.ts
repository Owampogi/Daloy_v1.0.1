import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Parse request body ───────────────────────────────────────────────
    const { email, organization_id } = await req.json();

    if (!email || !organization_id) {
      return new Response(
        JSON.stringify({ error: "email and organization_id are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Verify the caller is authenticated ───────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the caller's token to verify membership
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is an admin of the given organization
    const { data: membership, error: memberError } = await callerClient
      .from("organization_members")
      .select("role")
      .eq("user_id", caller.id)
      .eq("organization_id", organization_id)
      .single();

    if (memberError || !membership || membership.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can invite agents." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Use service role client to send the invite ───────────────────────
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const siteUrl = Deno.env.get("SITE_URL") ?? Deno.env.get("SUPABASE_URL")!;

    const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/accept-invite?org=${organization_id}&email=${encodeURIComponent(email)}`,
      data: {
        role: "agent",
        organization_id,
        invited_by: caller.id,
      },
    });

    if (inviteError) {
      console.error("Invite error:", inviteError.message);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Log the invite in the invites table ──────────────────────────────
    await adminClient.from("invites").upsert(
      {
        organization_id,
        email,
        invited_by: caller.id,
        status: "pending",
        created_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,email" }
    );

    return new Response(
      JSON.stringify({ success: true, user_id: data.user?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});