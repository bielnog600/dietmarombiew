/*
  # Add activity level and gender to users table
  
  1. Changes
    - Add activity_level column with valid levels
    - Add gender column
    - Add check constraints
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add activity level column with check constraint
ALTER TABLE users
ADD COLUMN IF NOT EXISTS activity_level text CHECK (
  activity_level IN (
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active'
  )
);

-- Add gender column with check constraint
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gender text CHECK (
  gender IN ('male', 'female')
);