-- Add field_config column to company_templates for dynamic form configuration
ALTER TABLE company_templates
ADD COLUMN IF NOT EXISTS field_config jsonb DEFAULT '{}'::jsonb;

-- Add a comment explaining the field_config structure
COMMENT ON COLUMN company_templates.field_config IS 'JSON configuration for form fields: { standardFields: { field_name: { visible: bool, required: bool } }, customFields: [...] }';
