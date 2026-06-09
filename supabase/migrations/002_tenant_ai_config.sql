-- ============================================================================
-- TENANT AI CONFIGURATION
-- Per-tenant FAQ and SOP (AI instructions) for multi-tenant deployment
-- Run this AFTER the base schema (schema.sql)
-- ============================================================================

-- ============================================================================
-- TENANT AI CONFIG (per-organization AI personality, SOP, and system instructions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_ai_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- AI Personality
  communication_style TEXT DEFAULT 'friendly' CHECK (communication_style IN ('friendly', 'professional', 'enthusiastic', 'concise')),
  language_preference TEXT DEFAULT 'fil-english' CHECK (language_preference IN ('fil-english', 'filipino', 'english')),
  
  -- SOP / System Instructions (custom instructions that shape AI behavior)
  sop_instructions TEXT, -- Free-form SOP text the AI should follow
  
  -- AI Branding
  ai_name TEXT DEFAULT 'Daloy AI', -- Custom name for the AI assistant
  ai_avatar_url TEXT, -- Custom avatar
  
  -- Auto-reply settings
  auto_reply_enabled BOOLEAN DEFAULT true,
  auto_reply_greeting TEXT, -- Custom greeting message
  auto_reply_business_hours_only BOOLEAN DEFAULT false,
  fallback_message TEXT DEFAULT 'Thanks for reaching out! A team member will get back to you shortly.',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- ============================================================================
-- FAQ ENTRIES (dedicated FAQ table, separate from general business_context)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- e.g., 'pricing', 'shipping', 'returns', 'general'
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SOP ENTRIES (structured SOP items the AI should follow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_sop (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL, -- The actual SOP instruction for the AI
  category TEXT DEFAULT 'general', -- e.g., 'tone', 'escalation', 'pricing', 'objection_handling'
  priority INT DEFAULT 0, -- Higher = more important
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_tenant_ai_config_org ON tenant_ai_config(organization_id);
CREATE INDEX idx_tenant_faqs_org ON tenant_faqs(organization_id);
CREATE INDEX idx_tenant_faqs_active ON tenant_faqs(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_tenant_sop_org ON tenant_sop(organization_id);
CREATE INDEX idx_tenant_sop_active ON tenant_sop(organization_id, is_active) WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE tenant_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sop ENABLE ROW LEVEL SECURITY;

-- Tenant AI Config: org members can CRUD
CREATE POLICY "Org members can manage AI config"
  ON tenant_ai_config FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Tenant FAQs: org members can CRUD
CREATE POLICY "Org members can manage FAQs"
  ON tenant_faqs FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Tenant SOP: org members can CRUD
CREATE POLICY "Org members can manage SOP"
  ON tenant_sop FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_ai_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_sop
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- API FUNCTION: Get tenant AI context (for edge functions / webhooks)
-- Returns all active FAQ + SOP + config for a given organization
-- ============================================================================
CREATE OR REPLACE FUNCTION get_tenant_ai_context(p_org_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'config', (
      SELECT row_to_json(c)
      FROM tenant_ai_config c
      WHERE c.organization_id = p_org_id
      LIMIT 1
    ),
    'faqs', (
      SELECT coalesce(json_agg(row_to_json(f) ORDER BY f.display_order, f.created_at), '[]'::json)
      FROM tenant_faqs f
      WHERE f.organization_id = p_org_id AND f.is_active = true
    ),
    'sop', (
      SELECT coalesce(json_agg(row_to_json(s) ORDER BY s.priority DESC, s.created_at), '[]'::json)
      FROM tenant_sop s
      WHERE s.organization_id = p_org_id AND s.is_active = true
    ),
    'business_context', (
      SELECT coalesce(json_agg(row_to_json(b) ORDER BY b.created_at), '[]'::json)
      FROM business_context b
      WHERE b.organization_id = p_org_id AND b.is_active = true
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;