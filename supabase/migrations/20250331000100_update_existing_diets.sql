/*
  # Update Existing Diets with day_of_week

  1. Updates
    - Set day_of_week = 1 (Monday) for all existing diets that have NULL value
    - This ensures all existing diets are accessible after the weekly system implementation

  2. Notes
    - All existing diets will be assigned to Monday by default
    - Admins can create new diets for other days of the week
*/

-- Update existing diets to have day_of_week = 1 (Monday) if NULL
UPDATE diets
SET day_of_week = 1
WHERE day_of_week IS NULL;
