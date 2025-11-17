/*
  # Food Database Schema Update

  1. Tables Modified
    - Recreate `food_categories` and `foods` tables
    - Preserve relationships with `meal_foods` table
    
  2. Data
    - Insert food categories
    - Insert food items with nutritional information
    
  3. Security
    - Enable RLS
    - Add read policies for authenticated users
*/

-- Drop existing tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS foods CASCADE;
DROP TABLE IF EXISTS food_categories CASCADE;

-- Create food categories table
CREATE TABLE food_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for food_categories
ALTER TABLE food_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for food_categories
CREATE POLICY "Anyone can read food categories"
  ON food_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Create foods table
CREATE TABLE foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES food_categories(id),
  name text NOT NULL,
  calories integer NOT NULL,
  protein numeric(5,2) NOT NULL,
  carbs numeric(5,2) NOT NULL,
  fats numeric(5,2) NOT NULL,
  portion text NOT NULL,
  portion_size integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for foods
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

-- Create policy for foods
CREATE POLICY "Anyone can read foods"
  ON foods
  FOR SELECT
  TO authenticated
  USING (true);

-- Recreate foreign key constraint for meal_foods if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'meal_foods'
  ) THEN
    ALTER TABLE meal_foods
    ADD CONSTRAINT meal_foods_food_id_fkey
    FOREIGN KEY (food_id) REFERENCES foods(id);
  END IF;
END $$;

-- Insert food categories and foods
DO $$
DECLARE
  protein_id uuid;
  carbs_id uuid;
  fats_id uuid;
  veggies_id uuid;
BEGIN
  -- Insert categories and get their IDs
  INSERT INTO food_categories (name) VALUES ('Proteínas') RETURNING id INTO protein_id;
  INSERT INTO food_categories (name) VALUES ('Carboidratos') RETURNING id INTO carbs_id;
  INSERT INTO food_categories (name) VALUES ('Gorduras Saudáveis') RETURNING id INTO fats_id;
  INSERT INTO food_categories (name) VALUES ('Verduras e Legumes') RETURNING id INTO veggies_id;

  -- Insert proteins
  INSERT INTO foods (category_id, name, calories, protein, carbs, fats, portion, portion_size) VALUES
    (protein_id, 'Peito de frango', 165, 31, 0, 3.6, '100g', 100),
    (protein_id, 'Carne bovina (patinho)', 143, 26, 0, 3.6, '100g', 100),
    (protein_id, 'Ovo cozido', 155, 13, 1.1, 11, '100g', 100),
    (protein_id, 'Atum em lata', 116, 25, 0, 1, '100g', 100),
    (protein_id, 'Salmão', 208, 20, 0, 13, '100g', 100),
    (protein_id, 'Queijo cottage', 98, 11, 3.4, 4.3, '100g', 100);

  -- Insert carbs
  INSERT INTO foods (category_id, name, calories, protein, carbs, fats, portion, portion_size) VALUES
    (carbs_id, 'Arroz branco cozido', 130, 2.7, 28, 0.3, '100g', 100),
    (carbs_id, 'Arroz integral cozido', 111, 2.6, 23, 0.9, '100g', 100),
    (carbs_id, 'Batata doce cozida', 86, 1.6, 20, 0.1, '100g', 100),
    (carbs_id, 'Macarrão integral cozido', 124, 5, 27, 0.8, '100g', 100),
    (carbs_id, 'Aveia em flocos', 389, 16, 66, 6.9, '100g', 100),
    (carbs_id, 'Pão integral', 247, 13, 41, 4, '100g', 100),
    (carbs_id, 'Banana', 89, 1.1, 23, 0.3, '100g', 100);

  -- Insert healthy fats
  INSERT INTO foods (category_id, name, calories, protein, carbs, fats, portion, portion_size) VALUES
    (fats_id, 'Abacate', 160, 2, 8.5, 14.7, '100g', 100),
    (fats_id, 'Azeite de oliva', 884, 0, 0, 100, '100g', 100),
    (fats_id, 'Castanha-do-pará', 656, 14, 12, 66, '100g', 100),
    (fats_id, 'Amêndoas', 579, 21, 22, 49, '100g', 100),
    (fats_id, 'Pasta de amendoim', 588, 25, 20, 50, '100g', 100);

  -- Insert vegetables
  INSERT INTO foods (category_id, name, calories, protein, carbs, fats, portion, portion_size) VALUES
    (veggies_id, 'Brócolis cozido', 55, 3.7, 11, 0.6, '100g', 100),
    (veggies_id, 'Espinafre cru', 23, 2.9, 3.6, 0.4, '100g', 100),
    (veggies_id, 'Tomate', 18, 0.9, 3.9, 0.2, '100g', 100),
    (veggies_id, 'Cenoura', 41, 0.9, 9.6, 0.2, '100g', 100);
END $$;