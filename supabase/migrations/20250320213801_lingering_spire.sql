/*
  # Fix RLS policies for meals and meal_foods tables
  
  1. Changes
    - Drop and recreate meals table policies
    - Drop and recreate meal_foods table policies
    - Add admin access to all policies
  
  2. Security
    - Users can manage their own meals and meal_foods
    - Admin can manage all meals and meal_foods
*/

-- Drop existing policies for meals
DROP POLICY IF EXISTS "Users can read their own meals" ON meals;
DROP POLICY IF EXISTS "Users can insert meals for their own diets" ON meals;

-- Create comprehensive policies for meals
CREATE POLICY "Users can read their own meals"
  ON meals
  FOR SELECT
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

CREATE POLICY "Users can insert meals for their own diets"
  ON meals
  FOR INSERT
  TO authenticated
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

-- Drop existing policies for meal_foods
DROP POLICY IF EXISTS "Users can read their own meal_foods" ON meal_foods;
DROP POLICY IF EXISTS "Users can insert meal_foods for their own meals" ON meal_foods;

-- Create comprehensive policies for meal_foods
CREATE POLICY "Users can read their own meal_foods"
  ON meal_foods
  FOR SELECT
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

CREATE POLICY "Users can insert meal_foods for their own meals"
  ON meal_foods
  FOR INSERT
  TO authenticated
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