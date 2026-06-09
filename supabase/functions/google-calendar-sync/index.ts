// Google Calendar Sync Handler
// Handles: Bidirectional sync between Daloy appointments and Google Calendar
// Docs: https://developers.google.com/calendar/api/v3/reference

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Refresh Google Access Token ─────────────────────────────────────────
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: string;
} | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) return null;
  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

// ── Get Valid Access Token ──────────────────────────────────────────────
async function getValidToken(orgId: string, userId: string): Promise<string | null> {
  const { data: conn } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("status", "connected")
    .single();

  if (!conn) return null;

  // Check if token is expired
  const expiresAt = new Date(conn.token_expires_at).getTime();
  const now = Date.now();

  if (expiresAt > now + 60000) {
    // Token still valid (with 1 min buffer)
    return conn.access_token;
  }

  // Refresh the token
  if (!conn.refresh_token) return null;

  const refreshed = await refreshAccessToken(conn.refresh_token);
  if (!refreshed) {
    await supabase
      .from("google_calendar_connections")
      .update({ status: "expired" })
      .eq("organization_id", orgId)
      .eq("user_id", userId);
    return null;
  }

  // Update stored token
  await supabase
    .from("google_calendar_connections")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: refreshed.expires_at,
      status: "connected",
    })
    .eq("organization_id", orgId)
    .eq("user_id", userId);

  return refreshed.access_token;
}

// ── Create Google Calendar Event ───────────────────────────────────────
async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  appointment: any
): Promise<string | null> {
  const startDate = new Date(appointment.scheduled_at);
  const endDate = appointment.end_at ? new Date(appointment.end_at) : new Date(startDate.getTime() + 30 * 60000);

  const event = {
    summary: appointment.title,
    description: appointment.notes || "",
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "Asia/Manila",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "Asia/Manila",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "email", minutes: 60 },
      ],
    },
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const data = await res.json();
  if (data.error) {
    console.error("Google Calendar create error:", data.error);
    return null;
  }

  return data.id;
}

// ── Update Google Calendar Event ───────────────────────────────────────
async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  appointment: any
): Promise<boolean> {
  const startDate = new Date(appointment.scheduled_at);
  const endDate = appointment.end_at ? new Date(appointment.end_at) : new Date(startDate.getTime() + 30 * 60000);

  const event = {
    summary: appointment.title,
    description: appointment.notes || "",
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "Asia/Manila",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "Asia/Manila",
    },
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const data = await res.json();
  if (data.error) {
    console.error("Google Calendar update error:", data.error);
    return false;
  }

  return true;
}

// ── Delete Google Calendar Event ───────────────────────────────────────
async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return res.status === 204;
}

