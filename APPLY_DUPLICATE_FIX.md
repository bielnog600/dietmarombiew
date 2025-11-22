# 🔧 Fix para Dietas Duplicadas

## ❌ O Problema

O sistema está criando **múltiplas dietas para o mesmo usuário e mesmo dia da semana**, causando:

1. Meals são salvas em diet IDs antigos/órfãos
2. Query busca pelos diet IDs corretos (mais recentes)
3. Resultado: 0 meals encontradas (estão nos IDs antigos)

## ✅ A Solução

Execute o SQL `fix-duplicate-diets.sql` no Supabase SQL Editor:

### Passo a Passo:

1. Abra o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `fix-duplicate-diets.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter`

### O que o SQL faz:

1. **Deleta dietas duplicadas** - Mantém apenas a mais recente por (user_id, day_of_week)
2. **Adiciona constraint UNIQUE** - Previne duplicatas futuras
3. **Preserva dados** - Usa ORDER BY created_at DESC para manter a dieta mais recente

## 🧪 Verificação

Após executar, verifique se funcionou:

```sql
-- Deve retornar exatamente 7 dietas por usuário (uma por dia da semana)
SELECT user_id, day_of_week, COUNT(*) as diet_count
FROM diets
GROUP BY user_id, day_of_week
HAVING COUNT(*) > 1;

-- Deve retornar 0 linhas (nenhuma duplicata)
```

## ⚠️ IMPORTANTE

Após aplicar o SQL, **recarregue a aplicação** (F5) e teste novamente o modo Manual!
