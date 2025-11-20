/*
  # Add UPDATE and DELETE policies for meals and meal_foods

  1. New Policies
    - Add UPDATE policy for meals table
    - Add DELETE policy for meals table
    - Add UPDATE policy for meal_foods table
    - Add DELETE policy for meal_foods table

  2. Security
    - Users can update/delete their own meals
    - Users can update/delete their own meal_foods
    - Admin can manage all records
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update their own meals" ON meals;
DROP POLICY IF EXISTS "Users can delete their own meals" ON meals;
DROP POLICY IF EXISTS "Users can update their own meal_foods" ON meal_foods;
DROP POLICY IF EXISTS "Users can delete their own meal_foods" ON meal_foods;

-- Add UPDATE policy for meals
CREATE POLICY "Users can update their own meals"
  ON meals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diets
      WHERE diets.id = meals.diet_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diets
      WHERE diets.id = diet_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  );

-- Add DELETE policy for meals
CREATE POLICY "Users can delete their own meals"
  ON meals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diets
      WHERE diets.id = meals.diet_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  );

-- Add UPDATE policy for meal_foods
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
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals
      JOIN diets ON diets.id = meals.diet_id
      WHERE meals.id = meal_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  );

-- Add DELETE policy for meal_foods
CREATE POLICY "Users can delete their own meal_foods"
  ON meal_foods
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals
      JOIN diets ON diets.id = meals.diet_id
      WHERE meals.id = meal_foods.meal_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  );
