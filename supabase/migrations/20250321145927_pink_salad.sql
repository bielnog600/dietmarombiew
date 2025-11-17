/*
  # Add plan expiry column to users table

  1. Changes
    - Add plan_expiry column to users table
    - Column is nullable to support users without an expiration date
    - Default value is NULL
    
  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover the new column
*/

-- Add plan_expiry column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan_expiry timestamptz DEFAULT NULL;

-- Add comment to explain column purpose
COMMENT ON COLUMN users.plan_expiry IS 'Date when the user''s plan expires. NULL means no expiration.';