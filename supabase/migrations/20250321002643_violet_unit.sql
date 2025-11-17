/*
  # Check and fix food category duplicates
  
  1. Changes
    - Create a temporary table to identify duplicates
    - Keep only one instance of each category name
    - Add a unique constraint on the name column
    
  2. Security
    - Ensure data integrity during the deduplication process
    - Maintain existing RLS policies
*/

-- First, create a temporary table to store unique categories
CREATE TEMP TABLE unique_categories AS
WITH ranked_categories AS (
  SELECT 
    id,
    name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM food_categories
)
SELECT id, name, created_at
FROM ranked_categories
WHERE rn = 1;

-- Update foods to point to the correct category IDs
UPDATE foods f
SET category_id = uc.id
FROM food_categories fc
JOIN unique_categories uc ON fc.name = uc.name
WHERE f.category_id = fc.id
AND fc.id != uc.id;

-- Delete duplicate categories
DELETE FROM food_categories
WHERE id NOT IN (SELECT id FROM unique_categories);

-- Add unique constraint on name
ALTER TABLE food_categories
DROP CONSTRAINT IF EXISTS food_categories_name_key;

ALTER TABLE food_categories
ADD CONSTRAINT food_categories_name_key UNIQUE (name);

-- Drop temporary table
DROP TABLE unique_categories;