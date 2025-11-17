/*
  # Add unique constraint to meal_foods

  1. Changes
    - Add unique constraint to prevent duplicate food items within the same meal
    - Clean up any existing duplicate meal_foods entries
    - Keep only the entry with the highest quantity for each duplicate

  2. Security
    - No changes to RLS policies
*/

-- First, create a temporary table to store the entries we want to keep
CREATE TEMP TABLE meal_foods_to_keep AS
WITH ranked_foods AS (
  SELECT 
    id,
    meal_id,
    food_id,
    quantity,
    ROW_NUMBER() OVER (
      PARTITION BY meal_id, food_id 
      ORDER BY quantity DESC
    ) as rn
  FROM meal_foods
)
SELECT id, meal_id, food_id, quantity
FROM ranked_foods
WHERE rn = 1;

-- Delete all existing entries
DELETE FROM meal_foods;

-- Reinsert the entries we want to keep
INSERT INTO meal_foods (id, meal_id, food_id, quantity)
SELECT id, meal_id, food_id, quantity
FROM meal_foods_to_keep;

-- Add unique constraint
ALTER TABLE meal_foods
ADD CONSTRAINT meal_foods_meal_id_food_id_key UNIQUE (meal_id, food_id);

-- Drop temporary table
DROP TABLE meal_foods_to_keep;