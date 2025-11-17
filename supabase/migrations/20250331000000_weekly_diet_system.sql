/*
  # Weekly Diet System Implementation

  1. Schema Changes
    - Add `day_of_week` column to diets table (0=Sunday, 1=Monday, ... 6=Saturday)
    - This allows each user to have 7 different diet plans (one per day)

  2. Important Notes
    - Admins will create separate diet plans for each day of the week
    - Clients will see a weekly tab interface to switch between days
    - Each day can have different calorie targets and meals
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

-- Create index for faster queries by user and day
CREATE INDEX IF NOT EXISTS idx_diets_user_day ON diets(user_id, day_of_week);
