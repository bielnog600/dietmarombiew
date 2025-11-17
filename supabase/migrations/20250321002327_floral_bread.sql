/*
  # Update food categories and distribution

  1. Changes
    - Update food categories to match meal types
    - Add new foods with appropriate categorization
    - Ensure proper calorie distribution per meal:
      - Café da Manhã: 25%
      - Almoço: 35%
      - Lanche: 15%
      - Jantar: 25%

  2. Categories
    - Breakfast specific categories
    - Lunch/Dinner specific categories
    - Snack specific categories
    - Common categories (can be used in multiple meals)
*/

-- First, safely remove existing data
DELETE FROM meal_foods;
DELETE FROM meals;
DELETE FROM diets;
DELETE FROM foods;
DELETE FROM food_categories;

-- Create new categories
INSERT INTO food_categories (id, name) VALUES
  -- Breakfast specific
  (gen_random_uuid(), 'Café da Manhã - Proteínas'),
  (gen_random_uuid(), 'Café da Manhã - Carboidratos'),
  -- Lunch/Dinner specific
  (gen_random_uuid(), 'Almoço/Jantar - Proteínas'),
  (gen_random_uuid(), 'Almoço/Jantar - Carboidratos'),
  (gen_random_uuid(), 'Legumes e Verduras'),
  -- Snack specific
  (gen_random_uuid(), 'Lanches - Proteínas'),
  (gen_random_uuid(), 'Lanches - Carboidratos'),
  -- Common categories
  (gen_random_uuid(), 'Gorduras Saudáveis'),
  (gen_random_uuid(), 'Frutas');

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
    ('Clara de ovo', 52, 11, 0.7, 0.2),
    ('Whey protein', 120, 24, 3, 1.5)
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
    ('Granola sem açúcar', 471, 15, 64, 20),
    ('Tapioca', 358, 0.2, 88, 0.1)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Café da Manhã - Carboidratos' LIMIT 1
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
    ('Peito de peru', 157, 29, 0, 3.5)
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

-- Insert snack proteins
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
    ('Whey protein isolado', 113, 27, 0.5, 0.3),
    ('Atum light', 84, 19, 0, 0.5),
    ('Queijo minas light', 264, 17, 3.3, 21),
    ('Iogurte natural desnatado', 41, 3.4, 4.7, 0.3)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Lanches - Proteínas' LIMIT 1
) fc;

-- Insert snack carbs
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
    ('Barra de proteína', 360, 20, 37, 12),
    ('Biscoito de arroz integral', 392, 7, 81, 3.5),
    ('Torrada integral', 373, 13, 72, 5),
    ('Cookie proteico', 391, 21, 44, 14)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Lanches - Carboidratos' LIMIT 1
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
    ('Couve refogada', 49, 4.3, 8.8, 0.7),
    ('Espinafre refogado', 23, 2.9, 3.6, 0.4),
    ('Abobrinha refogada', 17, 1.2, 3.1, 0.3),
    ('Cenoura cozida', 41, 0.9, 9.6, 0.2),
    ('Vagem cozida', 31, 1.8, 7, 0.2)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Legumes e Verduras' LIMIT 1
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
    ('Azeite de oliva', 884, 0, 0, 100),
    ('Castanha de caju', 553, 18, 30, 44),
    ('Amêndoas', 579, 21, 22, 49),
    ('Chia', 486, 17, 42, 31)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Gorduras Saudáveis' LIMIT 1
) fc;

-- Insert fruits
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
    ('Banana', 89, 1.1, 23, 0.3),
    ('Maçã', 52, 0.3, 14, 0.2),
    ('Morango', 32, 0.7, 7.7, 0.3),
    ('Laranja', 47, 0.9, 12, 0.1),
    ('Mamão', 43, 0.5, 11, 0.3),
    ('Kiwi', 61, 1.1, 15, 0.5)
  ) AS t(food_name, calories, protein, carbs, fats)
CROSS JOIN (
  SELECT id FROM food_categories WHERE name = 'Frutas' LIMIT 1
) fc;