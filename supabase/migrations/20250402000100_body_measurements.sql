/*
  # Body Measurements Tracking System

  1. New Tables
    - `body_measurements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `waist` (numeric, cintura em cm)
      - `abdomen` (numeric, abdômen em cm)
      - `left_arm` (numeric, braço esquerdo em cm)
      - `right_arm` (numeric, braço direito em cm)
      - `left_thigh` (numeric, coxa esquerda em cm)
      - `right_thigh` (numeric, coxa direita em cm)
      - `hips` (numeric, quadril em cm)
      - `chest` (numeric, peitoral em cm)
      - `notes` (text, observações)
      - `recorded_by` (uuid, admin que registrou)
      - `created_at` (timestamptz, data do registro)

  2. Security
    - Enable RLS on `body_measurements` table
    - Admin can insert/update/delete measurements
    - Admin can view all measurements
    - Users can view their own measurements

  3. Indexes
    - Index on `user_id` for fast lookups
    - Index on `created_at` for chronological queries
*/

-- Create body_measurements table
CREATE TABLE IF NOT EXISTS body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  waist numeric CHECK (waist IS NULL OR (waist > 0 AND waist < 300)),
  abdomen numeric CHECK (abdomen IS NULL OR (abdomen > 0 AND abdomen < 300)),
  left_arm numeric CHECK (left_arm IS NULL OR (left_arm > 0 AND left_arm < 150)),
  right_arm numeric CHECK (right_arm IS NULL OR (right_arm > 0 AND right_arm < 150)),
  left_thigh numeric CHECK (left_thigh IS NULL OR (left_thigh > 0 AND left_thigh < 200)),
  right_thigh numeric CHECK (right_thigh IS NULL OR (right_thigh > 0 AND right_thigh < 200)),
  hips numeric CHECK (hips IS NULL OR (hips > 0 AND hips < 300)),
  chest numeric CHECK (chest IS NULL OR (chest > 0 AND chest < 300)),
  notes text DEFAULT '',
  recorded_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- Admin can insert measurements
CREATE POLICY "Admin can insert body measurements"
  ON body_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admin can view all measurements
CREATE POLICY "Admin can view all body measurements"
  ON body_measurements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can view their own measurements
CREATE POLICY "Users can view own body measurements"
  ON body_measurements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can update measurements
CREATE POLICY "Admin can update body measurements"
  ON body_measurements
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

-- Admin can delete measurements
CREATE POLICY "Admin can delete body measurements"
  ON body_measurements
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
CREATE INDEX IF NOT EXISTS body_measurements_user_id_idx ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS body_measurements_created_at_idx ON body_measurements(created_at DESC);
CREATE INDEX IF NOT EXISTS body_measurements_user_date_idx ON body_measurements(user_id, created_at DESC);
