/*
  # Cleanup Duplicate Diets

  This script removes duplicate diets, keeping only the most recent diet
  for each user and day_of_week combination.

  IMPORTANT: This will delete old/duplicate diets and their associated data.
  Run this in the Supabase SQL Editor.
*/

-- Delete duplicate diets, keeping only the most recent for each user + day_of_week
WITH ranked_diets AS (
  SELECT
    id,
    user_id,
    day_of_week,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, day_of_week
      ORDER BY created_at DESC
    ) as rn
  FROM diets
)
DELETE FROM diets
WHERE id IN (
  SELECT id
  FROM ranked_diets
  WHERE rn > 1
);

-- Verify remaining diets (should be max 7 per user)
SELECT
  user_id,
  COUNT(*) as diet_count,
  array_agg(day_of_week ORDER BY day_of_week) as days_with_diets
FROM diets
GROUP BY user_id
ORDER BY user_id;
