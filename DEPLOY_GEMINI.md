# 🚀 DEPLOY - Mudança OpenAI → Gemini

## ✅ MUDANÇA APLICADA:

De: **OpenAI GPT-4o-mini** (com problemas de quota)  
Para: **Google Gemini 1.5 Flash** (API gratuita fornecida)

---

## 🔑 SUA API KEY (já fornecida):

```
AIzaSyDZVOD6Uv-zkUbz86wBFFJq28XlHaSKOfw
```

---

## 🚀 PASSO 1: Configurar Variável de Ambiente

### **No Supabase Dashboard:**

1. **https://dplvokmtrwiscxibiobp.supabase.co**

2. **Settings** → **Edge Functions** → **Secrets**

3. **Adicionar nova secret:**
   - **Name:** `GEMINI_API_KEY`
   - **Value:** `AIzaSyDZVOD6Uv-zkUbz86wBFFJq28XlHaSKOfw`
   - **Save**

4. **IMPORTANTE:** Você pode REMOVER a antiga `OPENAI_API_KEY` (não é mais necessária)

---

## 🚀 PASSO 2: Deploy da Edge Function

### **Opção 1: Deploy Completo (Recomendado)**

1. **Edge Functions** → **adjust-macros** → **Edit**

2. **Selecione TODO o código** (Ctrl+A) e **Delete**

3. **Copie TODO** o arquivo `supabase/functions/adjust-macros/index.ts` (151 linhas)

4. **Cole** no editor do Supabase

5. **Confirme que tem essas linhas:**
   - Linha 17: `const geminiKey = Deno.env.get('GEMINI_API_KEY');`
   - Linha 19: `if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');`
   - Linha 45: `const geminiResponse = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}\``

6. **Deploy**

---

## 📊 MUDANÇAS PRINCIPAIS:

### **API Endpoint:**
```typescript
// ANTES (OpenAI):
await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${openaiKey}` },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [...]
  })
})

// AGORA (Gemini):
await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
  body: JSON.stringify({
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  })
})
```

### **Response Structure:**
```typescript
// ANTES (OpenAI):
const content = openaiData.choices[0].message.content;

// AGORA (Gemini):
const content = geminiData.candidates[0].content.parts[0].text;
```

---

## ✅ VANTAGENS DO GEMINI:

| Recurso | OpenAI | Gemini 1.5 Flash |
|---------|--------|------------------|
| **Custo** | Pago | **Grátis até 15 RPM** |
| **Quota** | 200k TPM | **1M TPM (grátis)** |
| **Velocidade** | Rápido | **Muito rápido** |
| **Context** | 16k tokens | **1M tokens** |
| **JSON Mode** | ✅ | ✅ |

**Principais benefícios:**
- ✅ API gratuita (até 15 requests/minuto)
- ✅ 1 milhão de tokens por minuto
- ✅ Extremamente rápido (otimizado para latência)
- ✅ Suporte nativo a JSON
- ✅ Sem problemas de quota

---

## 🧪 TESTE APÓS DEPLOY:

1. **Volte ao app**
2. **"Ajustar Quantidades"**
3. **Selecione estratégia**
4. **Gerar**

### **Resultado Esperado:**

```
Seed:1234 Style:equilibrada
✅ 5 meals
🎉 Success!
```

**✅ SEM ERRO DE QUOTA!**

---

## 🔧 TROUBLESHOOTING:

### Se aparecer: `GEMINI_API_KEY not configured`
- Confirme que adicionou a secret no **Edge Functions → Secrets**
- Nome exato: `GEMINI_API_KEY`
- Valor: `AIzaSyDZVOD6Uv-zkUbz86wBFFJq28XlHaSKOfw`

### Se aparecer erro 400:
- Verifique se o código está idêntico ao arquivo local
- Principalmente as linhas 45-62 (chamada da API)

### Se não gerar dietas:
- Veja os logs da edge function
- Console → Edge Functions → adjust-macros → Logs
- Procure por "❌ Error:" ou "✅ 5 meals"

---

## 📝 RESUMO TÉCNICO:

**Mudanças:**
- ✅ OpenAI → Gemini 1.5 Flash
- ✅ `OPENAI_API_KEY` → `GEMINI_API_KEY`
- ✅ Novo endpoint de API
- ✅ Nova estrutura de request/response
- ✅ Mantém mesma lógica de geração
- ✅ Mantém variedade (seed + styles)

**Compatibilidade:**
- ✅ Mesma estrutura JSON de saída
- ✅ Mesmos parâmetros de entrada
- ✅ Mesma lógica de conversão foodName → foodId
- ✅ 100% compatível com frontend

---

## ⚡ CHECKLIST FINAL:

- [ ] Secret `GEMINI_API_KEY` adicionada no Supabase
- [ ] Edge function atualizada com código novo
- [ ] Deploy realizado com sucesso
- [ ] Testado no app
- [ ] Dietas sendo geradas sem erro

---

🚀 **AGORA FAÇA O DEPLOY!**

**Ordem:**
1. Adicionar secret `GEMINI_API_KEY`
2. Deploy da edge function
3. Testar no app

**Resultado:** Sistema funcionando com Gemini gratuitamente! 🎉
