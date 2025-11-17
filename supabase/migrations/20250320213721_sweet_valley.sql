/*
  # Fix RLS policies for diets table
  
  1. Changes
    - Drop and recreate diets table policies
    - Add proper INSERT policy for diets
    - Ensure admin can manage all diets
  
  2. Security
    - Users can manage their own diets
    - Admin can manage all diets
*/

-- Drop existing policies for diets
DROP POLICY IF EXISTS "Users can read their own diets" ON diets;
DROP POLICY IF EXISTS "Users can create their own diets" ON diets;

-- Create comprehensive policies for diets
CREATE POLICY "Users can read their own diets"
  ON diets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
  );

CREATE POLICY "Users can create their own diets"
  ON diets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
  );

CREATE POLICY "Users can update their own diets"
  ON diets
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
  )
  WITH CHECK (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
  );

CREATE POLICY "Users can delete their own diets"
  ON diets
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
  );