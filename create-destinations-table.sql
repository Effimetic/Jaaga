-- Create Destinations Table for Scheduling System
-- This table stores reference destinations that can be used in schedule segments

-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url TEXT, -- Will be populated when app owner interface is completed
    latitude DECIMAL(10, 8), -- Optional geolocation
    longitude DECIMAL(11, 8), -- Optional geolocation
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on owner_id and name combination
ALTER TABLE destinations ADD CONSTRAINT unique_owner_destination_name UNIQUE (owner_id, name);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_destinations_owner_id ON destinations(owner_id);
CREATE INDEX IF NOT EXISTS idx_destinations_active ON destinations(is_active);

-- Insert some dummy destinations for testing
INSERT INTO destinations (owner_id, name, description, address, display_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Male City', 'Capital city of Maldives', 'Male, Maldives', 1),
    ('00000000-0000-0000-0000-000000000001', 'Hulhumale', 'Reclaimed island city', 'Hulhumale, Maldives', 2),
    ('00000000-0000-0000-0000-000000000001', 'Villingili', 'Residential island', 'Villingili, Maldives', 3),
    ('00000000-0000-0000-0000-000000000001', 'Maafushi', 'Tourist island', 'Maafushi, Maldives', 4),
    ('00000000-0000-0000-0000-000000000001', 'Gulhi', 'Local island', 'Gulhi, Maldives', 5);

-- Update the schedules table to use proper segment structure
-- First, let's create a better segments structure
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Create schedule_templates table for reusable schedule configurations
CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    route_stops JSONB NOT NULL, -- Array of RouteStop objects
    segments JSONB NOT NULL, -- Array of ScheduleSegment objects
    default_boat_id UUID REFERENCES boats(id),
    pricing_tier VARCHAR(100) DEFAULT 'STANDARD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on template name per owner
ALTER TABLE schedule_templates ADD CONSTRAINT unique_owner_template_name UNIQUE (owner_id, name);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schedule_templates_owner_id ON schedule_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active);

-- Insert a sample template
INSERT INTO schedule_templates (owner_id, name, description, route_stops, segments, pricing_tier) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Male to Maafushi', 'Daily ferry from Male to Maafushi', 
     '[{"id":"1","name":"Male City","order":1},{"id":"2","name":"Maafushi","order":2}]',
     '[{"from_stop_id":"1","to_stop_id":"2","departure_time":"08:00","arrival_time":"09:30"}]',
     'STANDARD');

-- Add comments for documentation
COMMENT ON TABLE destinations IS 'Reference destinations for schedule segments';
COMMENT ON TABLE schedule_templates IS 'Reusable schedule templates for creating schedules';
COMMENT ON COLUMN destinations.photo_url IS 'Photo URL - will be populated when app owner interface is completed';
COMMENT ON COLUMN destinations.latitude IS 'Optional latitude for geolocation';
COMMENT ON COLUMN destinations.longitude IS 'Optional longitude for geolocation';
COMMENT ON COLUMN schedule_templates.route_stops IS 'JSON array of RouteStop objects defining the route';
COMMENT ON COLUMN schedule_templates.segments IS 'JSON array of ScheduleSegment objects defining travel segments';
