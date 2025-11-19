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

    const prompt = `Você é um NUTRICIONISTA PROFISSIONAL criando um plano alimentar completo e equilibrado.

🎯 META DIÁRIA TOTAL OBRIGATÓRIA (${strategy.toUpperCase()}):
- Calorias: ${targetCalories} kcal → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Proteína: ${targetProtein}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Carboidratos: ${targetCarbs}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Gorduras: ${targetFats}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!

⚠️ ATENÇÃO: Estes valores são TOTAIS do dia todo, não por refeição!

📋 DISTRIBUIÇÃO SUGERIDA POR REFEIÇÃO (use como referência):
${mealPlansText}

🥗 BANCO DE ALIMENTOS DISPONÍVEIS:
${foodsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ INSTRUÇÕES CRÍTICAS PARA CRIAR O PLANO ALIMENTAR:

1. REFEIÇÕES REALISTAS E COERENTES:

   ✓ CAFÉ DA MANHÃ - Combine apenas:
     - Ovos OU iogurte (proteína)
     - Aveia OU pão integral OU banana (carboidrato)
     - Castanhas OU pasta de amendoim (gordura saudável - pequena quantidade)

   ✓ PRÉ-TREINO - Combine apenas:
     - Banana OU pão (carboidrato rápido)
     - Pasta de amendoim OU castanhas (gordura - pouca quantidade)

   ✓ PÓS-TREINO - Combine apenas:
     - Frango OU atum OU ovos (proteína)
     - Arroz OU batata doce OU macarrão (carboidrato)
     - Brócolis OU tomate OU cenoura (vegetal)

   ✓ JANTAR - Combine apenas:
     - Frango OU carne OU salmão OU ovo (proteína)
     - Arroz OU batata doce (carboidrato - menor porção)
     - Brócolis OU espinafre OU salada (vegetal)

   ✓ CEIA - Combine apenas:
     - Queijo cottage OU iogurte OU ovos (proteína)
     - Castanhas OU abacate (gordura)

2. ERROS QUE VOCÊ DEVE EVITAR:
   ❌ NÃO misture frango com aveia no café da manhã
   ❌ NÃO coloque iogurte no jantar
   ❌ NÃO use arroz no café da manhã
   ❌ NÃO exagere nas quantidades (máximo 200g de proteína por refeição)
   ❌ NÃO coloque frango em todas as refeições

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

   ⚠️ LIMITE MÁXIMO de quantity por tipo:
   - Proteínas (frango, carne, peixe, ovo): máximo 2.5
   - Carboidratos (arroz, batata, aveia): máximo 2.0
   - Gorduras (azeite, castanhas): máximo 0.5
   - Vegetais: máximo 2.0

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

    console.log('🤖 Calling OpenAI...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + openaiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um nutricionista expert. Responda APENAS com JSON válido, sem markdown, sem explicações. Crie planos alimentares completos, equilibrados e variados.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.statusText} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content.trim();

    console.log('📄 OpenAI response:', content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid OpenAI response - no JSON found');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.meals || !Array.isArray(result.meals)) {
      throw new Error('Invalid response structure - missing meals array');
    }

    console.log(`🍽️ Creating ${result.meals.length} meals...`);

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

    console.log(`📊 Calculated totals: ${totalKcal.toFixed(0)} kcal | ${totalP.toFixed(1)}g P | ${totalC.toFixed(1)}g C | ${totalF.toFixed(1)}g F`);
    console.log(`🎯 Target: ${targetCalories} kcal | ${targetProtein}g P | ${targetCarbs}g C | ${targetFats}g F`);

    const proteinDiff = Math.abs(totalP - targetProtein);
    const carbsDiff = Math.abs(totalC - targetCarbs);
    const fatsDiff = Math.abs(totalF - targetFats);
    const caloriesDiff = Math.abs(totalKcal - targetCalories);

    if (proteinDiff > 8 || carbsDiff > 8 || fatsDiff > 8 || caloriesDiff > 50) {
      console.warn(`⚠️ Macros deviation detected! P: ${proteinDiff.toFixed(1)}g, C: ${carbsDiff.toFixed(1)}g, F: ${fatsDiff.toFixed(1)}g, Kcal: ${caloriesDiff.toFixed(0)}`);
      throw new Error(`AI generated plan with incorrect macros. Protein: ${totalP.toFixed(1)}g (target: ${targetProtein}g), Carbs: ${totalC.toFixed(1)}g (target: ${targetCarbs}g), Fats: ${totalF.toFixed(1)}g (target: ${targetFats}g)`);
    }

    console.log('✅ Macros validated successfully!');

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
