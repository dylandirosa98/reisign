-- Company Templates: User-created contract templates
-- These are company-wide templates that team members can create and use

CREATE TABLE IF NOT EXISTS company_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Template basics
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Template content
  html_content TEXT NOT NULL,

  -- Signature page layout (from predefined layouts)
  signature_layout TEXT NOT NULL DEFAULT 'two-column',

  -- Custom placeholders defined by user
  -- Array of: { key: string, label: string, fieldType: 'text'|'number'|'date'|'email'|'phone'|'textarea', required: boolean }
  custom_fields JSONB DEFAULT '[]',

  -- Which standard placeholders are used (detected from html_content)
  -- This helps us know which form fields to show when creating a contract
  used_placeholders TEXT[] DEFAULT '{}',

  -- Is this a starter/example template?
  is_example BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_company_templates_company_id ON company_templates(company_id);
CREATE INDEX idx_company_templates_tags ON company_templates USING GIN(tags);
CREATE INDEX idx_company_templates_is_active ON company_templates(is_active);

-- RLS Policies
ALTER TABLE company_templates ENABLE ROW LEVEL SECURITY;

-- Users can view templates from their company
CREATE POLICY "Users can view company templates"
  ON company_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR is_example = TRUE
  );

-- Users can insert templates for their company
CREATE POLICY "Users can create company templates"
  ON company_templates FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update templates from their company
CREATE POLICY "Users can update company templates"
  ON company_templates FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete templates from their company
CREATE POLICY "Users can delete company templates"
  ON company_templates FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_company_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_company_templates_updated_at
  BEFORE UPDATE ON company_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_company_templates_updated_at();

-- Example templates are inserted by the application when a company first accesses templates
-- This allows them to be associated with a real company_id
