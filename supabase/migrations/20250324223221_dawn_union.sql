/*
  # Add diet macros table and policies
  
  1. New Tables
    - diet_macros
      - Stores macro distribution for each diet
      - Links to diets table
    
  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Allow admin to manage all diet macros
*/

-- Create diet_macros table
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

-- Create policies for diet_macros
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

-- Create indexes for better performance
CREATE INDEX diet_macros_diet_id_idx ON diet_macros(diet_id);