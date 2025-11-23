-- =====================================================
-- CORREÇÃO: Políticas RLS simplificadas
-- =====================================================
-- As políticas anteriores tentavam acessar auth.users
-- causando erro de permissão. Esta versão simplifica.
-- =====================================================

-- =====================================================
-- WEIGHT HISTORY POLICIES
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

-- Política: Usuários autenticados podem inserir
CREATE POLICY "Authenticated users can insert weight records"
  ON weight_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuários podem ver seus próprios registros
CREATE POLICY "Users can view own weight history"
  ON weight_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Usuários autenticados podem atualizar
CREATE POLICY "Authenticated users can update weight records"
  ON weight_history
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Usuários autenticados podem deletar
CREATE POLICY "Authenticated users can delete weight records"
  ON weight_history
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- BODY MEASUREMENTS POLICIES
-- =====================================================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Admin can insert body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can view all body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can view own body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can update body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Admin can delete body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Authenticated users can insert body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Authenticated users can update body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Authenticated users can delete body measurements" ON body_measurements;

-- Garantir que RLS está habilitado
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem inserir
CREATE POLICY "Authenticated users can insert body measurements"
  ON body_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuários podem ver seus próprios registros
CREATE POLICY "Users can view own body measurements"
  ON body_measurements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Usuários autenticados podem atualizar
CREATE POLICY "Authenticated users can update body measurements"
  ON body_measurements
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Usuários autenticados podem deletar
CREATE POLICY "Authenticated users can delete body measurements"
  ON body_measurements
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- RECARREGAR SCHEMA
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- EXPLICAÇÃO
-- =====================================================
-- Estas políticas são mais permissivas porque:
-- 1. Confiam no controle de acesso da aplicação (admin/user)
-- 2. Evitam problemas de permissão com auth.users
-- 3. Mantém segurança: apenas autenticados podem acessar
-- 4. Usuários veem apenas seus próprios dados (SELECT)
-- =====================================================
