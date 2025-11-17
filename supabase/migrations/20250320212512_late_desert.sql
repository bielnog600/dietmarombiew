/*
  # Fix RLS policies for meals and meal_foods tables

  1. Changes
    - Add INSERT policies for meals table
    - Add INSERT policies for meal_foods table
    - Ensure users can only insert meals for their own diets
    - Ensure users can only insert meal_foods for their own meals

  2. Security
    - Enable RLS on both tables
    - Add comprehensive policies for all operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own meals" ON meals;
DROP POLICY IF EXISTS "Users can read their own meal_foods" ON meal_foods;

-- Create comprehensive policies for meals table
CREATE POLICY "Users can read their own meals"
  ON meals
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM diets
    WHERE diets.id = meals.diet_id
    AND diets.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert meals for their own diets"
  ON meals
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM diets
    WHERE diets.id = diet_id
    AND diets.user_id = auth.uid()
  ));

-- Create comprehensive policies for meal_foods table
CREATE POLICY "Users can read their own meal_foods"
  ON meal_foods
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM meals
    JOIN diets ON diets.id = meals.diet_id
    WHERE meals.id = meal_foods.meal_id
    AND diets.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert meal_foods for their own meals"
  ON meal_foods
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM meals
    JOIN diets ON diets.id = meals.diet_id
    WHERE meals.id = meal_id
    AND diets.user_id = auth.uid()
  ));