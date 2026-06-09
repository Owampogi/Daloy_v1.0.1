-- ============================================================================
-- Google Calendar Integration
-- ============================================================================

-- Store Google Calendar OAuth tokens per organization
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'error', 'disconnected')),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Store Google Calendar event IDs mapped to appointment IDs
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id)
);

-- Add google_event_id column to appointments for quick lookup
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Indexes
CREATE INDEX idx_google_cal_conn_org ON google_calendar_connections(organization_id);
CREATE INDEX idx_google_cal_conn_user ON google_calendar_connections(user_id);
CREATE INDEX idx_google_cal_events_appt ON google_calendar_events(appointment_id);

-- RLS
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage google calendar connections"
  ON google_calendar_connections FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage google calendar events"
  ON google_calendar_events FOR ALL
  USING (appointment_id IN (
    SELECT id FROM appointments WHERE organization_id IN (SELECT get_user_org_ids())
  ));

-- Auto-update updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();