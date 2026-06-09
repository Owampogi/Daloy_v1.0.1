// Send Message Edge Function
// Routes agent replies back to the correct platform (Messenger, Instagram, TikTok)
// Called from the inbox when an agent sends a reply

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY")!;
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation_id, content } = await req.json();

    if (!conversation_id || !content) {
      return new Response(
        JSON.stringify({ error: "conversation_id and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the conversation with channel info
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the channel connection for this conversation
    const { data: connection, error: connError } = await supabase
      .from("channel_connections")
      .select("*")
      .eq("organization_id", conversation.organization_id)
      .eq("channel_type", conversation.channel)
      .eq("status", "connected")
      .limit(1)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Channel not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send the message via the appropriate platform API
    let sendResult: { success: boolean; error?: string; externalMessageId?: string };

    switch (conversation.channel) {
      case "messenger":
        sendResult = await sendMessengerMessage(
          connection,
          conversation.contact_identifier,
          content
        );
        break;
      case "instagram":
        sendResult = await sendInstagramMessage(
          connection,
          conversation.contact_identifier,
          content
        );
        break;
      case "tiktok":
        sendResult = await sendTikTokMessage(
          connection,
          conversation.contact_identifier,
          content
        );
        break;
      default:
        sendResult = { success: false, error: `Unsupported channel: ${conversation.channel}` };
    }

    if (!sendResult.success) {
      return new Response(
        JSON.stringify({ error: sendResult.error || "Failed to send message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the sent message in our database
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation_id,
        sender_type: "agent",
        sender_id: user.id,
        content: content,
        message_type: "text",
        channel_message_id: sendResult.externalMessageId || null,
      })
      .select("id")
      .single();

    if (msgError) {
      console.error("Failed to store message:", msgError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: message?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send message error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Platform-Specific Senders ─────────────────────────────────────────

async function sendMessengerMessage(
  connection: any,
  recipientId: string,
  text: string
): Promise<{ success: boolean; error?: string; externalMessageId?: string }> {
  try {
    const pageAccessToken = connection.config?.page_access_token;
    if (!pageAccessToken) {
      return { success: false, error: "No page access token" };
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          messaging_type: "RESPONSE",
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      console.error("Messenger send error:", data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, externalMessageId: data.message_id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendInstagramMessage(
  connection: any,
  recipientId: string,
  text: string
): Promise<{ success: boolean; error?: string; externalMessageId?: string }> {
  try {
    const pageAccessToken = connection.config?.page_access_token;
    const igAccountId = connection.config?.ig_account_id;

    if (!pageAccessToken || !igAccountId) {
      return { success: false, error: "Missing Instagram credentials" };
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          messaging_type: "RESPONSE",
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      console.error("Instagram send error:", data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, externalMessageId: data.message_id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendTikTokMessage(
  connection: any,
  recipientOpenId: string,
  text: string
): Promise<{ success: boolean; error?: string; externalMessageId?: string }> {
  try {
    let accessToken = connection.config?.access_token;
    const refreshToken = connection.config?.refresh_token;
    const expiresAt = connection.config?.expires_at;

    // Check if token is expired and refresh if needed
    if (expiresAt && new Date(expiresAt) < new Date()) {
      if (refreshToken) {
        const refreshed = await refreshTikTokToken(connection, refreshToken);
        if (refreshed) {
          accessToken = refreshed.access_token;
        } else {
          return { success: false, error: "TikTok token expired, please reconnect" };
        }
      } else {
        return { success: false, error: "TikTok token expired, please reconnect" };
      }
    }

    // TikTok Direct Message API
    const res = await fetch(
      "https://open.tiktokapis.com/v2/message/direct_message/send/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: [recipientOpenId],
          message_type: "text",
          content: text,
        }),
      }
    );

    const data = await res.json();

    if (data.error?.code !== "ok" && data.error) {
      console.error("TikTok send error:", data.error);
      return { success: false, error: data.error.message || "TikTok send failed" };
    }

    return {
      success: true,
      externalMessageId: data?.data?.message_id,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function refreshTikTokToken(
  connection: any,
  refreshToken: string
): Promise<{ access_token: string } | null> {
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json();

    if (data.access_token) {
      // Update the stored tokens
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      await supabase
        .from("channel_connections")
        .update({
          config: {
            ...connection.config,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: expiresAt,
          },
        })
        .eq("id", connection.id);

      return { access_token: data.access_token };
    }

    return null;
  } catch (err) {
    console.error("TikTok token refresh error:", err);
    return null;
  }
}