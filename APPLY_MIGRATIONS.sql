-- =====================================================
-- APLICAR ESTAS MIGRATIONS NO SUPABASE SQL EDITOR
-- =====================================================
-- Copie e cole este SQL completo no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole e Execute
-- =====================================================

-- =====================================================
-- MIGRATION 1: Weight History Table
-- =====================================================

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can insert weight records" ON weight_history;
DROP POLICY IF EXISTS "Admin can view all weight records" ON weight_history;
DROP POLICY IF EXISTS "Users can view own weight history" ON weight_history;
DROP POLICY IF EXISTS "Admin can update weight records" ON weight_history;
DROP POLICY IF EXISTS "Admin can delete weight records" ON weight_history;

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

-- =====================================================
-- MIGRATION 2: Body Measurements Table
-- =====================================================

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can insert body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can view all body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can view own body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can update body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can delete body measurements" ON body_measurements;

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

-- =====================================================
-- MIGRATION CONCLUÍDA!
-- =====================================================
-- Se executou sem erros, as tabelas foram criadas com sucesso!
-- Você pode verificar no Table Editor do Supabase
-- =====================================================
