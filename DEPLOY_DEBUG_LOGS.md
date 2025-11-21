# Deploy Edge Function com Logs de Debug

## O que foi alterado

Adicionei logs detalhados na edge function `adjust-macros` para debug do processo de deleção de meals:

```typescript
// Antes de deletar
console.log(`🗑️ Checking for existing meals in diet ${dietId}...`);
console.log(`📊 Found ${existingMeals?.length || 0} existing meals to delete`);

// Durante a deleção
console.log(`🗑️ Deleting meal_foods for ${mealIds.length} meals...`);
console.log(`🗑️ Deleting ${mealIds.length} meals...`);
console.log(`✅ Deleted ${mealIds.length} meals and their foods`);
```

## Como fazer o deploy

### Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Edge Functions** no menu lateral
4. Clique na function **adjust-macros**
5. Clique em **Edit Function**
6. Cole o código do arquivo: `supabase/functions/adjust-macros/index.ts`
7. Clique em **Deploy**

### Via Supabase CLI (se tiver configurado)

```bash
supabase functions deploy adjust-macros
```

## O que esperar após o deploy

Quando você testar novamente o fluxo Manual, verá nos logs:

```
🗑️ Checking for existing meals in diet xxx...
📊 Found 6 existing meals to delete
🗑️ Deleting meal_foods for 6 meals...
🗑️ Deleting 6 meals...
✅ Deleted 6 meals and their foods
📝 Inserting 4 meals...
```

Isso nos dirá exatamente:
- ✅ Quantas meals existiam antes
- ✅ Se a deleção funcionou
- ✅ Quantas meals novas foram inseridas
- ✅ Se há erros na deleção

## Próximos passos após o deploy

1. **Teste o fluxo Manual** novamente
2. **Copie TODOS os logs** do console (incluindo os da edge function)
3. **Envie os logs** para análise
4. Com os novos logs, poderei identificar exatamente onde está o problema!
