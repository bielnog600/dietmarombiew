-- Script para limpar meals duplicadas/órfãs
-- Execute no Supabase SQL Editor

-- 1. Ver quantas meals existem para cada dieta (diagnóstico)
SELECT
  d.id as diet_id,
  d.day_of_week,
  d.user_id,
  COUNT(m.id) as meal_count
FROM diets d
LEFT JOIN meals m ON m.diet_id = d.id
WHERE d.user_id = '680fc343-5c56-42d0-833e-41547f27d112'
GROUP BY d.id, d.day_of_week, d.user_id
ORDER BY d.day_of_week;

-- 2. Ver todas as meals com seus IDs (diagnóstico detalhado)
SELECT
  d.day_of_week,
  d.id as diet_id,
  m.id as meal_id,
  m.name as meal_name,
  m.created_at
FROM diets d
LEFT JOIN meals m ON m.diet_id = d.id
WHERE d.user_id = '680fc343-5c56-42d0-833e-41547f27d112'
ORDER BY d.day_of_week, m.created_at DESC;

-- 3. LIMPAR TODAS AS MEALS (execute este bloco sozinho depois de ver os diagnósticos)
-- ATENÇÃO: Isso vai deletar TODAS as meals das suas dietas!
-- Depois você pode usar o botão Manual ou IA Automático para criar novas

DO $$
DECLARE
  meal_id_to_delete UUID;
BEGIN
  -- Para cada meal das dietas do usuário
  FOR meal_id_to_delete IN
    SELECT m.id
    FROM meals m
    INNER JOIN diets d ON m.diet_id = d.id
    WHERE d.user_id = '680fc343-5c56-42d0-833e-41547f27d112'
  LOOP
    -- Deletar meal_foods primeiro (foreign key)
    DELETE FROM meal_foods WHERE meal_id = meal_id_to_delete;

    -- Deletar meal
    DELETE FROM meals WHERE id = meal_id_to_delete;

    RAISE NOTICE 'Deleted meal %', meal_id_to_delete;
  END LOOP;

  RAISE NOTICE 'Cleanup completed!';
END $$;

-- 4. Verificar meals órfãs (sem dieta associada)
SELECT
  m.id as orphaned_meal_id,
  m.name,
  m.diet_id,
  m.created_at
FROM meals m
LEFT JOIN diets d ON m.diet_id = d.id
WHERE d.id IS NULL;

-- 5. Deletar meals órfãs (se houver)
DELETE FROM meal_foods
WHERE meal_id IN (
  SELECT m.id
  FROM meals m
  LEFT JOIN diets d ON m.diet_id = d.id
  WHERE d.id IS NULL
);

DELETE FROM meals
WHERE id IN (
  SELECT m.id
  FROM meals m
  LEFT JOIN diets d ON m.diet_id = d.id
  WHERE d.id IS NULL
);

-- 6. Verificar que está tudo limpo (após executar os blocos)
SELECT
  d.day_of_week,
  COUNT(m.id) as meal_count
FROM diets d
LEFT JOIN meals m ON m.diet_id = d.id
WHERE d.user_id = '680fc343-5c56-42d0-833e-41547f27d112'
GROUP BY d.day_of_week
ORDER BY d.day_of_week;
