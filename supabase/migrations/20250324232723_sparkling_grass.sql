/*
  # Add plan expiry check function and trigger
  
  1. Changes
    - Add function to check plan expiry
    - Add trigger to check expiry on diet access
    - Add active column to diets table
  
  2. Security
    - Only allow access to active diets for users with valid plans
*/

-- Add active column to diets table
ALTER TABLE diets
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Create function to check plan expiry
CREATE OR REPLACE FUNCTION check_plan_expiry()
RETURNS trigger AS $$
BEGIN
  -- Check if user's plan has expired
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.user_id
    AND plan_expiry IS NOT NULL
    AND plan_expiry < CURRENT_TIMESTAMP
  ) THEN
    -- If plan has expired, mark diet as inactive
    NEW.active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check plan expiry on diet access
DROP TRIGGER IF EXISTS check_plan_expiry_trigger ON diets;
CREATE TRIGGER check_plan_expiry_trigger
  BEFORE INSERT OR UPDATE ON diets
  FOR EACH ROW
  EXECUTE FUNCTION check_plan_expiry();

-- Update existing diets based on plan expiry
UPDATE diets d
SET active = false
FROM users u
WHERE d.user_id = u.id
AND u.plan_expiry IS NOT NULL
AND u.plan_expiry < CURRENT_TIMESTAMP;