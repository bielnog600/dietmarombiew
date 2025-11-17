/*
  # Fix diet deletion policy
  
  1. Changes
    - Drop existing policy if it exists
    - Recreate DELETE policy for diets table
    - Allow users to delete their own diets
    - Allow admin to delete any diet
  
  2. Security
    - Only users can delete their own diets
    - Admin can delete any diet
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can delete their own diets" ON diets;

-- Create DELETE policy for diets
CREATE POLICY "Users can delete their own diets"
  ON diets
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  );