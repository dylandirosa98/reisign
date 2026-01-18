-- Add HTML content column to state_templates for WYSIWYG editing

-- Add purchase_agreement_html column to store the HTML template content
ALTER TABLE public.state_templates
ADD COLUMN IF NOT EXISTS purchase_agreement_html TEXT;

-- Add assignment_contract_html column for future use
ALTER TABLE public.state_templates
ADD COLUMN IF NOT EXISTS assignment_contract_html TEXT;

-- Add a flag to track if template has been customized from general
-- This helps distinguish between "using general" vs "has custom edits"
ALTER TABLE public.state_templates
ADD COLUMN IF NOT EXISTS is_purchase_customized BOOLEAN DEFAULT false;

ALTER TABLE public.state_templates
ADD COLUMN IF NOT EXISTS is_assignment_customized BOOLEAN DEFAULT false;
