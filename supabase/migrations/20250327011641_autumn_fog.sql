/*
  # Add carb cycling support
  
  1. Changes
    - Add carb_cycling_enabled column to users table
    - Add carb_day_type column to diets table
    - Add check constraint for valid carb day types
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add carb cycling enabled flag to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS carb_cycling_enabled boolean DEFAULT false;

-- Add carb day type to diets
ALTER TABLE diets
ADD COLUMN IF NOT EXISTS carb_day_type text CHECK (carb_day_type IN ('high', 'moderate', 'low'));

-- Add comment explaining carb day types
COMMENT ON COLUMN diets.carb_day_type IS 'Type of carb day: high (50-60% carbs), moderate (30-40% carbs), or low (10-20% carbs)';