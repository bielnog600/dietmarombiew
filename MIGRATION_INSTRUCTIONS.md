# Instruções para Aplicar a Migração do Sistema Semanal

## Problema Atual
O erro `column diets.day_of_week does not exist` indica que a migração do banco de dados ainda não foi aplicada.

## Solução: Aplicar a Migração Manualmente

### Passo 1: Acessar o Supabase SQL Editor
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar o Script de Migração
1. Abra o arquivo `apply_migration_manually.sql` (na raiz do projeto)
2. Copie todo o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique no botão **Run** (ou pressione Ctrl+Enter)

### Passo 3: Verificar se Funcionou
Você verá mensagens como:
- `Column day_of_week added successfully`
- `UPDATE X` (onde X é o número de dietas atualizadas)

### Passo 4: Recarregar a Aplicação
1. Volte para a aplicação
2. Pressione **Ctrl+Shift+R** (ou Cmd+Shift+R no Mac) para recarregar completamente
3. Faça login novamente se necessário

## O Que Esta Migração Faz?

1. **Adiciona a coluna `day_of_week`** na tabela `diets`
   - Permite que cada usuário tenha uma dieta diferente para cada dia da semana
   - Valores: 0 (Domingo) até 6 (Sábado)

2. **Atualiza dietas existentes**
   - Define `day_of_week = 1` (Segunda-feira) para todas as dietas existentes
   - Garante compatibilidade com dietas já criadas

3. **Cria índice**
   - Melhora a performance das consultas por usuário e dia da semana

## Como Usar Após a Migração

### Para Admins:
- Ao criar uma dieta, selecione o dia da semana desejado
- Crie dietas diferentes para cada dia (Segunda a Domingo)

### Para Clientes:
- Verão automaticamente a dieta do dia atual
- Podem navegar entre os dias usando as setas ← →
- O card de calorias mostra a diferença entre meta e consumo atual

## Precisa de Ajuda?

Se encontrar algum erro durante a migração, verifique:
1. Se você tem permissões de admin no Supabase
2. Se está no projeto correto
3. Se a tabela `diets` existe no banco de dados
