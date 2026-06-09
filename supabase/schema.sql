-- ============================================================================
-- DALOY CRM — Database Schema for Supabase
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'business')),
  max_seats INT NOT NULL DEFAULT 1,
  ai_quota INT NOT NULL DEFAULT 500,
  is_trial BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  business_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00", "timezone": "Asia/Manila"}',
  auto_reply_enabled BOOLEAN DEFAULT true,
  email TEXT,
  tiktok TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  business_name TEXT,
  business_type TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CHANNEL CONNECTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('messenger', 'instagram', 'whatsapp', 'email', 'sms', 'viber', 'telegram')),
  channel_name TEXT, -- Display name like "Main Facebook Page"
  config JSONB DEFAULT '{}', -- Channel-specific config (tokens, page IDs, etc.)
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEADS
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('messenger', 'instagram', 'whatsapp', 'email', 'sms', 'manual', 'import', 'website', 'referral')),
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Follow-up', 'Proposal', 'Won', 'Lost', 'Cold')),
  pipeline_stage TEXT DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  score INT DEFAULT 0, -- Lead score 0-100
  last_contacted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('messenger', 'instagram', 'whatsapp', 'email', 'sms', 'viber', 'telegram')),
  channel_conversation_id TEXT, -- External ID from the channel
  contact_name TEXT,
  contact_avatar TEXT,
  contact_identifier TEXT, -- Phone number, email, or social handle
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  assigned_to UUID REFERENCES auth.users(id),
  is_unread BOOLEAN DEFAULT true,
  unread_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'ai', 'system')),
  sender_id UUID, -- user_id if agent, null if contact
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'sticker', 'location')),
  channel_message_id TEXT, -- External message ID
  is_ai_generated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  meeting_link TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BUSINESS CONTEXT (for AI auto-replies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('faq', 'product', 'service', 'policy', 'general')),
  question TEXT,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI USAGE TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: 'YYYY-MM'
  count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, month)
);

-- ============================================================================
-- AUTOMATION RULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_lead', 'status_change', 'no_response', 'time_based', 'keyword')),
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL CHECK (action_type IN ('send_message', 'assign_agent', 'change_status', 'add_tag', 'create_appointment')),
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  triggered_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PIPELINE STAGES (customizable per organization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_status ON leads(organization_id, status);
CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_status ON conversations(organization_id, status);
CREATE INDEX idx_conversations_unread ON conversations(organization_id, is_unread) WHERE is_unread = true;
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at);
CREATE INDEX idx_appointments_org ON appointments(organization_id);
CREATE INDEX idx_appointments_date ON appointments(organization_id, scheduled_at);
CREATE INDEX idx_channel_connections_org ON channel_connections(organization_id);
CREATE INDEX idx_business_context_org ON business_context(organization_id);
CREATE INDEX idx_ai_usage_org_month ON ai_usage(organization_id, month);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: members can view, owners can update
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Organization members: members can view their org's members
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Profiles: users can view/edit their own
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Leads: org members can CRUD
CREATE POLICY "Org members can manage leads"
  ON leads FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Conversations: org members can CRUD
CREATE POLICY "Org members can manage conversations"
  ON conversations FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Messages: org members can view, system can insert
CREATE POLICY "Org members can view messages"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (SELECT get_user_org_ids())
  ));

CREATE POLICY "Org members can insert messages"
  ON messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (SELECT get_user_org_ids())
  ));

-- Appointments: org members can CRUD
CREATE POLICY "Org members can manage appointments"
  ON appointments FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Channel connections: org members can view
CREATE POLICY "Org members can manage channels"
  ON channel_connections FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Business context: org members can CRUD
CREATE POLICY "Org members can manage business context"
  ON business_context FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- AI usage: org members can view
CREATE POLICY "Org members can view AI usage"
  ON ai_usage FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Automation rules: org members can CRUD
CREATE POLICY "Org members can manage automations"
  ON automation_rules FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Pipeline stages: org members can CRUD
CREATE POLICY "Org members can manage pipeline stages"
  ON pipeline_stages FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channel_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON business_context
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  
  -- Create organization for the new user
  INSERT INTO organizations (name, plan, trial_ends_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business') || '''s Organization',
    COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'starter'),
    NOW() + INTERVAL '14 days'
  );
  
  -- Add user as owner of the organization
  INSERT INTO organization_members (organization_id, user_id, role)
  SELECT id, NEW.id, 'owner'
  FROM organizations
  WHERE name = COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business') || '''s Organization'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create default pipeline stages
  INSERT INTO pipeline_stages (organization_id, name, position, color, is_default)
  SELECT id, stage.name, stage.position, stage.color, stage.is_default
  FROM organizations,
  (VALUES
    ('New', 0, '#6366f1', true),
    ('Contacted', 1, '#3b82f6', false),
    ('Qualified', 2, '#f59e0b', false),
    ('Proposal', 3, '#8b5cf6', false),
    ('Won', 4, '#10b981', false),
    ('Lost', 5, '#ef4444', false)
  ) AS stage(name, position, color, is_default)
  WHERE organizations.name = COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business') || '''s Organization'
  ORDER BY organizations.created_at DESC
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update conversation's last_message fields when new message arrives
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    unread_count = CASE 
      WHEN NEW.sender_type = 'contact' THEN unread_count + 1
      ELSE unread_count
    END,
    is_unread = CASE 
      WHEN NEW.sender_type = 'contact' THEN true
      ELSE is_unread
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================================
-- SEED DATA: Insert demo data for testing
-- ============================================================================

-- Note: Run this after a user has signed up to attach demo data to their org
-- You'll need to replace 'YOUR_ORG_ID' with the actual organization ID