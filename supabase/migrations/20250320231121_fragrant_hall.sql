/*
  # Update Foods and Categories

  1. New Categories
    - Breakfast Proteins
    - Breakfast Carbs
    - Healthy Fats
    - Lunch/Dinner Proteins
    - Lunch/Dinner Carbs
    - Vegetables

  2. Changes
    - Clear existing foods and categories
    - Insert new categories
    - Insert new foods with proper nutritional values
    - All portions are standardized to 100g

  3. Security
    - Maintain existing RLS policies
*/

-- First, safely remove existing data
DELETE FROM meal_foods;
DELETE FROM meals;
DELETE FROM diets;
DELETE FROM foods;
DELETE FROM food_categories;

-- Create new categories
INSERT INTO food_categories (id, name) VALUES
  (gen_random_uuid(), 'Café da Manhã - Proteínas'),
  (gen_random_uuid(), 'Café da Manhã - Carboidratos'),
  (gen_random_uuid(), 'Gorduras Saudáveis'),
  (gen_random_uuid(), 'Almoço/Jantar - Proteínas'),
  (gen_random_uuid(), 'Almoço/Jantar - Carboidratos'),
  (gen_random_uuid(), 'Legumes e Verduras');

-- Insert breakfast proteins
INSERT INTO foods (id, category_id, name, calories, protein, carbs, fats, portion, portion_size)
SELECT
  gen_random_uuid(),
  fc.id,
  food_name,
  calories,
  protein,
  carbs,
  fats,
  'gramas',
  100
FROM
  (VALUES
    ('Ovo cozido', 155, 13, 1.1, 11),
    ('Queijo cottage', 98, 11, 3.4, 4.3),
    ('Iogurte grego natural', 59, 10, 3.6, 0.4),
    ('Clara de ovo', 52, 11, 0.7, 0.2)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Café da Manhã - Proteínas' LIMIT 1
) fc;

-- Insert breakfast carbs
INSERT INTO foods (id, category_id, name, calories, protein, carbs, fats, portion, portion_size)
SELECT
  gen_random_uuid(),
  fc.id,
  food_name,
  calories,
  protein,
  carbs,
  fats,
  'gramas',
  100
FROM
  (VALUES
    ('Aveia em flocos', 389, 16, 66, 6.9),
    ('Pão integral', 247, 13, 41, 4),
    ('Banana', 89, 1.1, 23, 0.3),
    ('Morango', 32, 0.7, 7.7, 0.3)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Café da Manhã - Carboidratos' LIMIT 1
) fc;

-- Insert healthy fats
INSERT INTO foods (id, category_id, name, calories, protein, carbs, fats, portion, portion_size)
SELECT
  gen_random_uuid(),
  fc.id,
  food_name,
  calories,
  protein,
  carbs,
  fats,
  'gramas',
  100
FROM
  (VALUES
    ('Abacate', 160, 2, 8.5, 14.7),
    ('Pasta de amendoim', 588, 25, 20, 50),
    ('Castanha-do-pará', 656, 14, 12, 66),
    ('Castanha de caju', 553, 18, 30, 44),
    ('Nozes', 654, 15, 14, 65),
    ('Amêndoas', 579, 21, 22, 49)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Gorduras Saudáveis' LIMIT 1
) fc;

-- Insert lunch/dinner proteins
INSERT INTO foods (id, category_id, name, calories, protein, carbs, fats, portion, portion_size)
SELECT
  gen_random_uuid(),
  fc.id,
  food_name,
  calories,
  protein,
  carbs,
  fats,
  'gramas',
  100
FROM
  (VALUES
    ('Peito de frango grelhado', 165, 31, 0, 3.6),
    ('Carne bovina magra', 143, 26, 0, 3.6),
    ('Filé de tilápia', 96, 20, 0, 1.7),
    ('Salmão grelhado', 208, 20, 0, 13),
    ('Atum em água', 116, 25, 0, 1),
    ('Tofu firme', 144, 15, 3.9, 8)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Almoço/Jantar - Proteínas' LIMIT 1
) fc;

-- Insert lunch/dinner carbs
INSERT INTO foods (id, category_id, name, calories, protein, carbs, fats, portion, portion_size)
SELECT
  gen_random_uuid(),
  fc.id,
  food_name,
  calories,
  protein,
  carbs,
  fats,
  'gramas',
  100
FROM
  (VALUES
    ('Arroz branco', 130, 2.7, 28, 0.3),
    ('Arroz integral', 111, 2.6, 23, 0.9),
    ('Batata-doce', 86, 1.6, 20, 0.1),
    ('Quinoa', 120, 4.1, 21, 1.9),
    ('Macarrão integral', 124, 5, 27, 0.8)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Almoço/Jantar - Carboidratos' LIMIT 1
) fc;

-- Insert vegetables
INSERT INTO foods (id, category_id, name, calories, protein, carbs, fats, portion, portion_size)
SELECT
  gen_random_uuid(),
  fc.id,
  food_name,
  calories,
  protein,
  carbs,
  fats,
  'gramas',
  100
FROM
  (VALUES
    ('Brócolis cozido', 55, 3.7, 11, 0.6),
    ('Tomate', 18, 0.9, 3.9, 0.2),
    ('Espinafre cru', 23, 2.9, 3.6, 0.4),
    ('Cenoura', 41, 0.9, 9.6, 0.2)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Legumes e Verduras' LIMIT 1
) fc;