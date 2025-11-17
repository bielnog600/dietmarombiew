/*
  # Add water intake tracking table
  
  1. New Tables
    - water_intake_history
      - Stores daily water intake records
      - Links to users table
    
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create water_intake_history table
CREATE TABLE water_intake_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE water_intake_history ENABLE ROW LEVEL SECURITY;

-- Create policies for water_intake_history
CREATE POLICY "Users can read their own water intake history"
  ON water_intake_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own water intake records"
  ON water_intake_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own water intake records"
  ON water_intake_history
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX water_intake_history_user_id_idx ON water_intake_history(user_id);
CREATE INDEX water_intake_history_date_idx ON water_intake_history(date);