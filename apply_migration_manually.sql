-- =====================================================
-- APPLY THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- This migration adds weekly diet support to the system
-- Copy and paste this entire script into the Supabase SQL Editor
-- and click "Run" to apply the changes
-- =====================================================

-- Step 1: Add day_of_week column to diets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diets' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE diets ADD COLUMN day_of_week integer DEFAULT 1 CHECK (day_of_week >= 0 AND day_of_week <= 6);
    RAISE NOTICE 'Column day_of_week added successfully';
  ELSE
    RAISE NOTICE 'Column day_of_week already exists';
  END IF;
END $$;

-- Step 2: Add comment for clarity
COMMENT ON COLUMN diets.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';

-- Step 3: Update existing diets to have day_of_week = 1 (Monday) if NULL
UPDATE diets
SET day_of_week = 1
WHERE day_of_week IS NULL;

-- Step 4: Create index for faster queries by user and day
CREATE INDEX IF NOT EXISTS idx_diets_user_day ON diets(user_id, day_of_week);

-- =====================================================
-- VERIFICATION QUERY
-- Run this after the migration to verify it worked:
-- =====================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'diets' AND column_name = 'day_of_week';
-- =====================================================
