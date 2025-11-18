# Como Deployar a Edge Function para Atualizar Senha

## O que isso faz?
Permite que o admin atualize a senha de qualquer usuário diretamente pelo dashboard, sem precisar enviar email.

## Passo a Passo

### 1. Acesse o Dashboard do Supabase
- Vá para: https://supabase.com/dashboard/project/dplvokmtrwiscxibiobp

### 2. Vá para Edge Functions
- No menu lateral esquerdo, clique em **"Edge Functions"**
- Clique no botão **"Create a new function"** (ou "New Function")

### 3. Configure a função
- **Nome da função**: `update-user-password` (exatamente assim, sem espaços)
- Cole o código abaixo no editor

### 4. Código da Edge Function
```typescript
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdatePasswordRequest {
  userId: string;
  password: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { userId, password }: UpdatePasswordRequest = await req.json();

    if (!userId || !password) {
      return new Response(
        JSON.stringify({ error: 'userId and password are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### 5. Deploy
- Clique no botão **"Deploy"** ou **"Save"**
- Aguarde o deploy finalizar (pode levar alguns segundos)

### 6. Testar
- Após o deploy, volte para sua aplicação
- Tente editar um usuário e mudar a senha
- Agora deve funcionar!

## URL da Função
Após o deploy, a função estará disponível em:
```
https://dplvokmtrwiscxibiobp.supabase.co/functions/v1/update-user-password
```

## Observações
- A aplicação JÁ está configurada para usar essa função automaticamente
- Não precisa adicionar nenhuma variável de ambiente
- Se o deploy não funcionar, verifique se o nome da função está correto: `update-user-password`
