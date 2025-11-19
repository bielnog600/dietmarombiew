# Como Deployar/Atualizar a Edge Function adjust-macros

## O que isso faz?
Usa a OpenAI para ajustar automaticamente as quantidades de alimentos nas refeições e pode ADICIONAR novas refeições se necessário para atingir as macros exatas.

## Passo a Passo

### 1. Acesse o Dashboard do Supabase
- Vá para: https://supabase.com/dashboard/project/dplvokmtrwiscxibiobp

### 2. Vá para Edge Functions
- No menu lateral esquerdo, clique em **"Edge Functions"**

### 3. Encontre a função `adjust-macros`
- Se JÁ EXISTIR: clique nela para editar
- Se NÃO EXISTIR: clique em **"Create a new function"**

### 4. Configure a função
- **Nome da função**: `adjust-macros` (exatamente assim, sem espaços)
- **Substitua TODO o código** pelo código abaixo

### 5. Código da Edge Function ATUALIZADO
Copie TODO o conteúdo do arquivo:
```
/tmp/cc-agent/60285520/project/supabase/functions/adjust-macros/index.ts
```

### 6. Configure a variável OPENAI_API_KEY
- No Supabase Dashboard, vá em **Settings → Edge Functions**
- Adicione uma nova variável de ambiente:
  - **Name**: `OPENAI_API_KEY`
  - **Value**: sua chave da OpenAI (começa com `sk-...`)
- Salve

### 7. Deploy
- Clique no botão **"Deploy"** ou **"Save"**
- Aguarde o deploy finalizar (pode levar 10-30 segundos)

### 8. Verificar Logs
Após deployar e testar, verifique os logs em:
- **Edge Functions → adjust-macros → Logs**

Você verá:
```
Request params: { dietId: '...', userId: '...', strategy: 'cutting', targetCalories: 1400 }
Diet query result: { diet: {...}, error: null }
Found 5 meals
Found 50 foods, error: null
```

### 9. Testar
- Volte para sua aplicação
- Vá em uma dieta
- Clique em **"Ajustar com IA"**
- Aguarde (pode levar 10-20 segundos)
- A IA vai ajustar as quantidades e pode adicionar novas refeições

## Se ainda der erro 500

1. **Verifique os logs** no Supabase Dashboard
2. **Confirme que a OPENAI_API_KEY está configurada**
3. **Verifique se o deploy foi concluído com sucesso**

## URL da Função
```
https://dplvokmtrwiscxibiobp.supabase.co/functions/v1/adjust-macros
```

## Observações
- A aplicação JÁ está configurada para usar essa função
- Não precisa adicionar nenhuma variável de ambiente no frontend
- A função pode adicionar novas refeições automaticamente se necessário
- Use os logs do Supabase para debugar problemas
