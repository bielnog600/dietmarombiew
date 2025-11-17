/*
  # Fix authentication and RLS policy issues
  
  1. Changes
    - Fix user registration RLS policies
    - Add proper INSERT policy for public registration
    - Update user management policies for admin
    - Fix cascading deletes
  
  2. Security
    - Allow new user registration
    - Maintain admin access
    - Ensure proper data isolation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for registration" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "DELETE" ON users;

-- Create comprehensive policies for users table
CREATE POLICY "Enable insert for registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  );

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR 
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  )
  WITH CHECK (
    id = auth.uid() OR 
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  );

CREATE POLICY "DELETE"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    id = auth.uid() OR 
    (auth.jwt() ->> 'email'::text) = 'bielnog600@gmail.com'::text
  );

-- Ensure cascading deletes are properly set up
ALTER TABLE diets
DROP CONSTRAINT IF EXISTS diets_user_id_fkey,
ADD CONSTRAINT diets_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

ALTER TABLE meals
DROP CONSTRAINT IF EXISTS meals_diet_id_fkey,
ADD CONSTRAINT meals_diet_id_fkey
FOREIGN KEY (diet_id)
REFERENCES diets(id)
ON DELETE CASCADE;

ALTER TABLE meal_foods
DROP CONSTRAINT IF EXISTS meal_foods_meal_id_fkey,
ADD CONSTRAINT meal_foods_meal_id_fkey
FOREIGN KEY (meal_id)
REFERENCES meals(id)
ON DELETE CASCADE;