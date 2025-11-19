import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { dietId, strategy, targetCalories, targetProtein, targetCarbs, targetFats, userId } = body;

    console.log('🎯 Request params:', { dietId, userId, strategy, targetCalories, targetProtein, targetCarbs, targetFats });

    if (!dietId || !userId) {
      throw new Error('Missing required parameters: dietId or userId');
    }

    const { data: diet, error: dietError } = await supabase
      .from('diets')
      .select('id, user_id')
      .eq('id', dietId)
      .maybeSingle();

    if (dietError || !diet) {
      throw new Error('Diet not found');
    }

    const { data: allFoods, error: foodsError } = await supabase
      .from('foods')
      .select('id, name, protein, carbs, fats, calories, portion_size')
      .order('name');

    if (foodsError || !allFoods || allFoods.length === 0) {
      throw new Error('No foods found in database');
    }

    // 🔍 Buscar as dietas da semana atual para evitar repetições
    const { data: currentWeekDiet } = await supabase
      .from('diets')
      .select(`
        id,
        day_of_week,
        meals (
          id,
          name,
          diet_foods (
            food_id,
            foods (
              name
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_weekly', true)
      .neq('id', dietId);

    console.log('📅 Found existing diets in week:', currentWeekDiet?.length || 0);

    // Extrair os alimentos já usados nas outras dietas da semana
    const usedFoodsInWeek: string[] = [];
    if (currentWeekDiet && currentWeekDiet.length > 0) {
      currentWeekDiet.forEach((d: any) => {
        d.meals?.forEach((meal: any) => {
          meal.diet_foods?.forEach((df: any) => {
            if (df.foods?.name) {
              usedFoodsInWeek.push(df.foods.name);
            }
          });
        });
      });
    }

    // Contar frequência de uso de cada alimento
    const foodFrequency: Record<string, number> = {};
    usedFoodsInWeek.forEach(food => {
      foodFrequency[food] = (foodFrequency[food] || 0) + 1;
    });

    // Criar lista de alimentos frequentemente usados (aparecem 2+ vezes)
    const overusedFoods = Object.entries(foodFrequency)
      .filter(([_, count]) => count >= 2)
      .map(([food, _]) => food);

    console.log('🚫 Overused foods to avoid:', overusedFoods.length > 0 ? overusedFoods : 'None');
    console.log('📊 Food frequency:', foodFrequency);

    console.log(`📦 Found ${allFoods.length} foods available`);

    const foodsList = allFoods.map(f =>
      `• ${f.name}: ${f.protein}g P, ${f.carbs}g C, ${f.fats}g G (${f.calories} kcal) por ${f.portion_size}g [ID: ${f.id}]`
    ).join('\n');

    const distributionsCutting = [
      { name: 'Café da manhã', kcalPct: 0.20, pPct: 0.30, cPct: 0.20, fPct: 0.19 },
      { name: 'Pré-treino', kcalPct: 0.19, pPct: 0.15, cPct: 0.25, fPct: 0.11 },
      { name: 'Pós-treino', kcalPct: 0.25, pPct: 0.25, cPct: 0.35, fPct: 0.08 },
      { name: 'Jantar', kcalPct: 0.21, pPct: 0.20, cPct: 0.15, fPct: 0.26 },
      { name: 'Ceia', kcalPct: 0.15, pPct: 0.10, cPct: 0.05, fPct: 0.36 }
    ];

    const distributionsBulking = [
      { name: 'Café da manhã', kcalPct: 0.20, pPct: 0.25, cPct: 0.20, fPct: 0.20 },
      { name: 'Lanche Manhã', kcalPct: 0.15, pPct: 0.15, cPct: 0.15, fPct: 0.15 },
      { name: 'Pré-treino', kcalPct: 0.19, pPct: 0.20, cPct: 0.25, fPct: 0.15 },
      { name: 'Pós-treino', kcalPct: 0.25, pPct: 0.25, cPct: 0.30, fPct: 0.15 },
      { name: 'Jantar', kcalPct: 0.21, pPct: 0.15, cPct: 0.10, fPct: 0.35 }
    ];

    const baseDistributions = strategy === 'cutting' ? distributionsCutting : distributionsBulking;

    const mealPlans = baseDistributions.map(dist => ({
      name: dist.name,
      targetKcal: Math.round(targetCalories * dist.kcalPct),
      targetProtein: Math.round(targetProtein * dist.pPct),
      targetCarbs: Math.round(targetCarbs * dist.cPct),
      targetFats: Math.round(targetFats * dist.fPct)
    }));

    const mealPlansText = mealPlans.map((meal, idx) =>
      `${idx + 1}. ${meal.name}: ${meal.targetKcal} kcal | ${meal.targetProtein}g P | ${meal.targetCarbs}g C | ${meal.targetFats}g G`
    ).join('\n');

    // Gerar um número aleatório para variar as dietas
    const randomSeed = Math.floor(Math.random() * 1000);
    const dietStyles = ['equilibrada', 'low carb', 'flexível', 'moderada em carbs', 'rica em proteína'];
    const selectedStyle = dietStyles[randomSeed % dietStyles.length];

    console.log(`🎨 Selected diet style: ${selectedStyle}`);

    // Instruções específicas por estilo de dieta
    const styleInstructions: Record<string, string> = {
      'equilibrada': '⚖️ Distribua os macros de forma balanceada em todas as refeições. Use variedade de fontes.',
      'low carb': '🥑 PRIORIZE gorduras boas e proteínas. REDUZA carboidratos (use apenas 50-70% dos carbs em vegetais, evite massas/arroz). Aumente abacate, azeite, castanhas.',
      'flexível': '🎯 Misture TODAS as fontes disponíveis: carnes variadas, peixes, ovos, grãos, tubérculos. Seja MUITO criativo!',
      'moderada em carbs': '🌾 Use carboidratos em 60-80% do planejado, focando em pré e pós-treino. Aumente levemente as gorduras.',
      'rica em proteína': '💪 MAXIMIZE proteínas em TODAS as refeições. Use ovos, carnes, peixes, iogurte. Carbs moderados, gorduras baixas.'
    };

    const styleInstruction = styleInstructions[selectedStyle] || styleInstructions['equilibrada'];

    // Criar aviso sobre alimentos já usados
    let overusedWarning = '';
    if (overusedFoods.length > 0) {
      overusedWarning = `
🚫 ATENÇÃO: ALIMENTOS JÁ MUITO USADOS NOS OUTROS DIAS DA SEMANA:
${overusedFoods.map(f => `   ❌ ${f}`).join('\n')}

⚠️ EVITE usar estes alimentos! Eles já aparecem em outras dietas da semana.
✅ PRIORIZE alimentos DIFERENTES para criar VARIEDADE na semana!
`;
    }

    const usedFoodsInfo = usedFoodsInWeek.length > 0
      ? `\n📋 ALIMENTOS JÁ USADOS EM OUTROS DIAS: ${[...new Set(usedFoodsInWeek)].join(', ')}`
      : '\n✨ PRIMEIRA DIETA DA SEMANA - Seja criativo!';

    const prompt = `Você é um NUTRICIONISTA PROFISSIONAL criando um plano alimentar completo, VARIADO e CRIATIVO.

🎯 META DIÁRIA TOTAL OBRIGATÓRIA (${strategy.toUpperCase()}):
- Calorias: ${targetCalories} kcal → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Proteína: ${targetProtein}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Carboidratos: ${targetCarbs}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Gorduras: ${targetFats}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!

⚠️ ATENÇÃO: Estes valores são TOTAIS do dia todo, não por refeição!

🎨 ESTILO DA DIETA: "${selectedStyle.toUpperCase()}"
${styleInstruction}

🔄 SEJA CRIATIVO E VARIE: Cada dieta deve ser DIFERENTE! Use combinações variadas de alimentos.
📊 Random Seed: ${randomSeed} - Use este número para garantir VARIAÇÃO ÚNICA!
${usedFoodsInfo}
${overusedWarning}

📋 DISTRIBUIÇÃO SUGERIDA POR REFEIÇÃO (FLEXÍVEL - ajuste conforme o estilo):
${mealPlansText}

🥗 BANCO DE ALIMENTOS DISPONÍVEIS:
${foodsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ INSTRUÇÕES CRÍTICAS PARA CRIAR O PLANO ALIMENTAR:

1. REFEIÇÕES REALISTAS, COERENTES E VARIADAS:

   🎨 SEJA CRIATIVO! Use diferentes combinações a cada dieta:

   ✓ CAFÉ DA MANHÃ - Varie entre estas opções:
     OPÇÃO A: Ovos + Aveia + Banana
     OPÇÃO B: Iogurte + Granola + Frutas
     OPÇÃO C: Omelete + Pão integral + Abacate
     OPÇÃO D: Panqueca de aveia + Pasta amendoim + Frutas vermelhas
     OPÇÃO E: Ovos mexidos + Batata doce + Castanhas

   ✓ PRÉ-TREINO - Varie entre:
     OPÇÃO A: Banana + Pasta amendoim
     OPÇÃO B: Pão integral + Geleia
     OPÇÃO C: Batata doce + Mel
     OPÇÃO D: Aveia + Frutas
     OPÇÃO E: Tapioca + Queijo branco

   ✓ PÓS-TREINO - Varie entre:
     OPÇÃO A: Frango + Arroz + Brócolis
     OPÇÃO B: Atum + Batata doce + Salada
     OPÇÃO C: Carne moída + Macarrão integral + Tomate
     OPÇÃO D: Salmão + Arroz integral + Aspargos
     OPÇÃO E: Peito peru + Batata inglesa + Cenoura

   ✓ JANTAR - Varie entre:
     OPÇÃO A: Frango grelhado + Legumes + Azeite
     OPÇÃO B: Carne vermelha + Salada + Abacate
     OPÇÃO C: Peixe + Quinoa + Vegetais
     OPÇÃO D: Ovos + Batata doce + Espinafre
     OPÇÃO E: Salmão + Arroz basmati + Brócolis

   ✓ CEIA - Varie entre:
     OPÇÃO A: Queijo cottage + Castanhas
     OPÇÃO B: Iogurte grego + Amêndoas
     OPÇÃO C: Ovos cozidos + Abacate
     OPÇÃO D: Atum + Azeite + Tomate
     OPÇÃO E: Whey protein + Pasta amendoim

   💡 DICA IMPORTANTE: Escolha DIFERENTES opções a cada dieta gerada!

2. REGRAS CRÍTICAS PARA VARIAR AS DIETAS (OBRIGATÓRIO):
   ✅ CADA DIA DA SEMANA DEVE TER DIETA COMPLETAMENTE DIFERENTE
   ✅ Se há alimentos listados como "JÁ USADOS", EVITE-OS ao máximo
   ✅ Escolha proteínas DIFERENTES para cada dia (Segunda: frango, Terça: carne, Quarta: peixe, etc)
   ✅ Varie os carboidratos (Segunda: arroz, Terça: batata doce, Quarta: macarrão, etc)
   ✅ Se for LOW CARB: reduza arroz, massas, pães. Aumente gorduras boas (abacate, azeite, castanhas)
   ✅ Se for FLEXÍVEL: misture TODAS as fontes disponíveis - seja MUITO criativo
   ✅ Se for RICA EM PROTEÍNA: maximize carnes, ovos, peixes. Varie as fontes a cada dia
   ✅ NUNCA gere a mesma combinação duas vezes - use o Random Seed para criar PADRÕES ÚNICOS
   ✅ Pense: "Esta dieta é DIFERENTE das outras da semana?" - Se não, MUDE!

3. ERROS QUE VOCÊ DEVE EVITAR:
   ❌ NÃO gere sempre a mesma dieta
   ❌ NÃO misture frango com aveia no café da manhã
   ❌ NÃO coloque iogurte no jantar
   ❌ NÃO use arroz no café da manhã
   ❌ NÃO exagere nas quantidades (máximo 200g de proteína por refeição)
   ❌ NÃO repita os mesmos alimentos em todas as refeições

3. CÁLCULO MATEMÁTICO PRECISO DE QUANTIDADES:
   ⚠️ ATENÇÃO: quantity é o MULTIPLICADOR da porção, não gramas!

   🧮 FÓRMULA: Para cada alimento, calcule:

   quantity = (gramas_desejadas) / (portion_size)

   Depois calcule os macros resultantes:
   - Proteína = (protein × quantity)
   - Carboidratos = (carbs × quantity)
   - Gorduras = (fats × quantity)
   - Calorias = (calories × quantity)

   📊 EXEMPLO REAL:
   Peito de frango: 31g P, 0g C, 3.6g G (165 kcal) por 100g
   Se preciso de 42g de proteína:
   → quantity = 42 / 31 = 1.35
   → Resultado: 1.35 × 31 = 41.85g P ✓
   → Calorias: 1.35 × 165 = 222 kcal

   ⚠️ QUANTIDADES REALISTAS E PRÁTICAS (PENSE COMO NUTRICIONISTA):

   🍗 PROTEÍNAS (portions mínimas e máximas realistas):
   - Frango, Carne, Peixe: quantity entre 1.0 e 2.5 (100g a 250g)
   - Ovos: quantity entre 2.0 e 4.0 (200g a 400g = 3-6 ovos)
   - Atum em lata: quantity entre 0.8 e 2.0 (80g a 200g)
   - Iogurte: quantity entre 1.5 e 2.5 (150g a 250g)
   - Queijo cottage: quantity entre 1.0 e 2.0 (100g a 200g)

   🍚 CARBOIDRATOS (portions mínimas e máximas realistas):
   - Arroz, Macarrão: quantity entre 0.5 e 2.0 (50g a 200g cru)
   - Batata doce/inglesa: quantity entre 1.5 e 3.0 (150g a 300g)
   - Aveia: quantity entre 0.5 e 1.0 (50g a 100g)
   - Pão integral: quantity entre 0.5 e 1.5 (50g a 150g)
   - Banana: quantity entre 1.0 e 2.0 (100g a 200g = 1-2 bananas médias)
   - Frutas em geral: quantity entre 1.0 e 2.5 (100g a 250g)

   🥑 GORDURAS (portions mínimas e máximas realistas):
   - Azeite: quantity entre 0.1 e 0.3 (10ml a 30ml = 1-2 colheres)
   - Pasta de amendoim: quantity entre 0.2 e 0.5 (20g a 50g = 1-2 colheres)
   - Castanhas, Amêndoas: quantity entre 0.2 e 0.5 (20g a 50g = 1 punhado)
   - Abacate: quantity entre 0.5 e 1.5 (50g a 150g = meio a 1 abacate)

   🥦 VEGETAIS (portions mínimas e máximas realistas):
   - Brócolis, Couve-flor, Cenoura: quantity entre 1.0 e 2.5 (100g a 250g)
   - Saladas verdes: quantity entre 0.5 e 2.0 (50g a 200g)
   - Tomate: quantity entre 1.0 e 2.0 (100g a 200g)

   ❌ NUNCA USE QUANTIDADES ABSURDAS:
   - ❌ ERRADO: 0.1 de banana (10g) → Use no mínimo 1.0 (100g = 1 banana)
   - ❌ ERRADO: 0.05 de pasta de amendoim (5g) → Use no mínimo 0.2 (20g = 1 colher)
   - ❌ ERRADO: 0.2 de frango (20g) → Use no mínimo 1.0 (100g)
   - ❌ ERRADO: 5.0 de arroz (500g cru) → Use no máximo 2.0 (200g cru)

   ✅ PENSE SEMPRE: "Esta quantidade faz sentido na vida real?"

   📋 EXEMPLOS DE REFEIÇÕES REALISTAS:

   ✅ CORRETO - Café da manhã realista:
   - Ovos: quantity 3.0 (300g = 5 ovos grandes)
   - Aveia: quantity 0.6 (60g = 6 colheres)
   - Banana: quantity 1.0 (100g = 1 banana média)
   → Faz sentido! ✓

   ✅ CORRETO - Pós-treino realista:
   - Frango: quantity 1.5 (150g)
   - Arroz: quantity 1.0 (100g cru = 300g cozido)
   - Brócolis: quantity 1.5 (150g)
   → Faz sentido! ✓

   ❌ ERRADO - Refeição absurda:
   - Frango: quantity 0.3 (30g) → Muito pouco!
   - Banana: quantity 0.2 (20g) → Isso é 1/5 de banana!
   - Pasta amendoim: quantity 0.03 (3g) → Impossível medir!
   → Não faz sentido! ✗

   🎯 REGRA DE OURO: Se você não conseguiria medir/comer essa quantidade na vida real, NÃO USE!

4. VALIDAÇÃO MATEMÁTICA OBRIGATÓRIA:
   ⚠️ ANTES DE RESPONDER, CALCULE A SOMA TOTAL DE TODOS OS ALIMENTOS DE TODAS AS REFEIÇÕES:

   📊 EXEMPLO DE CÁLCULO CORRETO:

   Café da manhã:
   • Ovo (13g P, 1.1g C, 11g G por 100g) × quantity 3.0 = 39g P, 3.3g C, 33g G
   • Aveia (16g P, 66g C, 6.9g G por 100g) × quantity 0.8 = 12.8g P, 52.8g C, 5.5g G
   • Banana (1.1g P, 23g C, 0.3g G por 100g) × quantity 1.0 = 1.1g P, 23g C, 0.3g G
   Subtotal: 52.9g P, 79.1g C, 38.8g G

   ... (repita para todas as refeições)

   SOMA TOTAL = 52.9g P + [pré-treino] + [pós-treino] + [jantar] + [ceia]

   ✅ REGRAS CRÍTICAS - A SOMA FINAL DEVE SER:
   • Proteína: entre ${targetProtein - 8}g e ${targetProtein + 8}g (meta: ${targetProtein}g)
   • Carboidratos: entre ${targetCarbs - 8}g e ${targetCarbs + 8}g (meta: ${targetCarbs}g)
   • Gorduras: entre ${targetFats - 8}g e ${targetFats + 8}g (meta: ${targetFats}g)
   • Calorias: entre ${targetCalories - 50} e ${targetCalories + 50} kcal (meta: ${targetCalories} kcal)

   ⚠️ SE A SOMA NÃO BATER: Aumente as quantities proporcionalmente até atingir a meta!

   Exemplo: Se chegou em 133g P mas a meta é 178g:
   → Falta 45g P (178 - 133)
   → Adicione mais alimentos proteicos ou aumente quantities existentes

5. ESTRUTURA DO JSON (sem markdown):
{
  "meals": [
    {
      "name": "Café da manhã",
      "foods": [
        { "foodId": "uuid-do-ovo", "quantity": 2.0 },
        { "foodId": "uuid-da-aveia", "quantity": 0.5 },
        { "foodId": "uuid-da-banana", "quantity": 1.0 }
      ]
    },
    {
      "name": "Pré-treino",
      "foods": [
        { "foodId": "uuid-da-banana", "quantity": 1.5 },
        { "foodId": "uuid-da-pasta-amendoim", "quantity": 0.2 }
      ]
    }
  ]
}

⚡ PRIORIDADE MÁXIMA:
1. Criar refeições COERENTES e REALISTAS (café da manhã com alimentos de café)
2. CALCULAR matematicamente as quantities para bater os macros EXATOS
3. VALIDAR: Some todos os macros antes de responder
4. NÃO EXCEDER os limites de quantity por tipo de alimento
5. A soma total DEVE estar dentro das margens: ±3g para macros, ±20 kcal

📋 PASSO A PASSO OBRIGATÓRIO:
1. Monte as refeições com alimentos coerentes
2. Distribua os macros entre as refeições usando a tabela sugerida
3. Calcule quantity para cada alimento: quantity = (gramas_necessárias) / (portion_size)
4. SOME todos os macros de TODAS as refeições
5. COMPARE com a meta: ${targetProtein}g P, ${targetCarbs}g C, ${targetFats}g F
6. Se estiver ABAIXO da meta: AUMENTE as quantities ou adicione mais alimentos
7. Se estiver ACIMA da meta: REDUZA as quantities
8. Repita até a soma bater na meta (±3g)
9. Só responda quando: Soma Total ≈ Meta Total

🚨 EXEMPLO DO QUE DEU ERRADO ANTES:
Meta: 178g P, 266g C, 66g F
Sua resposta: 133g P, 147g C, 48g F ❌ ERRADO!
Faltou: 45g P, 119g C, 18g F

Você PRECISA adicionar mais alimentos ou aumentar as quantities até somar 178g P, 266g C, 66g F!

RESPONDA APENAS COM O JSON, SEM MARKDOWN, SEM EXPLICAÇÕES!`;

    console.log('🤖 Calling OpenAI with retry logic...');

    let result: any;
    let attempts = 0;
    const maxAttempts = 5;
    const messages = [
      {
        role: 'system',
        content: `Você é um nutricionista expert e CRIATIVO em cálculos de macronutrientes.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com JSON válido, sem markdown, sem explicações
2. Calcule EXATAMENTE as quantities para atingir os macros especificados
3. SEJA CRIATIVO E VARIADO - cada dieta deve ser ÚNICA e DIFERENTE
4. Use o estilo da dieta informado para guiar suas escolhas
5. NUNCA repita as mesmas combinações de alimentos
6. Varie as fontes de proteína, carboidrato e gordura em cada refeição
7. Adapte conforme o estilo: low carb, flexível, rica em proteína, etc.

⚠️ QUANTIDADES REALISTAS (CRÍTICO):
8. NUNCA use quantities absurdas (ex: 0.1 de banana, 0.03 de pasta amendoim)
9. Banana: mínimo 1.0 (1 banana), Pasta amendoim: mínimo 0.2 (1 colher)
10. Frango/Carne: mínimo 1.0 (100g), Ovos: mínimo 2.0 (3-4 ovos)
11. PENSE: "Eu conseguiria medir/comer isso na vida real?" Se não, AJUSTE!
12. Priorize quantities que façam sentido prático e nutricional

Timestamp: ${Date.now()} - Use este número para garantir variação!`
      },
      { role: 'user', content: prompt }
    ];

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Attempt ${attempts}/${maxAttempts}...`);

      let openaiResponse;
      let retryAfter = 0;

      // Retry logic for rate limits
      for (let retryCount = 0; retryCount < 3; retryCount++) {
        if (retryAfter > 0) {
          console.log(`⏳ Rate limit hit. Waiting ${retryAfter}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        }

        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + openaiKey,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: messages,
            temperature: 0.8, // Aumentado para mais criatividade e variação
            max_tokens: 3000,
            seed: randomSeed, // Garantir diferentes resultados
          }),
        });

        if (openaiResponse.status === 429) {
          const errorData = await openaiResponse.json();
          console.warn('⚠️ Rate limit reached:', errorData);

          // Extract wait time from error message (e.g., "Please try again in 7.94s")
          const waitMatch = errorData.error?.message?.match(/try again in ([\d.]+)s/);
          retryAfter = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) + 1 : 10;

          if (retryCount < 2) {
            continue; // Retry
          }
        }

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          throw new Error(`OpenAI API error: ${openaiResponse.statusText} - ${errorText}`);
        }

        break; // Success
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0].message.content.trim();

      console.log('📄 OpenAI response received');

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ No JSON found in response, retrying...');
        continue;
      }

      result = JSON.parse(jsonMatch[0]);

      if (!result.meals || !Array.isArray(result.meals)) {
        console.warn('⚠️ Invalid structure, retrying...');
        continue;
      }

      console.log(`🍽️ Validating ${result.meals.length} meals...`);

      // Validar quantities realistas
      let hasUnrealisticQuantities = false;
      for (const meal of result.meals) {
        for (const food of meal.foods || []) {
          const foodData = allFoods.find(f => f.id === food.foodId);
          if (foodData && food.quantity < 0.1) {
            console.warn(`⚠️ Unrealistic quantity: ${foodData.name} = ${food.quantity} (too small!)`);
            hasUnrealisticQuantities = true;
          }
          // Validações específicas por tipo de alimento
          if (foodData) {
            const name = foodData.name.toLowerCase();
            if ((name.includes('frango') || name.includes('carne') || name.includes('peixe')) && food.quantity < 0.8) {
              console.warn(`⚠️ ${foodData.name}: quantity ${food.quantity} muito pequena (mínimo 0.8)`);
              hasUnrealisticQuantities = true;
            }
            if ((name.includes('banana') || name.includes('maçã')) && food.quantity < 0.8) {
              console.warn(`⚠️ ${foodData.name}: quantity ${food.quantity} muito pequena (mínimo 0.8 = 1 fruta)`);
              hasUnrealisticQuantities = true;
            }
            if (name.includes('pasta') && food.quantity < 0.15) {
              console.warn(`⚠️ ${foodData.name}: quantity ${food.quantity} muito pequena (mínimo 0.15)`);
              hasUnrealisticQuantities = true;
            }
          }
        }
      }

      if (hasUnrealisticQuantities) {
        console.warn('⚠️ Found unrealistic quantities, retrying...');
        continue;
      }

      let totalP = 0, totalC = 0, totalF = 0, totalKcal = 0;

      for (const meal of result.meals) {
        for (const food of meal.foods || []) {
          const foodData = allFoods.find(f => f.id === food.foodId);
          if (foodData) {
            totalP += foodData.protein * food.quantity;
            totalC += foodData.carbs * food.quantity;
            totalF += foodData.fats * food.quantity;
            totalKcal += foodData.calories * food.quantity;
          }
        }
      }

      console.log(`📊 Calculated: ${totalKcal.toFixed(0)} kcal | ${totalP.toFixed(1)}g P | ${totalC.toFixed(1)}g C | ${totalF.toFixed(1)}g F`);
      console.log(`🎯 Target: ${targetCalories} kcal | ${targetProtein}g P | ${targetCarbs}g C | ${targetFats}g F`);

      const proteinDiff = totalP - targetProtein;
      const carbsDiff = totalC - targetCarbs;
      const fatsDiff = totalF - targetFats;
      const caloriesDiff = totalKcal - targetCalories;

      if (Math.abs(proteinDiff) <= 10 && Math.abs(carbsDiff) <= 15 && Math.abs(fatsDiff) <= 10 && Math.abs(caloriesDiff) <= 80) {
        console.log('✅ Macros validated successfully!');
        console.log(`📈 Final result: ${totalP.toFixed(1)}g P (${proteinDiff > 0 ? '+' : ''}${proteinDiff.toFixed(1)}g), ${totalC.toFixed(1)}g C (${carbsDiff > 0 ? '+' : ''}${carbsDiff.toFixed(1)}g), ${totalF.toFixed(1)}g F (${fatsDiff > 0 ? '+' : ''}${fatsDiff.toFixed(1)}g)`);
        break;
      }

      console.warn(`⚠️ Attempt ${attempts} failed. Deviations: P ${proteinDiff > 0 ? '+' : ''}${proteinDiff.toFixed(1)}g, C ${carbsDiff > 0 ? '+' : ''}${carbsDiff.toFixed(1)}g, F ${fatsDiff > 0 ? '+' : ''}${fatsDiff.toFixed(1)}g`);

      if (attempts < maxAttempts) {
        messages.push({
          role: 'assistant',
          content: JSON.stringify(result)
        });
        messages.push({
          role: 'user',
          content: `❌ ERRADO! Seus macros totais: ${totalP.toFixed(1)}g P, ${totalC.toFixed(1)}g C, ${totalF.toFixed(1)}g F, ${totalKcal.toFixed(0)} kcal

🎯 Meta obrigatória: ${targetProtein}g P, ${targetCarbs}g C, ${targetFats}g F, ${targetCalories} kcal

📊 DIFERENÇA:
- Proteína: ${proteinDiff > 0 ? 'EXCESSO de ' : 'FALTA '}${Math.abs(proteinDiff).toFixed(1)}g
- Carboidratos: ${carbsDiff > 0 ? 'EXCESSO de ' : 'FALTA '}${Math.abs(carbsDiff).toFixed(1)}g
- Gorduras: ${fatsDiff > 0 ? 'EXCESSO de ' : 'FALTA '}${Math.abs(fatsDiff).toFixed(1)}g

🔧 CORREÇÃO NECESSÁRIA:
${proteinDiff < 0 ? `- AUMENTE proteínas em ${Math.abs(proteinDiff).toFixed(1)}g (adicione mais frango/ovo ou aumente quantities)` : `- REDUZA proteínas em ${proteinDiff.toFixed(1)}g`}
${carbsDiff < 0 ? `- AUMENTE carboidratos em ${Math.abs(carbsDiff).toFixed(1)}g (adicione mais arroz/batata ou aumente quantities)` : `- REDUZA carboidratos em ${carbsDiff.toFixed(1)}g`}
${fatsDiff < 0 ? `- AUMENTE gorduras em ${Math.abs(fatsDiff).toFixed(1)}g (adicione mais azeite/castanhas)` : `- REDUZA gorduras em ${fatsDiff.toFixed(1)}g`}

Refaça o plano corrigindo as quantities. RESPONDA APENAS COM O JSON CORRIGIDO!`
        });
      } else {
        console.error(`❌ All ${maxAttempts} attempts failed. Accepting best attempt.`);
        console.log('⚠️ Using last result despite deviations. User can manually adjust.');
        break;
      }
    }

    // 🔧 AJUSTE MATEMÁTICO AUTOMÁTICO
    console.log('🔧 Applying mathematical adjustment to match targets...');

    let totalP = 0, totalC = 0, totalF = 0, totalKcal = 0;
    for (const meal of result.meals) {
      for (const food of meal.foods || []) {
        const foodData = allFoods.find(f => f.id === food.foodId);
        if (foodData) {
          totalP += foodData.protein * food.quantity;
          totalC += foodData.carbs * food.quantity;
          totalF += foodData.fats * food.quantity;
          totalKcal += foodData.calories * food.quantity;
        }
      }
    }

    const proteinDiff = targetProtein - totalP;
    const carbsDiff = targetCarbs - totalC;
    const fatsDiff = targetFats - totalF;

    console.log(`📊 Before adjustment: ${totalP.toFixed(1)}g P, ${totalC.toFixed(1)}g C, ${totalF.toFixed(1)}g F`);
    console.log(`🎯 Need to adjust: P ${proteinDiff > 0 ? '+' : ''}${proteinDiff.toFixed(1)}g, C ${carbsDiff > 0 ? '+' : ''}${carbsDiff.toFixed(1)}g, F ${fatsDiff > 0 ? '+' : ''}${fatsDiff.toFixed(1)}g`);

    // Ajustar proteína
    if (Math.abs(proteinDiff) > 2) {
      const proteinFood = allFoods.find(f => f.protein > 20 && f.carbs < 5); // Frango, peixe, etc
      if (proteinFood) {
        const adjustMeal = result.meals.find(m => m.name.toLowerCase().includes('jantar') || m.name.toLowerCase().includes('almoço'));
        if (adjustMeal) {
          const existingFood = adjustMeal.foods.find(f => f.foodId === proteinFood.id);
          if (existingFood) {
            const adjustment = proteinDiff / proteinFood.protein;
            existingFood.quantity += adjustment;
            console.log(`  ✓ Adjusted ${proteinFood.name} by ${adjustment.toFixed(2)} portions in ${adjustMeal.name}`);
          }
        }
      }
    }

    // Ajustar carboidratos
    if (Math.abs(carbsDiff) > 2) {
      const carbFood = allFoods.find(f => f.carbs > 20 && f.protein < 5); // Arroz, batata, etc
      if (carbFood) {
        const adjustMeal = result.meals.find(m => m.name.toLowerCase().includes('pré') || m.name.toLowerCase().includes('pós'));
        if (adjustMeal) {
          const existingFood = adjustMeal.foods.find(f => f.foodId === carbFood.id);
          if (existingFood) {
            const adjustment = carbsDiff / carbFood.carbs;
            existingFood.quantity += adjustment;
            console.log(`  ✓ Adjusted ${carbFood.name} by ${adjustment.toFixed(2)} portions in ${adjustMeal.name}`);
          }
        }
      }
    }

    // Ajustar gorduras
    if (Math.abs(fatsDiff) > 2) {
      const fatFood = allFoods.find(f => f.fats > 10 && f.protein < 5 && f.carbs < 5); // Azeite, castanhas
      if (fatFood) {
        const adjustMeal = result.meals[0]; // Primeira refeição
        if (adjustMeal) {
          const existingFood = adjustMeal.foods.find(f => f.foodId === fatFood.id);
          if (existingFood) {
            const adjustment = fatsDiff / fatFood.fats;
            existingFood.quantity += adjustment;
            console.log(`  ✓ Adjusted ${fatFood.name} by ${adjustment.toFixed(2)} portions in ${adjustMeal.name}`);
          }
        }
      }
    }

    console.log('✅ Mathematical adjustment complete!');

    await supabase.from('meal_foods').delete().eq('meal_id',
      supabase.from('meals').select('id').eq('diet_id', dietId)
    );

    await supabase.from('meals').delete().eq('diet_id', dietId);

    for (let i = 0; i < result.meals.length; i++) {
      const meal = result.meals[i];

      const { data: createdMeal, error: mealError } = await supabase
        .from('meals')
        .insert({
          diet_id: dietId,
          name: meal.name
        })
        .select()
        .single();

      if (mealError) {
        console.error('Error creating meal:', mealError);
        throw new Error(`Failed to create meal: ${meal.name}`);
      }

      if (meal.foods && meal.foods.length > 0) {
        const mealFoods = meal.foods.map((food: any) => ({
          meal_id: createdMeal.id,
          food_id: food.foodId,
          quantity: food.quantity
        }));

        const { error: foodsError } = await supabase
          .from('meal_foods')
          .insert(mealFoods);

        if (foodsError) {
          console.error('Error creating meal_foods:', foodsError);
          throw new Error(`Failed to add foods to meal: ${meal.name}`);
        }

        console.log(`✅ Created meal: ${meal.name} with ${meal.foods.length} foods`);
      }
    }

    console.log('🎉 Diet plan created successfully!');

    return new Response(JSON.stringify({
      success: true,
      mealsCreated: result.meals.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Error in adjust-macros function:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Internal server error',
      details: err.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
