// TikTok Webhook Handler
// Receives incoming messages, comments, and events from TikTok
// Docs: https://developers.tiktok.com/doc/webhook-overview

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Webhook Verification (GET) ──────────────────────────────────────
  // TikTok sends a GET request with a challenge to verify the endpoint
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge");
    if (challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response("OK", { status: 200 });
  }

  // ── Webhook Events (POST) ───────────────────────────────────────────
  if (req.method === "POST") {
    const rawBody = await req.text();

    // Verify TikTok webhook signature
    const signature = req.headers.get("x-tt-signature");
    if (signature && TIKTOK_CLIENT_SECRET) {
      try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(TIKTOK_CLIENT_SECRET),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
        const expectedSig = Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        if (expectedSig !== signature) {
          console.error("Invalid TikTok webhook signature");
          return new Response("Invalid signature", { status: 401 });
        }
      } catch (e) {
        console.error("Signature verification error:", e);
      }
    }

    const body = JSON.parse(rawBody);

    try {
      // TikTok webhook payload structure
      const event = body.event;
      const eventData = body.data || {};

      if (!event) {
        return new Response("No event", { status: 200 });
      }

      switch (event) {
        case "direct_message.receive_new":
          await handleDirectMessage(eventData);
          break;
        case "comment.receive_new":
          await handleComment(eventData);
          break;
        default:
          console.log(`Unhandled TikTok event: ${event}`);
      }
    } catch (err) {
      console.error("TikTok webhook processing error:", err);
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});

// ── Direct Message Handler ────────────────────────────────────────────

async function handleDirectMessage(data: any) {
  const senderOpenId = data.sender_open_id;
  const messageContent = data.text || "";
  const messageId = data.message_id;
  const createTime = data.create_time;

  if (!senderOpenId || !messageContent) {
    console.warn("Missing sender or message content in DM event");
    return;
  }

  // Find the TikTok connection for this sender
  // TikTok doesn't provide a clear "page/account" ID in DM webhooks,
  // so we find the connection by matching tokens
  const { data: connections } = await supabase
    .from("channel_connections")
    .select("*")
    .eq("channel_type", "tiktok")
    .eq("status", "connected");

  if (!connections || connections.length === 0) {
    console.warn("No TikTok connections found");
    return;
  }

  // Process for each organization that has a TikTok connection
  for (const connection of connections) {
    const orgId = connection.organization_id;
    const channelConversationId = `tt_dm_${senderOpenId}_${connection.config?.open_id || "default"}`;

    // Get sender profile (if available)
    let contactName = "TikTok User";

    try {
      const accessToken = connection.config?.access_token;
      if (accessToken) {
        const profileRes = await fetch(
          `https://open.tiktokapis.com/v2/user/info/?fields=display_name&open_id=${senderOpenId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const profileData = await profileRes.json();
        contactName = profileData?.data?.user?.display_name || "TikTok User";
      }
    } catch (e) {
      console.warn("Failed to fetch TikTok user profile:", e);
    }

    // Find or create conversation
    let conversation;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("channel", "tiktok")
      .eq("channel_conversation_id", channelConversationId)
      .single();

    if (existingConv) {
      conversation = existingConv;
    } else {
      // Find or create lead
      let leadId: string | null = null;

      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("organization_id", orgId)
        .eq("metadata->>sender_id", senderOpenId)
        .single();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            organization_id: orgId,
            name: contactName,
            source: "manual",
            status: "New",
            metadata: {
              sender_id: senderOpenId,
              channel: "tiktok",
            },
          })
          .select("id")
          .single();

        if (newLead) leadId = newLead.id;
      }

      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          organization_id: orgId,
          lead_id: leadId,
          channel: "tiktok",
          channel_conversation_id: channelConversationId,
          contact_name: contactName,
          contact_identifier: senderOpenId,
          status: "open",
          is_unread: true,
          unread_count: 1,
        })
        .select("*")
        .single();

      conversation = newConv;
    }

    if (!conversation) {
      console.error("Failed to create/find TikTok conversation");
      return;
    }

    // Check for duplicates
    if (messageId) {
      const { data: duplicateCheck } = await supabase
        .from("messages")
        .select("id")
        .eq("channel_message_id", messageId)
        .single();

      if (duplicateCheck) {
        console.log("Duplicate TikTok message, skipping:", messageId);
        return;
      }
    }

    // Insert the message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_type: "contact",
      content: messageContent,
      message_type: "text",
      channel_message_id: messageId || `tt_${Date.now()}`,
      metadata: {
        sender_open_id: senderOpenId,
        create_time: createTime,
        raw_event: data,
      },
    });

    console.log(`TikTok DM processed: Org: ${orgId} | Conversation: ${conversation.id}`);
  }
}

// ── Comment Handler ───────────────────────────────────────────────────

async function handleComment(data: any) {
  const videoId = data.video_id;
  const commentId = data.comment_id;
  const commentText = data.text || "";
  const commenterId = data.commenter_open_id;
  const createTime = data.create_time;

  if (!commenterId || !videoId) {
    console.warn("Missing commenter or video ID in comment event");
    return;
  }

  // Find connections for this video's creator
  const { data: connections } = await supabase
    .from("channel_connections")
    .select("*")
    .eq("channel_type", "tiktok")
    .eq("status", "connected");

  if (!connections || connections.length === 0) return;

  for (const connection of connections) {
    const orgId = connection.organization_id;
    const channelConversationId = `tt_comment_${commenterId}_${videoId}`;

    let contactName = "TikTok Commenter";

    // Find or create conversation
    let conversation;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("channel", "tiktok")
      .eq("channel_conversation_id", channelConversationId)
      .single();

    if (existingConv) {
      conversation = existingConv;
    } else {
      // Find or create lead
      let leadId: string | null = null;

      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("organization_id", orgId)
        .eq("metadata->>sender_id", commenterId)
        .single();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            organization_id: orgId,
            name: contactName,
            source: "manual",
            status: "New",
            metadata: {
              sender_id: commenterId,
              channel: "tiktok",
            },
          })
          .select("id")
          .single();

        if (newLead) leadId = newLead.id;
      }

      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          organization_id: orgId,
          lead_id: leadId,
          channel: "tiktok",
          channel_conversation_id: channelConversationId,
          contact_name: contactName,
          contact_identifier: commenterId,
          status: "open",
          is_unread: true,
          unread_count: 1,
          metadata: { video_id: videoId, type: "comment_thread" },
        })
        .select("*")
        .single();

      conversation = newConv;
    }

    if (!conversation) return;

    // Check for duplicates
    if (commentId) {
      const { data: dup } = await supabase
        .from("messages")
        .select("id")
        .eq("channel_message_id", commentId)
        .single();

      if (dup) return;
    }

    // Insert comment as a message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_type: "contact",
      content: `[Comment on video] ${commentText}`,
      message_type: "text",
      channel_message_id: commentId || `tt_comment_${Date.now()}`,
      metadata: {
        commenter_open_id: commenterId,
        video_id: videoId,
        create_time: createTime,
        raw_event: data,
      },
    });

    console.log(`TikTok comment processed: Org: ${orgId} | Video: ${videoId}`);
  }
}