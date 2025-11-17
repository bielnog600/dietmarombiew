/*
  # Add English names to foods table
  
  1. Changes
    - Add name_en column to foods table
    - Update existing foods with English translations
    - Add name_en to food categories
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add English name columns
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS name_en text;

ALTER TABLE food_categories
ADD COLUMN IF NOT EXISTS name_en text;

-- Update food categories with English names
UPDATE food_categories SET name_en = 'Breakfast - Proteins' WHERE name = 'Café da Manhã - Proteínas';
UPDATE food_categories SET name_en = 'Breakfast - Carbohydrates' WHERE name = 'Café da Manhã - Carboidratos';
UPDATE food_categories SET name_en = 'Lunch/Dinner - Proteins' WHERE name = 'Almoço/Jantar - Proteínas';
UPDATE food_categories SET name_en = 'Lunch/Dinner - Carbohydrates' WHERE name = 'Almoço/Jantar - Carboidratos';
UPDATE food_categories SET name_en = 'Vegetables and Greens' WHERE name = 'Legumes e Verduras';
UPDATE food_categories SET name_en = 'Snacks - Proteins' WHERE name = 'Lanches - Proteínas';
UPDATE food_categories SET name_en = 'Snacks - Carbohydrates' WHERE name = 'Lanches - Carboidratos';
UPDATE food_categories SET name_en = 'Healthy Fats' WHERE name = 'Gorduras Saudáveis';
UPDATE food_categories SET name_en = 'Fruits' WHERE name = 'Frutas';

-- Update foods with English names
UPDATE foods SET name_en = 'Boiled Egg' WHERE name = 'Ovo cozido';
UPDATE foods SET name_en = 'Cottage Cheese' WHERE name = 'Queijo cottage';
UPDATE foods SET name_en = 'Natural Greek Yogurt' WHERE name = 'Iogurte grego natural';
UPDATE foods SET name_en = 'Egg White' WHERE name = 'Clara de ovo';
UPDATE foods SET name_en = 'Whey Protein' WHERE name = 'Whey protein';

UPDATE foods SET name_en = 'Oat Flakes' WHERE name = 'Aveia em flocos';
UPDATE foods SET name_en = 'Whole Grain Bread' WHERE name = 'Pão integral';
UPDATE foods SET name_en = 'Sugar-free Granola' WHERE name = 'Granola sem açúcar';
UPDATE foods SET name_en = 'Tapioca' WHERE name = 'Tapioca';

UPDATE foods SET name_en = 'Grilled Chicken Breast' WHERE name = 'Peito de frango grelhado';
UPDATE foods SET name_en = 'Lean Beef' WHERE name = 'Carne bovina magra';
UPDATE foods SET name_en = 'Tilapia Fillet' WHERE name = 'Filé de tilápia';
UPDATE foods SET name_en = 'Grilled Salmon' WHERE name = 'Salmão grelhado';
UPDATE foods SET name_en = 'Canned Tuna in Water' WHERE name = 'Atum em água';
UPDATE foods SET name_en = 'Turkey Breast' WHERE name = 'Peito de peru';

UPDATE foods SET name_en = 'White Rice' WHERE name = 'Arroz branco';
UPDATE foods SET name_en = 'Brown Rice' WHERE name = 'Arroz integral';
UPDATE foods SET name_en = 'Sweet Potato' WHERE name = 'Batata-doce';
UPDATE foods SET name_en = 'Quinoa' WHERE name = 'Quinoa';
UPDATE foods SET name_en = 'Whole Grain Pasta' WHERE name = 'Macarrão integral';

UPDATE foods SET name_en = 'Isolated Whey Protein' WHERE name = 'Whey protein isolado';
UPDATE foods SET name_en = 'Light Tuna' WHERE name = 'Atum light';
UPDATE foods SET name_en = 'Light White Cheese' WHERE name = 'Queijo minas light';
UPDATE foods SET name_en = 'Fat-free Natural Yogurt' WHERE name = 'Iogurte natural desnatado';

UPDATE foods SET name_en = 'Protein Bar' WHERE name = 'Barra de proteína';
UPDATE foods SET name_en = 'Brown Rice Crackers' WHERE name = 'Biscoito de arroz integral';
UPDATE foods SET name_en = 'Whole Grain Toast' WHERE name = 'Torrada integral';
UPDATE foods SET name_en = 'Protein Cookie' WHERE name = 'Cookie proteico';

UPDATE foods SET name_en = 'Cooked Broccoli' WHERE name = 'Brócolis cozido';
UPDATE foods SET name_en = 'Sautéed Kale' WHERE name = 'Couve refogada';
UPDATE foods SET name_en = 'Sautéed Spinach' WHERE name = 'Espinafre refogado';
UPDATE foods SET name_en = 'Sautéed Zucchini' WHERE name = 'Abobrinha refogada';
UPDATE foods SET name_en = 'Cooked Carrot' WHERE name = 'Cenoura cozida';
UPDATE foods SET name_en = 'Cooked Green Beans' WHERE name = 'Vagem cozida';

UPDATE foods SET name_en = 'Avocado' WHERE name = 'Abacate';
UPDATE foods SET name_en = 'Peanut Butter' WHERE name = 'Pasta de amendoim';
UPDATE foods SET name_en = 'Olive Oil' WHERE name = 'Azeite de oliva';
UPDATE foods SET name_en = 'Cashew Nuts' WHERE name = 'Castanha de caju';
UPDATE foods SET name_en = 'Almonds' WHERE name = 'Amêndoas';
UPDATE foods SET name_en = 'Chia Seeds' WHERE name = 'Chia';

UPDATE foods SET name_en = 'Banana' WHERE name = 'Banana';
UPDATE foods SET name_en = 'Apple' WHERE name = 'Maçã';
UPDATE foods SET name_en = 'Strawberry' WHERE name = 'Morango';
UPDATE foods SET name_en = 'Orange' WHERE name = 'Laranja';
UPDATE foods SET name_en = 'Papaya' WHERE name = 'Mamão';
UPDATE foods SET name_en = 'Kiwi' WHERE name = 'Kiwi';