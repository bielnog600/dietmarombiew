/*
  # Apply Weekly Diet System - Combined Migration

  This migration combines the weekly diet system implementation and updates existing diets.

  1. Schema Changes
    - Add `day_of_week` column to diets table (0=Sunday, 1=Monday, ... 6=Saturday)
    - This allows each user to have 7 different diet plans (one per day)

  2. Data Updates
    - Set day_of_week = 1 (Monday) for all existing diets

  3. Important Notes
    - All existing diets will be assigned to Monday by default
    - Admins can create new diets for other days of the week
    - The carb cycling feature works in conjunction with this
*/

-- Add day_of_week column to diets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diets' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE diets ADD COLUMN day_of_week integer DEFAULT 1 CHECK (day_of_week >= 0 AND day_of_week <= 6);
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN diets.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';

-- Update existing diets to have day_of_week = 1 (Monday) if NULL
UPDATE diets
SET day_of_week = 1
WHERE day_of_week IS NULL;

-- Create index for faster queries by user and day
CREATE INDEX IF NOT EXISTS idx_diets_user_day ON diets(user_id, day_of_week);
