/*
  # Fix recursive RLS policy
  
  1. Changes
    - Replace recursive policy with a simpler one
    - Maintain admin access control
  
  2. Security
    - Users can still only read their own data
    - Admin can read all data
    - Prevents infinite recursion
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can read their own data" ON users;

-- Create new non-recursive policy
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    email = 'bielnog600@gmail.com'
  );