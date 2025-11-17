/*
  # Update RLS policies for foods table
  
  1. Changes
    - Add INSERT and UPDATE policies for admin user
    - Maintain existing SELECT policy
  
  2. Security
    - Only admin can manage foods
    - All authenticated users can read foods
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read foods" ON foods;

-- Create comprehensive policies for foods table
CREATE POLICY "Anyone can read foods"
  ON foods
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert foods"
  ON foods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  );

CREATE POLICY "Admin can update foods"
  ON foods
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  )
  WITH CHECK (
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  );

CREATE POLICY "Admin can delete foods"
  ON foods
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  );