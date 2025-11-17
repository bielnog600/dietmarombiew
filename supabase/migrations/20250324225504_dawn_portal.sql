/*
  # Fix diet_macros table and policies

  1. Changes
    - Drop existing policies if they exist
    - Ensure RLS is enabled
    - Recreate policies with proper access control
  
  2. Security
    - Users can only access their own diet macros
    - Admin has full access
    - Maintain data isolation
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop SELECT policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'diet_macros' 
    AND policyname = 'Users can read their own diet macros'
  ) THEN
    DROP POLICY "Users can read their own diet macros" ON diet_macros;
  END IF;

  -- Drop INSERT policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'diet_macros' 
    AND policyname = 'Users can insert their own diet macros'
  ) THEN
    DROP POLICY "Users can insert their own diet macros" ON diet_macros;
  END IF;

  -- Drop UPDATE policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'diet_macros' 
    AND policyname = 'Users can update their own diet macros'
  ) THEN
    DROP POLICY "Users can update their own diet macros" ON diet_macros;
  END IF;

  -- Drop DELETE policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'diet_macros' 
    AND policyname = 'Users can delete their own diet macros'
  ) THEN
    DROP POLICY "Users can delete their own diet macros" ON diet_macros;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE diet_macros ENABLE ROW LEVEL SECURITY;

-- Create fresh policies
CREATE POLICY "Users can read their own diet macros"
  ON diet_macros
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diets
      WHERE diets.id = diet_macros.diet_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  );

CREATE POLICY "Users can insert their own diet macros"
  ON diet_macros
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diets
      WHERE diets.id = diet_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  );

CREATE POLICY "Users can update their own diet macros"
  ON diet_macros
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diets
      WHERE diets.id = diet_macros.diet_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diets
      WHERE diets.id = diet_macros.diet_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  );

CREATE POLICY "Users can delete their own diet macros"
  ON diet_macros
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diets
      WHERE diets.id = diet_macros.diet_id
      AND (
        diets.user_id = auth.uid() OR
        auth.jwt() ->> 'email' = 'bielnog600@gmail.com'
      )
    )
  );

-- Ensure index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'diet_macros' 
    AND indexname = 'diet_macros_diet_id_idx'
  ) THEN
    CREATE INDEX diet_macros_diet_id_idx ON diet_macros(diet_id);
  END IF;
END $$;