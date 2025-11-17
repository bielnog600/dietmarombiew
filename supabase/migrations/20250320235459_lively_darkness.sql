/*
  # Clean up meal_foods duplicates and strengthen constraints

  1. Changes
    - Remove all duplicate meal_foods entries, keeping only the most recent one
    - Add trigger to prevent duplicate food items in the same meal
    - Add function to validate meal food entries
    - Add check constraint for quantity values

  2. Security
    - No changes to RLS policies
*/

-- First, create a function to validate meal food entries
CREATE OR REPLACE FUNCTION validate_meal_food()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this food already exists in this meal
  IF EXISTS (
    SELECT 1 
    FROM meal_foods 
    WHERE meal_id = NEW.meal_id 
    AND food_id = NEW.food_id 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Food item already exists in this meal';
  END IF;

  -- Validate quantity is positive
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS meal_food_validation_trigger ON meal_foods;
CREATE TRIGGER meal_food_validation_trigger
  BEFORE INSERT OR UPDATE ON meal_foods
  FOR EACH ROW
  EXECUTE FUNCTION validate_meal_food();

-- Remove any existing duplicates
WITH duplicates AS (
  SELECT 
    id,
    meal_id,
    food_id,
    ROW_NUMBER() OVER (
      PARTITION BY meal_id, food_id 
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) as rn
  FROM meal_foods
)
DELETE FROM meal_foods
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Add check constraint for quantity
ALTER TABLE meal_foods
DROP CONSTRAINT IF EXISTS meal_foods_quantity_check;

ALTER TABLE meal_foods
ADD CONSTRAINT meal_foods_quantity_check 
CHECK (quantity > 0);

-- Ensure unique constraint exists
ALTER TABLE meal_foods
DROP CONSTRAINT IF EXISTS meal_foods_meal_id_food_id_key;

ALTER TABLE meal_foods
ADD CONSTRAINT meal_foods_meal_id_food_id_key 
UNIQUE (meal_id, food_id);