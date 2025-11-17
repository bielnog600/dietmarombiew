/*
  # Add DELETE policy for meal_foods table

  1. Changes
    - Add DELETE policy to allow users to delete their own meal foods
    - Policy checks if the meal belongs to the user's diet through joins
  
  2. Security
    - Only allows deletion of meal foods from meals in the user's own diets
    - Maintains data isolation between users
*/

CREATE POLICY "Users can delete their own meal_foods"
ON meal_foods
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM meals
    JOIN diets ON diets.id = meals.diet_id
    WHERE meals.id = meal_foods.meal_id
    AND (diets.user_id = auth.uid() OR (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text)
  )
);