/*
  # Add diet_macros table if it doesn't exist
  
  1. Changes
    - Safely create diet_macros table
    - Add RLS policies
    - Add indexes
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Allow admin access
*/

-- Safely create diet_macros table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'diet_macros'
  ) THEN
    CREATE TABLE diet_macros (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      diet_id uuid REFERENCES diets(id) ON DELETE CASCADE NOT NULL,
      protein integer NOT NULL,
      carbs integer NOT NULL,
      fats integer NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      UNIQUE(diet_id)
    );

    -- Enable RLS
    ALTER TABLE diet_macros ENABLE ROW LEVEL SECURITY;

    -- Create index
    CREATE INDEX diet_macros_diet_id_idx ON diet_macros(diet_id);
  END IF;
END $$;

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