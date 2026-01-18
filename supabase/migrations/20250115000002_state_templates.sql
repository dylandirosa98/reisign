-- Add state-specific template support

-- Add columns to templates table for state-specific templates
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS use_general_template BOOLEAN DEFAULT true;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS documenso_assignment_template_id VARCHAR(255);
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS purchase_agreement_file_name VARCHAR(255);
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS assignment_contract_file_name VARCHAR(255);

-- Create a state_templates table for managing templates per state
CREATE TABLE IF NOT EXISTS public.state_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code VARCHAR(10) NOT NULL UNIQUE,
  state_name VARCHAR(100) NOT NULL,
  is_general BOOLEAN DEFAULT false,

  -- Template IDs from Documenso
  purchase_agreement_template_id VARCHAR(255),
  purchase_agreement_file_name VARCHAR(255),
  assignment_contract_template_id VARCHAR(255),
  assignment_contract_file_name VARCHAR(255),

  -- Whether to use the general template for this state
  use_general_template BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on state_code
CREATE INDEX IF NOT EXISTS idx_state_templates_state_code ON public.state_templates(state_code);

-- Enable RLS
ALTER TABLE public.state_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage state templates
CREATE POLICY "Admins can manage state templates" ON public.state_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy: All authenticated users can view state templates
CREATE POLICY "Authenticated users can view state templates" ON public.state_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert the general template row
INSERT INTO public.state_templates (state_code, state_name, is_general, use_general_template)
VALUES ('GENERAL', 'General (Default)', true, false)
ON CONFLICT (state_code) DO NOTHING;

-- Insert all 50 US states
INSERT INTO public.state_templates (state_code, state_name, use_general_template) VALUES
('AL', 'Alabama', true),
('AK', 'Alaska', true),
('AZ', 'Arizona', true),
('AR', 'Arkansas', true),
('CA', 'California', true),
('CO', 'Colorado', true),
('CT', 'Connecticut', true),
('DE', 'Delaware', true),
('FL', 'Florida', true),
('GA', 'Georgia', true),
('HI', 'Hawaii', true),
('ID', 'Idaho', true),
('IL', 'Illinois', true),
('IN', 'Indiana', true),
('IA', 'Iowa', true),
('KS', 'Kansas', true),
('KY', 'Kentucky', true),
('LA', 'Louisiana', true),
('ME', 'Maine', true),
('MD', 'Maryland', true),
('MA', 'Massachusetts', true),
('MI', 'Michigan', true),
('MN', 'Minnesota', true),
('MS', 'Mississippi', true),
('MO', 'Missouri', true),
('MT', 'Montana', true),
('NE', 'Nebraska', true),
('NV', 'Nevada', true),
('NH', 'New Hampshire', true),
('NJ', 'New Jersey', true),
('NM', 'New Mexico', true),
('NY', 'New York', true),
('NC', 'North Carolina', true),
('ND', 'North Dakota', true),
('OH', 'Ohio', true),
('OK', 'Oklahoma', true),
('OR', 'Oregon', true),
('PA', 'Pennsylvania', true),
('RI', 'Rhode Island', true),
('SC', 'South Carolina', true),
('SD', 'South Dakota', true),
('TN', 'Tennessee', true),
('TX', 'Texas', true),
('UT', 'Utah', true),
('VT', 'Vermont', true),
('VA', 'Virginia', true),
('WA', 'Washington', true),
('WV', 'West Virginia', true),
('WI', 'Wisconsin', true),
('WY', 'Wyoming', true)
ON CONFLICT (state_code) DO NOTHING;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_state_templates_updated_at ON public.state_templates;
CREATE TRIGGER update_state_templates_updated_at
  BEFORE UPDATE ON public.state_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
