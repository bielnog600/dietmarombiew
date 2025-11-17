/*
  # Add physical data columns to users table

  1. Changes
    - Add weight column (numeric)
    - Add height column (integer)
    - Add age column (integer)
    
  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover new columns
*/

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS weight numeric(5,2),
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS age integer;

-- Add check constraints
ALTER TABLE users
ADD CONSTRAINT users_weight_check CHECK (weight >= 30 AND weight <= 200),
ADD CONSTRAINT users_height_check CHECK (height >= 100 AND height <= 250),
ADD CONSTRAINT users_age_check CHECK (age >= 14 AND age <= 100);