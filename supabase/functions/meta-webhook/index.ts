// Meta (Facebook/Instagram) Webhook Handler
// Receives incoming messages from Messenger and Instagram
// Docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify Meta webhook signature
function verifySignature(req: Request, body: string): boolean {
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const [algo, hash] = signature.split("=");
  const encoder = new TextEncoder();
  const keyData = encoder.encode(META_APP_SECRET);

  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(async (key) => {
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedHash = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return expectedHash === hash;
  }) as unknown as boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ── Webhook Verification (GET) ──────────────────────────────────────
  // Meta sends a GET request to verify the webhook endpoint
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN") || "daloy_webhook_token";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // ── Webhook Events (POST) ───────────────────────────────────────────
  if (req.method === "POST") {
    const rawBody = await req.text();

    // Verify signature (skip in dev if no secret set)
    if (META_APP_SECRET) {
      try {
        const valid = await verifySignature(req, rawBody);
        if (!valid) {
          console.error("Invalid webhook signature");
          return new Response("Invalid signature", { status: 401 });
        }
      } catch (e) {
        console.error("Signature verification error:", e);
      }
    }

    const body = JSON.parse(rawBody);

    if (body.object !== "page" && body.object !== "instagram") {
      return new Response("Not a page/instagram event", { status: 200 });
    }

    try {
      for (const entry of body.entry || []) {
        const pageId = entry.id;
        const isInstagram = body.object === "instagram";

        // Handle messaging events
        const messagingEvents = entry.messaging || [];
        for (const event of messagingEvents) {
          await handleMessageEvent(event, pageId, isInstagram);
        }
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});

// ── Message Event Handler ─────────────────────────────────────────────

async function handleMessageEvent(
  event: any,
  pageOrAccountId: string,
  isInstagram: boolean
) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;

  if (!senderId) return;

  // Skip echo messages (messages sent by the page itself)
  if (event.message?.is_echo) return;

  // Find the channel connection for this page/account
  const channelType = isInstagram ? "instagram" : "messenger";

  let connectionQuery = supabase
    .from("channel_connections")
    .select("*")
    .eq("channel_type", channelType)
    .eq("status", "connected");

  if (isInstagram) {
    connectionQuery = connectionQuery.eq("config->>ig_account_id", recipientId);
  } else {
    connectionQuery = connectionQuery.eq("config->>page_id", recipientId);
  }

  const { data: connection } = await connectionQuery.single();

  if (!connection) {
    console.warn(`No connection found for ${channelType} page ${recipientId}`);
    return;
  }

  const orgId = connection.organization_id;

  // Extract message content
  let content = "";
  let messageType = "text";

  if (event.message) {
    if (event.message.text) {
      content = event.message.text;
      messageType = "text";
    } else if (event.message.attachments) {
      // Handle attachments (images, files, etc.)
      const attachment = event.message.attachments[0];
      messageType = attachment.type === "image" ? "image" : "file";
      content = attachment.payload?.url || `[${attachment.type}]`;
    } else if (event.message.quick_reply) {
      content = event.message.quick_reply.payload || event.message.text || "";
    }
  } else if (event.postback) {
    content = event.postback.payload || event.postback.title || "";
  }

  if (!content) return;

  // Generate a consistent channel conversation ID
  const channelConversationId = isInstagram
    ? `ig_${senderId}_${recipientId}`
    : `msg_${senderId}_${recipientId}`;

  // Get sender profile info from Meta API
  let contactName = "Unknown";
  let contactAvatar = null;

  try {
    const accessToken = connection.config?.page_access_token;
    if (accessToken) {
      const profileUrl = isInstagram
        ? `https://graph.facebook.com/v19.0/${senderId}?fields=username,name&access_token=${accessToken}`
        : `https://graph.facebook.com/v19.0/${senderId}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`;

      const profileRes = await fetch(profileUrl);
      const profileData = await profileRes.json();

      if (isInstagram) {
        contactName = profileData.username || profileData.name || "Unknown";
      } else {
        contactName =
          `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "Unknown";
        contactAvatar = profileData.profile_pic || null;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch sender profile:", e);
  }

  // Find or create conversation
  let conversation;
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("channel", channelType)
    .eq("channel_conversation_id", channelConversationId)
    .single();

  if (existingConv) {
    conversation = existingConv;

    // Update contact name if it was unknown
    if (conversation.contact_name === "Unknown" && contactName !== "Unknown") {
      await supabase
        .from("conversations")
        .update({ contact_name: contactName, contact_avatar: contactAvatar })
        .eq("id", conversation.id);
    }
  } else {
    // Find or create lead
    let leadId: string | null = null;
    const contactIdentifier = senderId;

    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", orgId)
      .eq("metadata->>sender_id", senderId)
      .single();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          organization_id: orgId,
          name: contactName,
          source: channelType,
          status: "New",
          metadata: {
            sender_id: senderId,
            page_id: recipientId,
            channel: channelType,
          },
        })
        .select("id")
        .single();

      if (newLead) leadId = newLead.id;
    }

    // Create new conversation
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        organization_id: orgId,
        lead_id: leadId,
        channel: channelType,
        channel_conversation_id: channelConversationId,
        contact_name: contactName,
        contact_avatar: contactAvatar,
        contact_identifier: contactIdentifier,
        status: "open",
        is_unread: true,
        unread_count: 1,
      })
      .select("*")
      .single();

    conversation = newConv;
  }

  if (!conversation) {
    console.error("Failed to create/find conversation");
    return;
  }

  // Insert the message
  const channelMessageId = event.message?.mid || `postback_${Date.now()}`;

  // Check for duplicate messages
  const { data: duplicateCheck } = await supabase
    .from("messages")
    .select("id")
    .eq("channel_message_id", channelMessageId)
    .single();

  if (duplicateCheck) {
    console.log("Duplicate message, skipping:", channelMessageId);
    return;
  }

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_type: "contact",
    content: content,
    message_type: messageType,
    channel_message_id: channelMessageId,
    metadata: {
      sender_id: senderId,
      raw_event: event,
    },
  });

  console.log(
    `Message processed: ${channelType} | Org: ${orgId} | Conversation: ${conversation.id}`
  );
}