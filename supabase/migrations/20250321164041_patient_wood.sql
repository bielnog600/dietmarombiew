/*
  # Add cascading deletes for user data cleanup
  
  1. Changes
    - Drop existing foreign key constraints
    - Recreate constraints with ON DELETE CASCADE
    - This ensures when a user is deleted, all related data is automatically removed
  
  2. Security
    - Maintain existing RLS policies
    - Data integrity is preserved through proper cascading
*/

-- First drop existing foreign key constraints
ALTER TABLE diets
DROP CONSTRAINT IF EXISTS diets_user_id_fkey;

ALTER TABLE meals
DROP CONSTRAINT IF EXISTS meals_diet_id_fkey;

ALTER TABLE meal_foods
DROP CONSTRAINT IF EXISTS meal_foods_meal_id_fkey;

-- Recreate constraints with ON DELETE CASCADE
ALTER TABLE diets
ADD CONSTRAINT diets_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

ALTER TABLE meals
ADD CONSTRAINT meals_diet_id_fkey
FOREIGN KEY (diet_id)
REFERENCES diets(id)
ON DELETE CASCADE;

ALTER TABLE meal_foods
ADD CONSTRAINT meal_foods_meal_id_fkey
FOREIGN KEY (meal_id)
REFERENCES meals(id)
ON DELETE CASCADE;