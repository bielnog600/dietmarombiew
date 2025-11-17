/*
  # Add supplements feature
  
  1. Changes
    - Add supplements_enabled column to users table
    - Add new food category for supplements
    - Add supplement foods
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add supplements_enabled column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS supplements_enabled boolean DEFAULT false;

-- Add supplements category if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM food_categories 
    WHERE name = 'Suplementos'
  ) THEN
    INSERT INTO food_categories (name, name_en)
    VALUES ('Suplementos', 'Supplements');
  END IF;
END $$;

-- Add supplement foods
WITH supplements_category AS (
  SELECT id FROM food_categories WHERE name = 'Suplementos' LIMIT 1
)
INSERT INTO foods (
  category_id,
  name,
  name_en,
  calories,
  protein,
  carbs,
  fats,
  portion,
  portion_size
)
SELECT
  supplements_category.id,
  name,
  name_en,
  calories,
  protein,
  carbs,
  fats,
  'gramas',
  portion_size
FROM (
  VALUES
    ('Whey Protein Isolado', 'Isolated Whey Protein', 113, 27, 0.5, 0.3, 30),
    ('Creatina', 'Creatine', 0, 0, 0, 0, 5),
    ('BCAA', 'BCAA', 24, 6, 0, 0, 10),
    ('Glutamina', 'Glutamine', 24, 6, 0, 0, 5),
    ('Caseína', 'Casein Protein', 120, 24, 3, 1, 30),
    ('Albumina', 'Egg White Protein', 380, 80, 4, 0, 100),
    ('Maltodextrina', 'Maltodextrin', 380, 0, 95, 0, 100),
    ('Dextrose', 'Dextrose', 400, 0, 100, 0, 100),
    ('Waxy Maize', 'Waxy Maize', 370, 0, 92, 0, 100),
    ('Proteína da Ervilha', 'Pea Protein', 100, 21, 2, 0.5, 30),
    ('Beta Alanina', 'Beta Alanine', 0, 0, 0, 0, 2),
    ('Proteína Concentrada do Soro', 'Whey Protein Concentrate', 120, 24, 3, 2, 30)
  ) AS t(name, name_en, calories, protein, carbs, fats, portion_size)
CROSS JOIN supplements_category
ON CONFLICT DO NOTHING;