// ── Fetch Google Calendar Events (for pull sync) ──────────────────────
async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<any[]> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
    `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  if (data.error) {
    console.error("Google Calendar fetch error:", data.error);
    return [];
  }

  return data.items || [];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "push";

  // Get auth header to verify user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get user's org
  const { data: memberData } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!memberData) {
    return new Response(JSON.stringify({ error: "No organization found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orgId = memberData.organization_id;

  // ── Push: Create/Update appointment to Google Calendar ──────────────
  if (action === "push") {
    const body = await req.json();
    const { appointment_id } = body;

    if (!appointment_id) {
      return new Response(JSON.stringify({ error: "appointment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidToken(orgId, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected", code: "NOT_CONNECTED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get appointment
    const { data: appointment } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .eq("organization_id", orgId)
      .single();

    if (!appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get calendar connection for calendar_id
    const { data: conn } = await supabase
      .from("google_calendar_connections")
      .select("calendar_id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    const calendarId = conn?.calendar_id || "primary";

    // Check if event already exists
    const { data: existingEvent } = await supabase
      .from("google_calendar_events")
      .select("google_event_id")
      .eq("appointment_id", appointment_id)
      .single();

    let googleEventId: string | null = null;

    if (existingEvent) {
      // Update existing event
      const updated = await updateGoogleEvent(
        accessToken,
        calendarId,
        existingEvent.google_event_id,
        appointment
      );

      if (updated) {
        googleEventId = existingEvent.google_event_id;
        await supabase
          .from("google_calendar_events")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("appointment_id", appointment_id);
      }
    } else {
      // Create new event
      googleEventId = await createGoogleEvent(accessToken, calendarId, appointment);

      if (googleEventId) {
        await supabase.from("google_calendar_events").upsert(
          {
            appointment_id: appointment_id,
            google_event_id: googleEventId,
            calendar_id: calendarId,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "appointment_id" }
        );

        // Also update appointment with google_event_id
        await supabase
          .from("appointments")
          .update({ google_event_id: googleEventId })
          .eq("id", appointment_id);
      }
    }

    if (!googleEventId) {
      return new Response(JSON.stringify({ error: "Failed to sync with Google Calendar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, google_event_id: googleEventId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Delete: Remove event from Google Calendar ───────────────────────
  if (action === "delete") {
    const body = await req.json();
    const { appointment_id } = body;

    const accessToken = await getValidToken(orgId, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingEvent } = await supabase
      .from("google_calendar_events")
      .select("google_event_id, calendar_id")
      .eq("appointment_id", appointment_id)
      .single();

    if (existingEvent) {
      await deleteGoogleEvent(
        accessToken,
        existingEvent.calendar_id || "primary",
        existingEvent.google_event_id
      );

      await supabase
        .from("google_calendar_events")
        .delete()
        .eq("appointment_id", appointment_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Pull: Fetch events from Google Calendar into Daloy ──────────────
  if (action === "pull") {
    const accessToken = await getValidToken(orgId, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn } = await supabase
      .from("google_calendar_connections")
      .select("calendar_id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    const calendarId = conn?.calendar_id || "primary";

    // Fetch events for the next 30 days
    const now = new Date();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const events = await fetchGoogleEvents(
      accessToken,
      calendarId,
      now.toISOString(),
      timeMax.toISOString()
    );

    // Get existing mapped events
    const { data: existingMappings } = await supabase
      .from("google_calendar_events")
      .select("google_event_id, appointment_id");

    const mappedEventIds = new Set(
      (existingMappings || []).map((m: any) => m.google_event_id)
    );

    let imported = 0;

    for (const event of events) {
      if (mappedEventIds.has(event.id)) continue; // Already synced

      const startDate = event.start?.dateTime || event.start?.date;
      if (!startDate) continue;

      // Calculate end time
      const endDate = event.end?.dateTime || event.end?.date || null;

      // Create appointment in Daloy
      const { data: newAppt } = await supabase
        .from("appointments")
        .insert({
          organization_id: orgId,
          assigned_to: user.id,
          title: event.summary || "Google Calendar Event",
          notes: event.description || null,
          scheduled_at: startDate,
          end_at: endDate || new Date(new Date(startDate).getTime() + 30 * 60000).toISOString(),
          status: "scheduled",
          google_event_id: event.id,
        })
        .select("id")
        .single();

      if (newAppt) {
        await supabase.from("google_calendar_events").upsert(
          {
            appointment_id: newAppt.id,
            google_event_id: event.id,
            calendar_id: calendarId,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "appointment_id" }
        );
        imported++;
      }
    }

    return new Response(JSON.stringify({ success: true, imported }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Status: Check connection status ─────────────────────────────────
  if (action === "status") {
    const { data: conn } = await supabase
      .from("google_calendar_connections")
      .select("google_email, status, sync_enabled, connected_at, token_expires_at")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        connected: conn.status === "connected",
        email: conn.google_email,
        sync_enabled: conn.sync_enabled,
        connected_at: conn.connected_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Toggle: Enable/Disable sync ─────────────────────────────────────
  if (action === "toggle") {
    const body = await req.json();
    const { enabled } = body;

    await supabase
      .from("google_calendar_connections")
      .update({ sync_enabled: enabled })
      .eq("organization_id", orgId)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true, enabled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Disconnect ─────────────────────────────────────────────────────
  if (action === "disconnect") {
    await supabase
      .from("google_calendar_connections")
      .update({ status: "disconnected" })
      .eq("organization_id", orgId)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});