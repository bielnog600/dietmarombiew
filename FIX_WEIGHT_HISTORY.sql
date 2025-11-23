-- =====================================================
-- CORREÇÃO: Adicionar coluna 'notes' à tabela existente
-- =====================================================
-- Se a tabela weight_history já existe sem a coluna notes,
-- este script adiciona a coluna
-- =====================================================

-- Verificar se a tabela existe e adicionar a coluna notes se não existir
DO $$
BEGIN
    -- Adicionar coluna notes se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'weight_history'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE weight_history ADD COLUMN notes text DEFAULT '';
        RAISE NOTICE 'Coluna notes adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna notes já existe';
    END IF;

    -- Adicionar coluna recorded_by se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'weight_history'
        AND column_name = 'recorded_by'
    ) THEN
        -- Primeiro, vamos adicionar a coluna como nullable
        ALTER TABLE weight_history ADD COLUMN recorded_by uuid REFERENCES auth.users(id);

        -- Atualizar registros existentes com o user_id (assumindo que foi o próprio usuário que registrou)
        UPDATE weight_history SET recorded_by = user_id WHERE recorded_by IS NULL;

        -- Agora tornar NOT NULL
        ALTER TABLE weight_history ALTER COLUMN recorded_by SET NOT NULL;

        RAISE NOTICE 'Coluna recorded_by adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna recorded_by já existe';
    END IF;
END $$;

-- Recriar as políticas RLS (caso necessário)
DROP POLICY IF EXISTS "Admin can insert weight records" ON weight_history;
DROP POLICY IF EXISTS "Admin can view all weight records" ON weight_history;
DROP POLICY IF EXISTS "Users can view own weight history" ON weight_history;
DROP POLICY IF EXISTS "Admin can update weight records" ON weight_history;
DROP POLICY IF EXISTS "Admin can delete weight records" ON weight_history;

-- Garantir que RLS está habilitado
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- Admin can insert weight records for any user
CREATE POLICY "Admin can insert weight records"
  ON weight_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admin can view all weight records
CREATE POLICY "Admin can view all weight records"
  ON weight_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can view their own weight history
CREATE POLICY "Users can view own weight history"
  ON weight_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can update weight records
CREATE POLICY "Admin can update weight records"
  ON weight_history
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admin can delete weight records
CREATE POLICY "Admin can delete weight records"
  ON weight_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS weight_history_user_id_idx ON weight_history(user_id);
CREATE INDEX IF NOT EXISTS weight_history_created_at_idx ON weight_history(created_at DESC);
CREATE INDEX IF NOT EXISTS weight_history_user_date_idx ON weight_history(user_id, created_at DESC);

-- =====================================================
-- IMPORTANTE: Atualizar o cache do schema
-- =====================================================
-- Execute este comando para forçar o Supabase a recarregar o schema:
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute esta query para verificar se as colunas existem:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'weight_history'
-- ORDER BY ordinal_position;
-- =====================================================
