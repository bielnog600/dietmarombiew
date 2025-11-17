/*
  # Add progress tracking tables

  1. New Tables
    - progress_photos
      - Stores user progress photos with type (front, side, back)
    - weight_history
      - Stores user weight measurements over time
    
  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create progress_photos table
CREATE TABLE progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('front', 'side', 'back')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create weight_history table
CREATE TABLE weight_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  weight numeric(5,2) NOT NULL CHECK (weight >= 30 AND weight <= 200),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- Create policies for progress_photos
CREATE POLICY "Users can view their own photos"
  ON progress_photos
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own photos"
  ON progress_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own photos"
  ON progress_photos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for weight_history
CREATE POLICY "Users can view their weight history"
  ON weight_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert weight records"
  ON weight_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX progress_photos_user_id_idx ON progress_photos(user_id);
CREATE INDEX progress_photos_created_at_idx ON progress_photos(created_at);
CREATE INDEX weight_history_user_id_idx ON weight_history(user_id);
CREATE INDEX weight_history_created_at_idx ON weight_history(created_at);