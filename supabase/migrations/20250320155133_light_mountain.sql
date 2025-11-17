/*
  # Fix users table RLS policies

  1. Changes
    - Add policy for inserting new users during registration
    - Ensure authenticated users can read and update their own data
  
  2. Security
    - Enable RLS on users table
    - Add policies for INSERT, SELECT, and UPDATE operations
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Create comprehensive policies
CREATE POLICY "Enable insert for registration"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);