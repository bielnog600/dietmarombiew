# 🔄 Atualização da Edge Function: Ajustar Quantidades com Variedade

## 📋 O que foi modificado:

A edge function `adjust-macros` foi atualizada com as seguintes melhorias:

### ✨ Novidades:

1. **Variedade Máxima**: Temperature aumentada para 0.95 (máxima criatividade)
2. **Seed Dinâmico**: Usa `randomSeed + Date.now()` para garantir resultados únicos
3. **Novos Alimentos**: OpenAI pode sugerir e registrar alimentos que não existem no banco
4. **Estratégias de Variação**: Instruções claras para alternar proteínas, carbos e vegetais
5. **Detecção de Alimentos Repetidos**: Evita alimentos muito usados nos outros dias

### 🆕 Sistema de Novos Alimentos:

O OpenAI agora pode sugerir novos alimentos usando:
```json
{
  "meals": [...],
  "newFoods": [
    {
      "name": "Salmão grelhado",
      "protein": 25.0,
      "carbs": 0.0,
      "fats": 12.0,
      "calories": 206,
      "portion_size": 100,
      "category": "Proteína"
    }
  ]
}
```

Nas meals, usa: `"foodId": "NEW_Salmão grelhado"`

A função automaticamente:
1. Verifica se o alimento já existe no banco
2. Se não existir, cria com os valores informados (sempre 100g)
3. Substitui as referências temporárias `NEW_` pelos IDs reais
4. Adiciona à tabela `foods` vinculado ao usuário

### 📊 Estratégia de Variação:

**Rotação de Proteínas:**
- Segunda: Frango
- Terça: Carne moída
- Quarta: Salmão
- Quinta: Tilápia
- Sexta: Picanha magra
- Sábado: Atum
- Domingo: Peru

**Rotação de Carboidratos:**
- Arroz branco → Batata doce → Aveia → Macarrão integral → repeat

**Rotação de Vegetais:**
- Brócolis → Couve-flor → Cenoura → Abobrinha → Aspargos → repeat

---

## 🚀 Como Fazer o Deploy:

### Opção 1: Via Dashboard Supabase (Recomendado)

1. **Acesse o Supabase Dashboard:**
   - URL: https://dplvokmtrwiscxibiobp.supabase.co
   - Vá em **Edge Functions** no menu lateral

2. **Selecione a função `adjust-macros`**

3. **Clique em "Deploy New Version"** ou "Edit"

4. **Cole o código atualizado:**
   - Copie todo o conteúdo de `supabase/functions/adjust-macros/index.ts`
   - Cole no editor

5. **Clique em "Deploy"**

6. **Aguarde a confirmação** ✅

### Opção 2: Via Supabase CLI (se instalado)

```bash
# Na raiz do projeto
supabase functions deploy adjust-macros
```

---

## ✅ Como Testar:

1. **Acesse a aplicação**

2. **Vá em "Dieta Atual" → "Ajustar Quantidades"**

3. **Escolha uma estratégia** (Cutting ou Bulking)

4. **Execute 3-4 vezes seguidas** e observe:
   - ✅ Cada dieta deve ser DIFERENTE
   - ✅ Proteínas devem variar (frango → carne → peixe)
   - ✅ Carboidratos devem variar (arroz → batata → massa)
   - ✅ Novos alimentos podem aparecer
   - ✅ Alimentos repetidos da semana devem ser evitados

5. **Verifique a tabela `foods`**
   - Novos alimentos sugeridos pelo OpenAI devem aparecer
   - Sempre com portion_size = 100g
   - Valores nutricionais corretos

---

## 📝 Logs para Debug:

A função agora loga:
```
🆕 Processing 2 new foods suggested by AI...
  ✅ Created new food: Salmão grelhado (ID: xyz)
     → 25g P, 0g C, 12g F (206 kcal)
  🔄 Replaced NEW_Salmão grelhado with new ID xyz
```

---

## 🔍 Verificação de Sucesso:

Após o deploy, você deve ver:
1. ✅ Dietas variadas a cada geração
2. ✅ Novos alimentos sendo criados automaticamente
3. ✅ Menos repetição de alimentos entre os dias
4. ✅ Macros continuam precisos (±10g)
5. ✅ Quantities realistas (não muito pequenas, não exageradas)

---

## 🚨 Troubleshooting:

**Se continuar gerando dietas iguais:**
1. Verifique se o deploy foi feito corretamente
2. Confira os logs da edge function no Dashboard
3. Confirme que a temperature está em 0.95
4. Verifique se o seed está usando `Date.now()`

**Se novos alimentos não aparecem:**
1. Verifique permissões RLS na tabela `foods`
2. Confirme que `user_id` está sendo passado corretamente
3. Veja os logs para erros de inserção

---

## 📊 Melhorias Implementadas:

| Antes | Depois |
|-------|--------|
| Sempre mesma dieta | Dietas únicas a cada geração |
| Temperatura 0.8 | Temperatura 0.95 (máxima) |
| Seed estático | Seed dinâmico (random + timestamp) |
| Só alimentos do banco | Pode sugerir e criar novos |
| Sem detecção de repetição | Evita alimentos repetidos da semana |
| Instruções genéricas | Estratégias específicas de rotação |

---

🎯 **Objetivo Alcançado:** Sistema agora gera dietas variadas, criativas e nunca repetitivas!
