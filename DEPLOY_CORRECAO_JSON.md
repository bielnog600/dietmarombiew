# 🚀 DEPLOY URGENTE: Correção do Erro JSON

## ❌ ERRO ATUAL:

```
Error 500: Expected double-quoted property name in JSON at position 196
```

**Causa:** Parâmetros OpenAI agressivos (penalties 1.5) causavam JSON malformado.

---

## ✅ CORREÇÕES IMPLEMENTADAS:

### 1. Parâmetros OpenAI Balanceados:

```typescript
temperature: 0.9              // Era 1.0 - Criatividade controlada
frequency_penalty: 0.8        // Era 1.5 - Moderado
presence_penalty: 0.8         // Era 1.5 - Moderado
response_format: { type: "json_object" }  // NOVO - Força JSON válido
```

### 2. Parser JSON Robusto:

- Remove markdown (```json```)
- Remove trailing commas
- Remove caracteres de controle
- Escapa backslashes, newlines
- Try/catch com logs detalhados

### 3. Mantém Variedade Máxima:

- ✅ 14 estilos de dieta
- ✅ Random seed dinâmico
- ✅ 150+ alimentos variados
- ✅ Rotação forçada de proteínas/carbos/vegetais

---

## 🚀 COMO FAZER O DEPLOY:

### **PASSO 1: Acesse**
https://dplvokmtrwiscxibiobp.supabase.co

### **PASSO 2: Edge Functions → adjust-macros**

### **PASSO 3: Edit ou Deploy New Version**

### **PASSO 4: COPIE todo o arquivo:**
```
supabase/functions/adjust-macros/index.ts
```

### **PASSO 5: COLE no editor (substitua tudo)**

### **PASSO 6: Deploy**

---

## 🧪 TESTE:

1. Vá em "Dieta Atual"
2. Clique "Ajustar Quantidades"
3. Escolha estratégia
4. ✅ Não deve dar erro 500
5. ✅ Dieta gerada com sucesso
6. ✅ Repita 3x = dietas diferentes

---

## 🔍 LOGS ESPERADOS:

```
🎨 Selected diet style: flexible dieting
🤖 Calling OpenAI...
📄 OpenAI response received
✅ Macros validated successfully!
🎉 Diet plan created successfully!
```

---

🚀 **FAÇA O DEPLOY AGORA!**
