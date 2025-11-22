/*
  # Fix Duplicate Diets Issue

  1. Problem
    - Multiple diets exist for the same user_id and day_of_week
    - This causes meals to be saved in old/orphaned diet records
    - Query returns wrong diet IDs leading to empty meal lists

  2. Solution
    - Delete duplicate diets, keeping only the most recent one per (user_id, day_of_week)
    - Add UNIQUE constraint to prevent future duplicates
    - This ensures only ONE diet per user per day of week

  3. Safety
    - Uses window functions to identify duplicates
    - Preserves the most recent diet (by created_at)
    - Cascading deletes will remove associated meals and meal_foods
*/

-- Step 1: Identify and delete duplicate diets
-- Keep only the most recent diet for each (user_id, day_of_week) combination
DO $$
BEGIN
  -- Delete older duplicates, keeping the newest
  DELETE FROM diets
  WHERE id IN (
    SELECT id
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, day_of_week
          ORDER BY created_at DESC
        ) as rn
      FROM diets
    ) ranked
    WHERE rn > 1
  );

  RAISE NOTICE 'Deleted duplicate diets';
END $$;

-- Step 2: Add unique constraint to prevent future duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'diets_user_day_unique'
  ) THEN
    ALTER TABLE diets
    ADD CONSTRAINT diets_user_day_unique
    UNIQUE (user_id, day_of_week);

    RAISE NOTICE 'Added unique constraint on (user_id, day_of_week)';
  END IF;
END $$;

-- Step 3: Add comment for clarity
COMMENT ON CONSTRAINT diets_user_day_unique ON diets IS
  'Ensures each user has exactly one diet per day of the week';
