-- Fix boats table to add missing columns for photos and description
-- This script adds the missing columns that AddBoatScreen expects

-- 1. Add missing columns to boats table
ALTER TABLE public.boats 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS primary_photo TEXT;

-- 2. Add comments for documentation
COMMENT ON COLUMN public.boats.description IS 'Boat description and details';
COMMENT ON COLUMN public.boats.photos IS 'Array of photo URLs stored in Supabase storage';
COMMENT ON COLUMN public.boats.primary_photo IS 'URL of the primary/main photo for the boat';

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boats_photos_gin ON public.boats USING GIN (photos);
CREATE INDEX IF NOT EXISTS idx_boats_primary_photo ON public.boats (primary_photo);

-- 4. Add constraint to ensure primary_photo is in photos array (if not null)
CREATE OR REPLACE FUNCTION validate_primary_photo()
RETURNS TRIGGER AS $$
BEGIN
    -- If primary_photo is set, it must be in the photos array
    IF NEW.primary_photo IS NOT NULL AND NOT (NEW.primary_photo = ANY(NEW.photos)) THEN
        RAISE EXCEPTION 'Primary photo must be included in photos array';
    END IF;
    
    -- If photos array is empty, primary_photo should be null
    IF array_length(NEW.photos, 1) IS NULL AND NEW.primary_photo IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot set primary photo when photos array is empty';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_primary_photo
    BEFORE INSERT OR UPDATE ON public.boats
    FOR EACH ROW
    EXECUTE FUNCTION validate_primary_photo();

-- 5. Add function to get photo count
CREATE OR REPLACE FUNCTION get_photo_count(photo_array TEXT[])
RETURNS INTEGER AS $$
BEGIN
    IF photo_array IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN array_length(photo_array, 1);
END;
$$ LANGUAGE plpgsql;

-- 6. Add function to check if boat has photos
CREATE OR REPLACE FUNCTION has_photos(photo_array TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN array_length(photo_array, 1) > 0;
END;
$$ LANGUAGE plpgsql;

-- 7. Grant permissions (uncomment and adjust as needed)
-- GRANT EXECUTE ON FUNCTION get_photo_count(TEXT[]) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION has_photos(TEXT[]) TO your_app_role;
