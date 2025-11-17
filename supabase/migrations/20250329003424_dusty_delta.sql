/*
  # Add calculation method to users table
  
  1. Changes
    - Add calculation_method column to users table
    - Add check constraint for valid methods
    - Add comment explaining the column purpose
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add calculation_method column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS calculation_method text CHECK (
  calculation_method IN ('harris', 'mifflin', 'cunningham')
);

-- Add comment explaining the column
COMMENT ON COLUMN users.calculation_method IS 'The method used to calculate user''s caloric needs: harris (Harris-Benedict), mifflin (Mifflin-St Jeor), cunningham (Cunningham)';