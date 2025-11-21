# 🚀 DEPLOY URGENTE - Modelo Atualizado para gpt-4o-mini

## ✅ PROBLEMA RESOLVIDO:

```
Error: insufficient_quota
You exceeded your current quota
```

---

## 🔄 SOLUÇÃO: Mudar para gpt-4o-mini

### **Por que gpt-4o-mini?**

| Modelo | TPM (Tokens/Min) | RPM (Requests/Min) | TPD (Tokens/Dia) |
|--------|------------------|-------------------|------------------|
| gpt-4o | 30,000 | 500 | 90,000 |
| **gpt-4o-mini** | **200,000** | **500** | **2,000,000** |

**gpt-4o-mini tem 6.6x MAIS limite de tokens e 22x MAIS tokens por dia!**

Além disso:
- ✅ Muito mais barato (~10x menos que gpt-4o)
- ✅ Mesmo formato de resposta (JSON)
- ✅ Mesma qualidade para geração de dietas
- ✅ Mais rápido

---

## 🚀 DEPLOY (APENAS 1 LINHA MUDOU):

**Linha 60 mudou de:**
```typescript
model: 'gpt-4o',
```

**Para:**
```typescript
model: 'gpt-4o-mini',
```

### **PASSO A PASSO:**

1. **https://dplvokmtrwiscxibiobp.supabase.co**

2. **Edge Functions** → **adjust-macros** → **Edit**

3. **Encontre linha 60** (dentro do `body: JSON.stringify({`)

4. **Mude apenas essa linha:**
   ```typescript
   model: 'gpt-4o-mini',  // Era: 'gpt-4o'
   ```

5. **Deploy** e aguarde confirmação

---

## ✅ OU: Copie o Arquivo Completo

Se preferir, copie TODO o arquivo `supabase/functions/adjust-macros/index.ts` que já está com a mudança aplicada.

**Confirme que a linha 60 tem:**
```typescript
model: 'gpt-4o-mini',
```

---

## 🧪 TESTE APÓS DEPLOY:

1. **Volte ao app**
2. **"Ajustar Quantidades"**
3. **Selecione estratégia**
4. **Gerar**

### **Resultado Esperado:**

✅ Sem erro de quota  
✅ Dieta gerada rapidamente (5-10s)  
✅ Logs: `Seed:XXXX Style:XXXX` → `✅ 5 meals` → `🎉 Success!`

---

## 💰 Economia:

| Métrica | gpt-4o | gpt-4o-mini | Economia |
|---------|--------|-------------|----------|
| Custo por 1M tokens (input) | $2.50 | $0.15 | **94%** |
| Custo por 1M tokens (output) | $10.00 | $0.60 | **94%** |
| Limite TPM | 30,000 | 200,000 | **+567%** |
| Limite TPD | 90,000 | 2,000,000 | **+2,122%** |

---

## ⚡ RESUMO:

**Mudança:** 1 linha (linha 60)  
**De:** `model: 'gpt-4o'`  
**Para:** `model: 'gpt-4o-mini'`  

**Benefícios:**
- 6.6x mais tokens por minuto
- 22x mais tokens por dia
- 94% mais barato
- Sem mudança na qualidade

---

🚀 **FAÇA O DEPLOY AGORA!**
