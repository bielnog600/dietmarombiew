/*
  # Fix admin access to users table
  
  1. Changes
    - Update RLS policies to allow admin to read all users
    - Ensure admin can manage user data
  
  2. Security
    - Admin has full access to users table
    - Regular users can only read and update their own data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Enable insert for registration" ON users;

-- Create new policies with admin access
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    (SELECT email FROM users WHERE id = auth.uid()) = 'bielnog600@gmail.com'
  );

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR 
    (SELECT email FROM users WHERE id = auth.uid()) = 'bielnog600@gmail.com'
  )
  WITH CHECK (
    id = auth.uid() OR 
    (SELECT email FROM users WHERE id = auth.uid()) = 'bielnog600@gmail.com'
  );

CREATE POLICY "Enable insert for registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);