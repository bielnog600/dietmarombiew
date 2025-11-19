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
    const { dietId, strategy, targetCalories, targetProtein, targetCarbs, targetFats } = body;

    const { data: diet, error: dietError } = await supabase
      .from('diets')
      .select('id, meals:meals(id, name, meal_foods:meal_foods(id, quantity, food:foods(id, name, protein, carbs, fats, portion_size)))')
      .eq('id', dietId)
      .single();

    if (dietError || !diet) {
      throw new Error('Diet not found');
    }

    const meals = diet.meals;

    const distributionText = strategy === 'cutting'
      ? 'Refeição 1: 30% P, 20% C, 20% G; Refeição 2: 15% P, 25% C, 10% G; Refeição 3: 25% P, 35% C, 8% G; Refeição 4: 20% P, 15% C, 25% G; Refeição 5: 10% P, 5% C, 37% G'
      : 'Refeição 1: 25% P, 20% C, 20% G; Refeição 2: 20% P, 25% C, 15% G; Refeição 3: 25% P, 30% C, 15% G; Refeição 4: 20% P, 20% C, 30% G; Refeição 5: 10% P, 5% C, 20% G';

    const mealsText = meals.map((meal: any) => {
      const foodsText = meal.meal_foods.map((mf: any) => {
        const grams = Math.round(mf.quantity * mf.food.portion_size);
        const mult = grams / mf.food.portion_size;
        return `${mf.id}|${mf.food.name}|${grams}g|(${(mf.food.protein * mult).toFixed(1)}g P, ${(mf.food.carbs * mult).toFixed(1)}g C, ${(mf.food.fats * mult).toFixed(1)}g G)|portionSize:${mf.food.portion_size}g|macros:P${mf.food.protein}g C${mf.food.carbs}g F${mf.food.fats}g`;
      }).join('\n');
      return `${meal.name}:\n${foodsText}`;
    }).join('\n\n');

    const prompt = `Ajuste quantidades para bater metas exatas.

META: ${targetProtein}g P, ${targetCarbs}g C, ${targetFats}g G (${targetCalories} kcal)
ESTRATÉGIA: ${strategy}
DISTRIBUIÇÃO: ${distributionText}

REFEIÇÕES:
${mealsText}

REGRAS: Ajuste apenas quantidades (mínimo 30g, múltiplos de 5g). Diferença máxima ±2g por macro.

RESPONDA APENAS JSON:
{"portions": {"id1": 150, "id2": 200}}`;

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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
