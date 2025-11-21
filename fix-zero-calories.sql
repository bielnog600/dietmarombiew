-- Script para verificar e corrigir dietas com 0 calorias

-- 1. Verificar quais dietas têm calorias zeradas
SELECT
  id,
  day_of_week,
  calories,
  user_id,
  created_at
FROM diets
WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112'
  AND calories = 0
ORDER BY day_of_week;

-- 2. Ver TODAS as calorias por dia (diagnóstico completo)
SELECT
  day_of_week,
  calories,
  id as diet_id,
  created_at
FROM diets
WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112'
ORDER BY day_of_week;

-- 3. Corrigir Segunda-feira (day 1) para 1900 calorias
-- Ajuste o valor conforme sua meta para segunda-feira
UPDATE diets
SET calories = 1900
WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112'
  AND day_of_week = 1
  AND calories = 0;

-- 4. Corrigir TODAS as dietas com 0 calorias para 1500 (padrão)
-- ATENÇÃO: Execute este bloco se quiser definir um valor padrão para todas
-- Ajuste 1500 para o valor que você preferir
UPDATE diets
SET calories = 1500
WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112'
  AND calories = 0;

-- 5. Verificar após correção
SELECT
  day_of_week,
  calories,
  id as diet_id
FROM diets
WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112'
ORDER BY day_of_week;

-- 6. Se você quer definir calorias específicas para cada dia (Carb Cycling)
-- Descomente e ajuste os valores conforme sua preferência:

/*
UPDATE diets SET calories = 1700 WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112' AND day_of_week = 0; -- Domingo
UPDATE diets SET calories = 1900 WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112' AND day_of_week = 1; -- Segunda
UPDATE diets SET calories = 1500 WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112' AND day_of_week = 2; -- Terça
UPDATE diets SET calories = 1900 WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112' AND day_of_week = 3; -- Quarta
UPDATE diets SET calories = 1500 WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112' AND day_of_week = 4; -- Quinta
UPDATE diets SET calories = 1900 WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112' AND day_of_week = 5; -- Sexta
UPDATE diets SET calories = 1500 WHERE user_id = '680fc343-5c56-42d0-833e-41547f27d112' AND day_of_week = 6; -- Sábado
*/
