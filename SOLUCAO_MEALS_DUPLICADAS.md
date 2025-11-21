# Solução: Meals Duplicadas

## 🎯 Problema Identificado

A Edge Function está funcionando **CORRETAMENTE**! Ela deleta 4 meals e cria 4 novas meals.

**MAS** você tem **6 meals** no banco porque existem **2 meals antigas** que não pertencem ao `diet_id` atual!

### Evidências nos logs:

**Edge Function (funcionando corretamente):**
```
📊 Found 4 existing meals to delete
🗑️ Deleting meal_foods for 4 meals...
🗑️ Deleting 4 meals...
✅ Deleted 4 meals and their foods
📝 Inserting 4 meals...
```

**Frontend (após refresh):**
```
Day 0: 6 meals, 12 foods  ❌ (deveria ser 4 meals)
```

### Por que isso acontece?

A Edge Function faz:
```sql
DELETE FROM meals WHERE diet_id = 'adb3c585-4aea-4cbc-afef-c17bcad03391'
```

Mas você tem meals de OUTROS `diet_id`s (provavelmente de testes anteriores ou dietas antigas) que não são deletadas!

## 🔧 Solução

Execute o arquivo `cleanup-orphaned-meals.sql` no **Supabase SQL Editor**:

### Passo 1: Diagnóstico
Execute os blocos 1 e 2 para ver quantas meals duplicadas você tem:

```sql
-- Bloco 1: Ver contagem por dieta
SELECT d.id, d.day_of_week, COUNT(m.id) as meal_count...

-- Bloco 2: Ver detalhes de todas as meals
SELECT d.day_of_week, m.id, m.name, m.created_at...
```

Você vai ver algo como:
```
Domingo (day 0): 6 meals  ❌
Segunda (day 1): 6 meals  ❌
```

### Passo 2: Limpar

Execute o **Bloco 3** para deletar TODAS as meals:
```sql
DO $$
DECLARE
  meal_id_to_delete UUID;
BEGIN
  ...
END $$;
```

### Passo 3: Verificar

Execute o **Bloco 6** para confirmar que está limpo:
```sql
SELECT d.day_of_week, COUNT(m.id) as meal_count...
```

Você deve ver:
```
Domingo (day 0): 0 meals  ✅
Segunda (day 1): 0 meals  ✅
...
```

### Passo 4: Recriar

Agora use o botão **Manual** ou **IA Automático** no app para criar novas dietas limpas!

## 🎉 Resultado Esperado

Após limpar e recriar:
- ✅ Edge Function deleta 0 meals (porque não tem nenhuma)
- ✅ Edge Function cria 4 meals
- ✅ Frontend mostra 4 meals
- ✅ Tudo funcionando perfeitamente!

## 🔍 Como isso aconteceu?

Provavelmente durante os testes você:
1. Criou dietas com um `diet_id`
2. Depois as dietas foram recriadas com OUTRO `diet_id`
3. As meals antigas ficaram "órfãs" no banco
4. A Edge Function só deleta meals do `diet_id` atual
5. As meals órfãs permanecem e somam com as novas

## ⚠️ Prevenção

A partir de agora, a Edge Function vai funcionar corretamente porque:
- Ela sempre deleta TODAS as meals do `diet_id` atual antes de criar novas
- Não haverá mais meals órfãs
- Cada dia terá exatamente 4 ou 5 meals (dependendo do que você selecionar)

## 📊 Sobre Segunda-feira com 0 calorias

Esse é outro problema que vou corrigir. Você também notou:
```
day 1: targetCalories: 0  ❌
```

Isso acontece porque a dieta de Segunda-feira está com `calories: 0` no banco. Vou criar uma query para verificar e corrigir isso também!
