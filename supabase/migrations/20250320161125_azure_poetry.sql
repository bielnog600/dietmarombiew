/*
  # Add user role system
  
  1. Changes
    - Add role column to users table
    - Update existing admin user
    - Add RLS policies based on role
  
  2. Security
    - Only admin can access dashboard
    - Regular users are restricted
*/

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Update the admin user
UPDATE users 
SET role = 'admin' 
WHERE email = 'bielnog600@gmail.com';

-- Update RLS policies for users table
DROP POLICY IF EXISTS "Users can read their own data" ON users;

CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );