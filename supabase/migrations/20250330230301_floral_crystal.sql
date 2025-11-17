/*
  # Add photo_url column to users table
  
  1. Changes
    - Add photo_url column to users table
    - Column is nullable to support users without a profile photo
    - Add comment explaining column purpose
  
  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover the new column
*/

-- Add photo_url column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add comment explaining column purpose
COMMENT ON COLUMN users.photo_url IS 'URL to user''s profile photo in storage';