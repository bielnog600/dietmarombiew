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

    console.log('Request params:', { dietId, userId, strategy, targetCalories });

    if (!dietId || !userId) {
      throw new Error('Missing required parameters: dietId or userId');
    }

    const { data: diet, error: dietError } = await supabase
      .from('diets')
      .select(`
        id,
        user_id,
        meals (
          id,
          name,
          meal_foods (
            id,
            quantity,
            food:foods (
              id,
              name,
              protein,
              carbs,
              fats,
              portion_size
            )
          )
        )
      `)
      .eq('id', dietId)
      .maybeSingle();

    console.log('Diet query result:', { diet, error: dietError });

    if (dietError) {
      throw new Error(`Diet query error: ${dietError.message}`);
    }

    if (!diet) {
      throw new Error('Diet not found');
    }

    const meals = diet.meals || [];
    console.log(`Found ${meals.length} meals`);

    if (meals.length === 0) {
      throw new Error('No meals found in diet');
    }

    const { data: allFoods, error: foodsError } = await supabase
      .from('foods')
      .select('id, name, protein, carbs, fats, calories, portion_size')
      .eq('user_id', userId)
      .order('name');

    console.log(`Found ${allFoods?.length || 0} foods, error:`, foodsError);

    const distributionsCutting = [
      { name: 'Café da manhã', kcal: 280, p: 0.30, c: 0.20, f: 0.19 },
      { name: 'Pré-treino', kcal: 260, p: 0.15, c: 0.25, f: 0.11 },
      { name: 'Pós-treino', kcal: 350, p: 0.25, c: 0.35, f: 0.08 },
      { name: 'Jantar', kcal: 300, p: 0.20, c: 0.15, f: 0.26 },
      { name: 'Ceia', kcal: 210, p: 0.10, c: 0.05, f: 0.36 }
    ];

    const distributionsBulking = [
      { name: 'Café da manhã', kcal: 280, p: 0.25, c: 0.20, f: 0.20 },
      { name: 'Pré-treino', kcal: 260, p: 0.20, c: 0.25, f: 0.15 },
      { name: 'Pós-treino', kcal: 350, p: 0.25, c: 0.30, f: 0.15 },
      { name: 'Jantar', kcal: 300, p: 0.20, c: 0.20, f: 0.30 },
      { name: 'Ceia', kcal: 210, p: 0.10, c: 0.05, f: 0.20 }
    ];

    const baseDistributions = strategy === 'cutting' ? distributionsCutting : distributionsBulking;

    const distributions = meals.map((meal: any, idx: number) => {
      const base = baseDistributions[idx] || baseDistributions[0];
      return {
        name: meal.name,
        p: Math.round(targetProtein * base.p),
        c: Math.round(targetCarbs * base.c),
        f: Math.round(targetFats * base.f),
        kcal: Math.round(targetCalories * (base.kcal / 1400))
      };
    });

    let currentP = 0, currentC = 0, currentF = 0;
    const mealsText = meals.map((meal: any, idx: number) => {
      const target = distributions[idx];
      currentP += target.p;
      currentC += target.c;
      currentF += target.f;

      const foodsText = meal.meal_foods.map((mf: any) => {
        const grams = Math.round(mf.quantity * mf.food.portion_size);
        const mult = grams / mf.food.portion_size;
        const pPerGram = mf.food.protein / mf.food.portion_size;
        const cPerGram = mf.food.carbs / mf.food.portion_size;
        const fPerGram = mf.food.fats / mf.food.portion_size;

        return `  [ID: ${mf.id}] ${mf.food.name}
  Atual: ${grams}g → ${(mf.food.protein * mult).toFixed(1)}g P, ${(mf.food.carbs * mult).toFixed(1)}g C, ${(mf.food.fats * mult).toFixed(1)}g G
  Por grama: ${pPerGram.toFixed(2)}g P, ${cPerGram.toFixed(2)}g C, ${fPerGram.toFixed(2)}g G por 1g
  Base: ${mf.food.portion_size}g = ${mf.food.protein}g P, ${mf.food.carbs}g C, ${mf.food.fats}g G`;
      }).join('\n\n');

      return `━━━━ REFEIÇÃO ${idx + 1}: ${meal.name} ━━━━
🎯 META: ~${target.kcal} kcal | ${target.p}g P | ${target.c}g C | ${target.f}g G

${foodsText}`;
    }).join('\n\n');

    const adjustP = targetProtein - currentP;
    const adjustC = targetCarbs - currentC;
    const adjustF = targetFats - currentF;

    const prompt = `Você é um nutricionista calculando porções exatas.

📊 META DIÁRIA TOTAL (${strategy.toUpperCase()}):
- Calorias: ${targetCalories} kcal
- Proteína: ${targetProtein}g
- Carboidratos: ${targetCarbs}g
- Gorduras: ${targetFats}g

📋 EXEMPLO DE DISTRIBUIÇÃO IDEAL (1400 kcal / Cutting):
┌────────────────┬─────┬──────┬───────┬─────────┐
│ Refeição       │kcal │ Prot │ Carbs │ Gordura │
├────────────────┼─────┼──────┼───────┼─────────┤
│ Café da manhã │ 280 │ 42g  │ 21g   │ 9g      │
│ Pré-treino     │ 260 │ 21g  │ 26g   │ 5g      │
│ Pós-treino     │ 350 │ 35g  │ 37g   │ 3-4g    │
│ Jantar         │ 300 │ 28g  │ 16g   │ 12g     │
│ Ceia           │ 210 │14-21g│ 0-5g  │ 9-14g   │
└────────────────┴─────┴──────┴───────┴─────────┘
TOTAL: 1400 kcal | 140g P | 105g C | 47g G

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${mealsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ INSTRUÇÕES PARA CÁLCULO:

1. CALCULE cada quantidade usando regra de três:
   Exemplo: Precisa 42g proteína e frango tem 0.31g P por 1g
   → 42 ÷ 0.31 = 135g de frango → arredonde para 135g (múltiplo de 5)

2. AJUSTE FINAL necessário:
   - Proteína: ${adjustP > 0 ? '+' : ''}${adjustP}g
   - Carbos: ${adjustC > 0 ? '+' : ''}${adjustC}g
   - Gordura: ${adjustF > 0 ? '+' : ''}${adjustF}g

3. BANCO DE ALIMENTOS DISPONÍVEIS (caso precise adicionar refeições):
${allFoods ? allFoods.slice(0, 20).map(f => `   • ${f.name}: ${f.protein}g P, ${f.carbs}g C, ${f.fats}g G por ${f.portion_size}g [ID: ${f.id}]`).join('\n') : ''}

4. REGRAS:
   ✓ Se não conseguir bater a meta apenas ajustando quantidades, ADICIONE novas refeições
   ✓ Múltiplos de 5g (135g, 140g, 145g...)
   ✓ Mínimo: 30g por alimento
   ✓ SOMA TOTAL FINAL deve ser: ${targetProtein}g P, ${targetCarbs}g C, ${targetFats}g G
   ✓ Margem: ±2g por macro

5. RESPONDA JSON (sem markdown):
{
  "portions": {
    "meal_food_id_existente": 135,
    "meal_food_id_existente": 200
  },
  "newMeals": [
    {
      "name": "Lanche Extra",
      "foods": [
        { "foodId": "uuid-do-alimento", "quantity": 1.5 }
      ]
    }
  ]
}

⚡ PRIORIDADE: Bater exatamente as macros! Se precisar adicionar refeições, adicione!`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + openaiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Responda APENAS com JSON válido, sem markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error: ' + openaiResponse.statusText);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content.trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid OpenAI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.newMeals && result.newMeals.length > 0) {
      for (const newMeal of result.newMeals) {
        const { data: createdMeal } = await supabase
          .from('meals')
          .insert({
            diet_id: dietId,
            name: newMeal.name
          })
          .select()
          .single();

        if (createdMeal && newMeal.foods) {
          const mealFoods = newMeal.foods.map((food: any) => ({
            meal_id: createdMeal.id,
            food_id: food.foodId,
            quantity: food.quantity
          }));

          await supabase.from('meal_foods').insert(mealFoods);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in adjust-macros function:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Internal server error',
      details: err.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
