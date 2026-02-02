-- Admin Templates: Platform-wide templates managed by system admins
-- Each admin template can have state-specific overrides

CREATE TABLE IF NOT EXISTS admin_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL DEFAULT '',
  signature_layout TEXT NOT NULL DEFAULT 'two-column',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- State-specific overrides for admin templates
CREATE TABLE IF NOT EXISTS admin_template_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_template_id UUID NOT NULL REFERENCES admin_templates(id) ON DELETE CASCADE,
  state_code VARCHAR(10) NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_template_id, state_code)
);

-- Indexes
CREATE INDEX idx_admin_templates_is_active ON admin_templates(is_active);
CREATE INDEX idx_admin_template_overrides_template_id ON admin_template_overrides(admin_template_id);
CREATE INDEX idx_admin_template_overrides_state_code ON admin_template_overrides(state_code);

-- RLS
ALTER TABLE admin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_template_overrides ENABLE ROW LEVEL SECURITY;

-- System admins can manage admin templates
CREATE POLICY "System admins can manage admin templates"
  ON admin_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_system_admin = true OR role = 'admin'))
  );

-- All authenticated users can read active admin templates
CREATE POLICY "Authenticated users can view active admin templates"
  ON admin_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- System admins can manage overrides
CREATE POLICY "System admins can manage admin template overrides"
  ON admin_template_overrides FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_system_admin = true OR role = 'admin'))
  );

-- All authenticated users can read overrides
CREATE POLICY "Authenticated users can view admin template overrides"
  ON admin_template_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Updated_at triggers
CREATE TRIGGER update_admin_templates_updated_at
  BEFORE UPDATE ON admin_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_admin_template_overrides_updated_at
  BEFORE UPDATE ON admin_template_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migrate existing general template data
INSERT INTO admin_templates (name, description, html_content, signature_layout)
SELECT
  'General Purchase Agreement',
  'Default purchase agreement template for all states',
  COALESCE(purchase_agreement_html, ''),
  'two-column'
FROM state_templates
WHERE state_code = 'GENERAL' AND purchase_agreement_html IS NOT NULL;

-- Migrate existing state overrides
INSERT INTO admin_template_overrides (admin_template_id, state_code, html_content)
SELECT
  (SELECT id FROM admin_templates LIMIT 1),
  st.state_code,
  st.purchase_agreement_html
FROM state_templates st
WHERE st.is_purchase_customized = TRUE
  AND st.state_code != 'GENERAL'
  AND st.purchase_agreement_html IS NOT NULL
  AND EXISTS (SELECT 1 FROM admin_templates);
