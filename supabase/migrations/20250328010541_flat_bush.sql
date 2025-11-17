/*
  # Add body composition columns
  
  1. Changes
    - Add lean_mass column to users table
    - Add fat_mass column to users table
    - Add check constraints for valid ranges
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add body composition columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS lean_mass numeric(5,2),
ADD COLUMN IF NOT EXISTS fat_mass numeric(5,2);

-- Add check constraints
ALTER TABLE users
ADD CONSTRAINT users_lean_mass_check CHECK (lean_mass >= 20 AND lean_mass <= 150),
ADD CONSTRAINT users_fat_mass_check CHECK (fat_mass >= 2 AND fat_mass <= 100);

-- Add comment explaining columns
COMMENT ON COLUMN users.lean_mass IS 'User''s lean body mass in kg';
COMMENT ON COLUMN users.fat_mass IS 'User''s fat mass in kg';