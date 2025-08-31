-- Update schedule_templates table to include ticket type configurations
-- This migration adds the missing field needed for complete template functionality

-- Add ticket type configurations column
ALTER TABLE schedule_templates 
ADD COLUMN IF NOT EXISTS ticket_type_configs JSONB DEFAULT '[]';

-- Add comments for documentation
COMMENT ON COLUMN schedule_templates.ticket_type_configs IS 'JSON array of ticket type configurations with price overrides';

-- Update existing templates to have empty arrays for new field
UPDATE schedule_templates 
SET ticket_type_configs = '[]'::jsonb
WHERE ticket_type_configs IS NULL;
