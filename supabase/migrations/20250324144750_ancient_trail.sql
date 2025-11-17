/*
  # Add UPDATE policy for meal_foods table
  
  1. Changes
    - Add UPDATE policy for meal_foods table
    - Allow users to update portions of their own meal foods
    - Allow admin to update any meal foods
  
  2. Security
    - Users can only update meal foods from their own diets
    - Admin has full access
*/

-- Create UPDATE policy for meal_foods
CREATE POLICY "Users can update their own meal_foods"
  ON meal_foods
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals
      JOIN diets ON diets.id = meals.diet_id
      WHERE meals.id = meal_foods.meal_id
      AND (
        diets.user_id = auth.uid() OR
        (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals
      JOIN diets ON diets.id = meals.diet_id
      WHERE meals.id = meal_foods.meal_id
      AND (
        diets.user_id = auth.uid() OR
        (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
      )
    )
  );