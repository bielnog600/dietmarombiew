-- =====================================================
-- CORREÇÃO: Políticas RLS mais permissivas temporariamente
-- =====================================================
-- Vamos permitir que todos vejam todos os registros
-- temporariamente para diagnosticar o problema
-- =====================================================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Admin can insert weight records" ON weight_history;
DROP POLICY IF EXISTS "Admin can view all weight records" ON weight_history;
DROP POLICY IF EXISTS "Users can view own weight history" ON weight_history;
DROP POLICY IF EXISTS "Admin can update weight records" ON weight_history;
DROP POLICY IF EXISTS "Admin can delete weight records" ON weight_history;
DROP POLICY IF EXISTS "Authenticated users can insert weight records" ON weight_history;
DROP POLICY IF EXISTS "Authenticated users can update weight records" ON weight_history;
DROP POLICY IF EXISTS "Authenticated users can delete weight records" ON weight_history;

-- Garantir que RLS está habilitado
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- TEMPORÁRIO: Políticas super permissivas para debug
CREATE POLICY "Allow all authenticated SELECT"
  ON weight_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated INSERT"
  ON weight_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated UPDATE"
  ON weight_history
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated DELETE"
  ON weight_history
  FOR DELETE
  TO authenticated
  USING (true);

-- Fazer o mesmo para body_measurements
DROP POLICY IF EXISTS "Admin can insert body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can view all body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can view own body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can update body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can delete body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Authenticated users can insert body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Authenticated users can update body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Authenticated users can delete body measurements" ON body_measurements;

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated SELECT"
  ON body_measurements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated INSERT"
  ON body_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated UPDATE"
  ON body_measurements
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated DELETE"
  ON body_measurements
  FOR DELETE
  TO authenticated
  USING (true);

-- Recarregar schema
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- EXPLICAÇÃO
-- =====================================================
-- Estas políticas permitem que qualquer usuário autenticado
-- veja TODOS os registros. Use temporariamente para debug.
-- Depois de confirmar que funciona, podemos restringir.
-- =====================================================
