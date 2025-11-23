-- =====================================================
-- DIAGNÓSTICO: Verificar dados em weight_history
-- =====================================================
-- Execute este SQL para entender o problema
-- =====================================================

-- 1. Verificar todos os registros em weight_history
SELECT
  id,
  user_id,
  weight,
  created_at,
  recorded_by,
  notes
FROM weight_history
ORDER BY created_at DESC;

-- 2. Verificar se user_id corresponde a um usuário real
SELECT
  wh.id,
  wh.user_id,
  wh.weight,
  u.id as auth_user_id,
  u.email
FROM weight_history wh
LEFT JOIN auth.users u ON wh.user_id = u.id
ORDER BY wh.created_at DESC;

-- 3. Verificar quais políticas estão ativas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'weight_history';

-- =====================================================
-- NOTA: Após ver os resultados, vamos corrigir
-- =====================================================
