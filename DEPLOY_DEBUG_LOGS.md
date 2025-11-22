# Deploy Edge Function com Verificação Imediata

## ⚠️ Problema Identificado

Edge Function retorna `{success: true, meals: 4}` mas quando você faz refresh **0 meals** aparecem!

Isso significa que as meals estão sendo criadas mas:
- ❌ Não estão sendo salvas no banco (RLS ou permissões)
- ❌ Estão sendo revertidas (transação implícita)
- ❌ Estão sendo deletadas logo depois

## 🔍 O Que Foi Adicionado

Verificação IMEDIATA após inserir as meals para ver se elas realmente foram salvas:

```typescript
console.log(`✅ All meals processed for diet ${dietId}`);

// Verificar imediatamente se as meals foram salvas
const { data: verifyMeals, error: verifyError } = await supabase
  .from('meals')
  .select('id, name')
  .eq('diet_id', dietId);

if (verifyError) {
  console.error('❌ Error verifying meals:', verifyError);
} else {
  console.log(`🔍 Verification: ${verifyMeals?.length || 0} meals found in database for diet ${dietId}`);
  if (verifyMeals && verifyMeals.length > 0) {
    verifyMeals.forEach((m: any) => console.log(`  ✓ ${m.name} (${m.id})`));
  } else {
    console.error('⚠️ WARNING: No meals found after insertion!');
  }
}
```

## 📝 Como Fazer Deploy

### Via Supabase Dashboard (Recomendado)

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Edge Functions**
4. Clique em **adjust-macros**
5. Clique em **Edit** ou **Deploy New Version**
6. Cole TODO o conteúdo de `supabase/functions/adjust-macros/index.ts`
7. Clique em **Deploy**

### Via Supabase CLI

```bash
supabase functions deploy adjust-macros
```

## 🧪 Como Testar

1. Faça deploy da edge function atualizada
2. No app, limpe as meals antigas (se houver):
   - Execute `cleanup-orphaned-meals.sql` no SQL Editor
3. Use o modo **Manual** para criar uma dieta
4. **IMPORTANTE:** Abra os logs da Edge Function no dashboard:
   - Supabase Dashboard > Edge Functions > adjust-macros > **Logs** (aba)
5. Procure pelas linhas de verificação

## 🎯 Resultados Possíveis

### ✅ Cenário 1: Meals ESTÃO sendo salvas
```
✅ All meals processed for diet 130895fb...
🔍 Verification: 4 meals found in database for diet 130895fb...
  ✓ Café da Manhã (uuid-1)
  ✓ Lanche da Manhã (uuid-2)
  ✓ Almoço (uuid-3)
  ✓ Jantar (uuid-4)
```

**Conclusão:** As meals estão sendo salvas! O problema é no REFRESH do frontend.
**Solução:** Já foi corrigido no ViewDietModal.tsx (delay de 2s + logs detalhados)

### ❌ Cenário 2: Meals NÃO estão sendo salvas
```
✅ All meals processed for diet 130895fb...
🔍 Verification: 0 meals found in database for diet 130895fb...
⚠️ WARNING: No meals found after insertion!
```

**Conclusão:** As meals NÃO estão sendo salvas! Problema de RLS ou transação.
**Solução:** Precisamos investigar as políticas RLS ou usar transaction explícita.

### ⚠️ Cenário 3: Erro na verificação
```
✅ All meals processed for diet 130895fb...
❌ Error verifying meals: {error details}
```

**Conclusão:** Erro de permissão ou query.
**Solução:** Verificar as políticas RLS de leitura.

## 🔧 Próximos Passos

Após fazer deploy e testar:

1. **Copie os logs da Edge Function** do Supabase Dashboard (especialmente as linhas com 🔍)
2. **Copie os logs do Frontend** (especialmente após o refresh com ⏰ e 📦)
3. Me envie AMBOS os logs

Com esses logs vou saber EXATAMENTE onde está o problema:
- Se as meals estão sendo salvas → problema é no refresh
- Se as meals NÃO estão sendo salvas → problema é RLS ou transação

## 📋 Checklist

- [ ] Fez deploy da edge function atualizada
- [ ] Limpou meals antigas com `cleanup-orphaned-meals.sql`
- [ ] Testou o modo Manual
- [ ] Copiou logs da Edge Function (Dashboard > Edge Functions > adjust-macros > Logs)
- [ ] Copiou logs do Frontend (Console do navegador)
- [ ] Enviou AMBOS os logs para análise

Vamos resolver isso de uma vez! 🎉
