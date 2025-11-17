/*
  # Fix infinite recursion in RLS policies
  
  1. Changes
    - Simplify RLS policies to avoid recursion
    - Use auth.jwt() to check admin status
  
  2. Security
    - Maintain admin access without recursion
    - Keep existing security model
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Enable insert for registration" ON users;

-- Create new policies without recursion
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
  );

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR 
    auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
  )
  WITH CHECK (
    id = auth.uid() OR 
    auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
  );

CREATE POLICY "Enable insert for registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);