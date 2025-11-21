# Deploy da Edge Function Corrigida

## Problema
A edge function `adjust-macros` no Supabase ainda está usando código antigo sem o parser JSON robusto.

## Solução
A edge function local em `supabase/functions/adjust-macros/index.ts` já está atualizada com:
- Função `tryParseJSON` que tenta 6 estratégias diferentes de correção
- Melhor tratamento de JSON malformado da IA
- Logs detalhados para debug

## Como fazer o deploy

### Opção 1: Via Supabase CLI (Recomendado)
```bash
# Se você tem o Supabase CLI instalado
supabase functions deploy adjust-macros
```

### Opção 2: Via Dashboard do Supabase
1. Acesse: https://supabase.com/dashboard/project/dplvokmtrwiscxibiobp/functions
2. Clique em "adjust-macros"
3. Clique em "Edit function"
4. Copie todo o conteúdo de `supabase/functions/adjust-macros/index.ts`
5. Cole no editor
6. Clique em "Deploy"

### Opção 3: Via API do Supabase
Use a ferramenta MCP do Supabase se disponível no seu ambiente.

## Verificação
Depois do deploy, teste novamente a seleção manual. O erro de JSON parsing não deve mais ocorrer.

## O que mudou
```typescript
// ANTES: Parse simples com correção básica
rawText = rawText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
const dietPlan = JSON.parse(rawText);

// DEPOIS: Múltiplas estratégias de correção
const tryParseJSON = (text: string): any => {
  const strategies = [
    (t: string) => JSON.parse(t),
    (t: string) => JSON.parse(t.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')),
    (t: string) => JSON.parse(t.replace(/}\s*{/g, '},{').replace(/]\s*\[/g, '],[')),
    // ... mais 3 estratégias
  ];

  for (const strategy of strategies) {
    try {
      return strategy(text);
    } catch (e) {
      continue;
    }
  }
  throw lastError;
};

const dietPlan = tryParseJSON(rawText);
```
