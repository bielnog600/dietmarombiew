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

🎯 META DIÁRIA TOTAL (${strategy.toUpperCase()}):
- Calorias: ${targetCalories} kcal
- Proteína: ${targetProtein}g
- Carboidratos: ${targetCarbs}g
- Gorduras: ${targetFats}g

📋 DISTRIBUIÇÃO SUGERIDA POR REFEIÇÃO:
${mealPlansText}

🥗 BANCO DE ALIMENTOS DISPONÍVEIS:
${foodsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ INSTRUÇÕES PARA CRIAR O PLANO ALIMENTAR:

1. CRIAR REFEIÇÕES COMPLETAS E EQUILIBRADAS:
   ✓ Para CUTTING (${strategy === 'cutting' ? 'ATIVO' : 'INATIVO'}):
     - Priorize proteínas magras (peito de frango, peixe, claras de ovo)
     - Carboidratos complexos (aveia, batata doce, arroz integral)
     - Gorduras controladas (azeite, castanhas em pequena quantidade)
     - Vegetais em todas as refeições principais

   ✓ Para BULKING (${strategy === 'bulking' ? 'ATIVO' : 'INATIVO'}):
     - Aumente porções de proteína e carboidratos
     - Inclua mais gorduras saudáveis (abacate, castanhas, azeite)
     - Adicione lanches entre refeições principais
     - Inclua alimentos calóricos (pasta de amendoim, frutas secas)

2. VARIEDADE DE ALIMENTOS:
   ✓ Combine 3-5 alimentos diferentes por refeição
   ✓ Use proteínas variadas (frango, peixe, ovos, whey)
   ✓ Inclua carboidratos de fontes diferentes
   ✓ Adicione gorduras saudáveis
   ✓ SEMPRE inclua vegetais nas refeições principais

3. CÁLCULO DE QUANTIDADES:
   ✓ Use regra de três: Se frango tem 0.31g P por 1g → para 42g P precisa de 135g
   ✓ Arredonde para múltiplos de 5g (135g, 140g, 145g...)
   ✓ Quantidade mínima: 30g por alimento
   ✓ Quantidade máxima: 400g por alimento

4. BALANCEAMENTO FINO:
   ✓ A SOMA TOTAL de TODAS as refeições DEVE SER:
     • Proteína: ${targetProtein}g (±3g de margem)
     • Carboidratos: ${targetCarbs}g (±3g de margem)
     • Gorduras: ${targetFats}g (±3g de margem)
     • Calorias: ${targetCalories} kcal (±20 kcal de margem)

5. ESTRUTURA DO JSON (sem markdown):
{
  "meals": [
    {
      "name": "Café da manhã",
      "foods": [
        { "foodId": "uuid-do-alimento-1", "quantity": 2.0 },
        { "foodId": "uuid-do-alimento-2", "quantity": 1.5 },
        { "foodId": "uuid-do-alimento-3", "quantity": 3.0 }
      ]
    },
    {
      "name": "Pré-treino",
      "foods": [
        { "foodId": "uuid-do-alimento-4", "quantity": 1.0 },
        { "foodId": "uuid-do-alimento-5", "quantity": 2.5 }
      ]
    }
  ]
}

⚡ PRIORIDADE MÁXIMA:
1. Criar refeições COMPLETAS e VARIADAS
2. Bater EXATAMENTE as macros e calorias totais
3. Usar alimentos do banco disponível
4. Seguir princípios nutricionais para ${strategy.toUpperCase()}

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
