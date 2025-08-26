-- Update Seat Map Schema for Enhanced Seat Management
-- This script optimizes the database for the new seat structure with custom labels

-- 1. Add indexes for better performance on seat_map_json queries
CREATE INDEX IF NOT EXISTS idx_boats_seat_map_json_gin 
ON boats USING GIN (seat_map_json);

-- 2. Add index for seat_mode queries (if not already exists)
CREATE INDEX IF NOT EXISTS idx_boats_seat_mode 
ON boats (seat_mode);

-- 3. Add index for capacity queries (if not already exists)
CREATE INDEX IF NOT EXISTS idx_boats_capacity 
ON boats (capacity);

-- 4. Add index for owner_id queries (if not already exists)
CREATE INDEX IF NOT EXISTS idx_boats_owner_id 
ON boats (owner_id);

-- 5. Add index for status queries (if not already exists)
CREATE INDEX IF NOT EXISTS idx_boats_status 
ON boats (status);

-- 6. Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_boats_owner_status 
ON boats (owner_id, status);

-- 7. Add function to validate seat_map_json structure
CREATE OR REPLACE FUNCTION validate_seat_map_json(seat_map_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if seat_map_data is null (valid for CAPACITY mode)
    IF seat_map_data IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check required fields
    IF NOT (seat_map_data ? 'rows' AND seat_map_data ? 'columns' AND seat_map_data ? 'seats') THEN
        RETURN FALSE;
    END IF;
    
    -- Check if rows and columns are positive integers
    IF NOT (seat_map_data->>'rows' ~ '^[1-9][0-9]*$' AND seat_map_data->>'columns' ~ '^[1-9][0-9]*$') THEN
        RETURN FALSE;
    END IF;
    
    -- Check if seats is an array
    IF NOT jsonb_typeof(seat_map_data->'seats') = 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- Validate each seat in the seats array
    FOR i IN 0..jsonb_array_length(seat_map_data->'seats') - 1 LOOP
        DECLARE
            seat JSONB := seat_map_data->'seats'->i;
        BEGIN
            -- Check required seat fields
            IF NOT (seat ? 'id' AND seat ? 'row' AND seat ? 'column' AND seat ? 'type' AND seat ? 'available') THEN
                RETURN FALSE;
            END IF;
            
            -- Check seat type is valid
            IF NOT (seat->>'type' IN ('seat', 'walkway', 'disabled')) THEN
                RETURN FALSE;
            END IF;
            
            -- Check available is boolean
            IF NOT jsonb_typeof(seat->'available') = 'boolean' THEN
                RETURN FALSE;
            END IF;
        END;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Add constraint to validate seat_map_json structure
ALTER TABLE boats 
ADD CONSTRAINT check_seat_map_json_valid 
CHECK (validate_seat_map_json(seat_map_json));

-- 9. Add function to get seat count from seat_map_json
CREATE OR REPLACE FUNCTION get_seat_count_from_map(seat_map_data JSONB)
RETURNS INTEGER AS $$
BEGIN
    IF seat_map_data IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN (
        SELECT COUNT(*)
        FROM jsonb_array_elements(seat_map_data->'seats') AS seat
        WHERE seat->>'type' = 'seat'
    );
END;
$$ LANGUAGE plpgsql;

-- 10. Add function to get walkway count from seat_map_json
CREATE OR REPLACE FUNCTION get_walkway_count_from_map(seat_map_data JSONB)
RETURNS INTEGER AS $$
BEGIN
    IF seat_map_data IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN (
        SELECT COUNT(*)
        FROM jsonb_array_elements(seat_map_data->'seats') AS seat
        WHERE seat->>'type' = 'walkway'
    );
END;
$$ LANGUAGE plpgsql;

-- 11. Add function to get disabled seat count from seat_map_json
CREATE OR REPLACE FUNCTION get_disabled_seat_count_from_map(seat_map_data JSONB)
RETURNS INTEGER AS $$
BEGIN
    IF seat_map_data IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN (
        SELECT COUNT(*)
        FROM jsonb_array_elements(seat_map_data->'seats') AS seat
        WHERE seat->>'type' = 'disabled'
    );
END;
$$ LANGUAGE plpgsql;

-- 12. Add function to find seats by custom label
CREATE OR REPLACE FUNCTION find_seats_by_label(seat_map_data JSONB, search_label TEXT)
RETURNS TABLE(seat_id TEXT, row_num INTEGER, column_num INTEGER, seat_type TEXT, label TEXT) AS $$
BEGIN
    IF seat_map_data IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        seat->>'id' as seat_id,
        (seat->>'row')::INTEGER as row_num,
        (seat->>'column')::INTEGER as column_num,
        seat->>'type' as seat_type,
        COALESCE(seat->>'label', '') as label
    FROM jsonb_array_elements(seat_map_data->'seats') AS seat
    WHERE seat->>'label' ILIKE '%' || search_label || '%'
       OR seat->>'id' ILIKE '%' || search_label || '%';
END;
$$ LANGUAGE plpgsql;

-- 13. Add function to get seat map summary
CREATE OR REPLACE FUNCTION get_seat_map_summary(seat_map_data JSONB)
RETURNS TABLE(
    total_positions INTEGER,
    seat_count INTEGER,
    walkway_count INTEGER,
    disabled_count INTEGER,
    rows_count INTEGER,
    columns_count INTEGER
) AS $$
BEGIN
    IF seat_map_data IS NULL THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 0, 0;
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        (seat_map_data->>'rows')::INTEGER * (seat_map_data->>'columns')::INTEGER as total_positions,
        get_seat_count_from_map(seat_map_data) as seat_count,
        get_walkway_count_from_map(seat_map_data) as walkway_count,
        get_disabled_seat_count_from_map(seat_map_data) as disabled_count,
        (seat_map_data->>'rows')::INTEGER as rows_count,
        (seat_map_data->>'columns')::INTEGER as columns_count;
END;
$$ LANGUAGE plpgsql;

-- 14. Add trigger to automatically update capacity when seat_map_json changes
CREATE OR REPLACE FUNCTION update_capacity_from_seat_map()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if seat_mode is SEATMAP and seat_map_json is not null
    IF NEW.seat_mode = 'SEATMAP' AND NEW.seat_map_json IS NOT NULL THEN
        NEW.capacity := get_seat_count_from_map(NEW.seat_map_json);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_capacity_from_seat_map
    BEFORE INSERT OR UPDATE ON boats
    FOR EACH ROW
    EXECUTE FUNCTION update_capacity_from_seat_map();

-- 15. Add comments for documentation
COMMENT ON COLUMN boats.seat_map_json IS 'JSON structure containing seat map layout with custom labels. Structure: {rows: int, columns: int, seats: [{id, row, column, type, available, price_multiplier, label?}], layout: string[][]}';
COMMENT ON FUNCTION validate_seat_map_json(JSONB) IS 'Validates that seat_map_json has the correct structure for the new seat system';
COMMENT ON FUNCTION get_seat_count_from_map(JSONB) IS 'Returns the count of actual seats (type=seat) in the seat map';
COMMENT ON FUNCTION get_walkway_count_from_map(JSONB) IS 'Returns the count of walkways (type=walkway) in the seat map';
COMMENT ON FUNCTION get_disabled_seat_count_from_map(JSONB) IS 'Returns the count of disabled seats (type=disabled) in the seat map';
COMMENT ON FUNCTION find_seats_by_label(JSONB, TEXT) IS 'Finds seats by custom label or ID';
COMMENT ON FUNCTION get_seat_map_summary(JSONB) IS 'Returns a summary of the seat map structure';

-- 16. Grant necessary permissions (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION validate_seat_map_json(JSONB) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_seat_count_from_map(JSONB) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_walkway_count_from_map(JSONB) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_disabled_seat_count_from_map(JSONB) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION find_seats_by_label(JSONB, TEXT) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_seat_map_summary(JSONB) TO your_app_role;
