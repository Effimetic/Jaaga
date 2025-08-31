-- Create destinations table (global table, no owner_id)
CREATE TABLE IF NOT EXISTS public.destinations (
  id uuid not null default extensions.uuid_generate_v4(),
  name character varying(255) not null,
  description text null,
  photo_url text null,
  latitude numeric(10, 8) null,
  longitude numeric(11, 8) null,
  address text null,
  is_active boolean not null default true,
  display_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint destinations_pkey primary key (id),
  constraint unique_destination_name unique (name)
);

-- Create index for active destinations
CREATE INDEX IF NOT EXISTS idx_destinations_active ON public.destinations USING btree (is_active);

-- Insert some dummy destinations for testing
INSERT INTO destinations (name, description, address, display_order) VALUES
  ('Male City', 'Capital city of Maldives', 'Male, Maldives', 1),
  ('Hulhumale', 'Reclaimed island city', 'Hulhumale, Maldives', 2),
  ('Villingili', 'Residential island', 'Villingili, Maldives', 3),
  ('Maafushi', 'Tourist island', 'Maafushi, Maldives', 4),
  ('Gulhi', 'Local island', 'Gulhi, Maldives', 5)
ON CONFLICT (name) DO NOTHING;

-- Update the schedules table to add template-related columns
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Create schedule_templates table
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  route_stops JSONB NOT NULL,
  segments JSONB NOT NULL,
  default_boat_id UUID REFERENCES boats(id),
  pricing_tier VARCHAR(100) DEFAULT 'STANDARD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints and indexes for schedule_templates
ALTER TABLE schedule_templates ADD CONSTRAINT unique_owner_template_name UNIQUE (owner_id, name);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_owner_id ON schedule_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active);

-- Insert a sample template (you'll need to update the owner_id to match an actual owner)
-- INSERT INTO schedule_templates (owner_id, name, description, route_stops, segments, pricing_tier) VALUES
--   ('YOUR_OWNER_ID_HERE', 'Male to Maafushi', 'Daily ferry from Male to Maafushi', 
--    '[{"id":"1","name":"Male City","order":1},{"id":"2","name":"Maafushi","order":2}]',
--    '[{"from_stop_id":"1","to_stop_id":"2","departure_time":"08:00","arrival_time":"09:30"}]',
--    'STANDARD');
