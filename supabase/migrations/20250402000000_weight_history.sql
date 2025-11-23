/*
  # Weight History Tracking System

  1. New Tables
    - `weight_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `weight` (numeric, weight in kg)
      - `notes` (text, optional notes about the weight entry)
      - `recorded_by` (uuid, foreign key to auth.users - admin who recorded it)
      - `created_at` (timestamptz, when the weight was recorded)

  2. Security
    - Enable RLS on `weight_history` table
    - Admin can insert weight records for any user
    - Admin can view all weight records
    - Users can view their own weight history
    - Admin can update/delete weight records

  3. Indexes
    - Index on `user_id` for fast lookups
    - Index on `created_at` for chronological queries
*/

-- Create weight_history table
CREATE TABLE IF NOT EXISTS weight_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight numeric NOT NULL CHECK (weight > 0 AND weight < 500),
  notes text DEFAULT '',
  recorded_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- Admin can insert weight records for any user
CREATE POLICY "Admin can insert weight records"
  ON weight_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admin can view all weight records
CREATE POLICY "Admin can view all weight records"
  ON weight_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can view their own weight history
CREATE POLICY "Users can view own weight history"
  ON weight_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can update weight records
CREATE POLICY "Admin can update weight records"
  ON weight_history
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admin can delete weight records
CREATE POLICY "Admin can delete weight records"
  ON weight_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS weight_history_user_id_idx ON weight_history(user_id);
CREATE INDEX IF NOT EXISTS weight_history_created_at_idx ON weight_history(created_at DESC);
CREATE INDEX IF NOT EXISTS weight_history_user_date_idx ON weight_history(user_id, created_at DESC);
