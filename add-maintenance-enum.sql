-- Add MAINTENANCE enum value to user_status enum type
-- This script adds the MAINTENANCE status to the existing user_status enum

-- First, check if the enum type exists and what values it currently has
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'user_status'
);

-- Add MAINTENANCE to the user_status enum if it doesn't exist
DO $$ 
BEGIN
    -- Check if MAINTENANCE already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'user_status'
        ) 
        AND enumlabel = 'MAINTENANCE'
    ) THEN
        -- Add MAINTENANCE to the enum
        ALTER TYPE user_status ADD VALUE 'MAINTENANCE';
        RAISE NOTICE 'MAINTENANCE enum value added successfully';
    ELSE
        RAISE NOTICE 'MAINTENANCE enum value already exists';
    END IF;
END $$;

-- Verify the enum values after the update
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'user_status'
)
ORDER BY enumsortorder;

-- Optional: Update any existing boats that might need the new status
-- Uncomment the following lines if you want to update existing data
-- UPDATE boats 
-- SET status = 'MAINTENANCE' 
-- WHERE status = 'INACTIVE' AND name ILIKE '%maintenance%';

-- Show current boat status distribution
SELECT status, COUNT(*) as count
FROM boats 
GROUP BY status
ORDER BY status;
