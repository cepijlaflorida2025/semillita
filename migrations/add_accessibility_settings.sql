-- Add accessibility_settings column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='users'
        AND column_name='accessibility_settings'
    ) THEN
        ALTER TABLE users
        ADD COLUMN accessibility_settings json DEFAULT '{"fontSize":"medium"}'::json;

        RAISE NOTICE 'Column accessibility_settings added successfully';
    ELSE
        RAISE NOTICE 'Column accessibility_settings already exists';
    END IF;
END $$;
