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

    const distributions = strategy === 'cutting'
      ? [
          { pct: 0.30, p: Math.round(targetProtein * 0.30), c: Math.round(targetCarbs * 0.20), f: Math.round(targetFats * 0.20) },
          { pct: 0.15, p: Math.round(targetProtein * 0.15), c: Math.round(targetCarbs * 0.25), f: Math.round(targetFats * 0.10) },
          { pct: 0.25, p: Math.round(targetProtein * 0.25), c: Math.round(targetCarbs * 0.35), f: Math.round(targetFats * 0.08) },
          { pct: 0.20, p: Math.round(targetProtein * 0.20), c: Math.round(targetCarbs * 0.15), f: Math.round(targetFats * 0.25) },
          { pct: 0.10, p: Math.round(targetProtein * 0.10), c: Math.round(targetCarbs * 0.05), f: Math.round(targetFats * 0.37) }
        ]
      : [
          { pct: 0.25, p: Math.round(targetProtein * 0.25), c: Math.round(targetCarbs * 0.20), f: Math.round(targetFats * 0.20) },
          { pct: 0.20, p: Math.round(targetProtein * 0.20), c: Math.round(targetCarbs * 0.25), f: Math.round(targetFats * 0.15) },
          { pct: 0.25, p: Math.round(targetProtein * 0.25), c: Math.round(targetCarbs * 0.30), f: Math.round(targetFats * 0.15) },
          { pct: 0.20, p: Math.round(targetProtein * 0.20), c: Math.round(targetCarbs * 0.20), f: Math.round(targetFats * 0.30) },
          { pct: 0.10, p: Math.round(targetProtein * 0.10), c: Math.round(targetCarbs * 0.05), f: Math.round(targetFats * 0.20) }
        ];

    const mealsText = meals.map((meal: any, idx: number) => {
      const target = distributions[idx] || distributions[0];
      const foodsText = meal.meal_foods.map((mf: any) => {
        const grams = Math.round(mf.quantity * mf.food.portion_size);
        const mult = grams / mf.food.portion_size;
        return `  ID: ${mf.id}
  Alimento: ${mf.food.name}
  Atual: ${grams}g = ${(mf.food.protein * mult).toFixed(1)}g P, ${(mf.food.carbs * mult).toFixed(1)}g C, ${(mf.food.fats * mult).toFixed(1)}g G
  Info: A cada ${mf.food.portion_size}g = ${mf.food.protein}g P, ${mf.food.carbs}g C, ${mf.food.fats}g G`;
      }).join('\n\n');
      return `━━━ ${meal.name} ━━━
META DESTA REFEIÇÃO: ${target.p}g P, ${target.c}g C, ${target.f}g G

ALIMENTOS:
${foodsText}`;
    }).join('\n\n');

    const prompt = `Você é um nutricionista expert. Ajuste as quantidades dos alimentos para bater EXATAMENTE as metas.

📊 META DIÁRIA TOTAL:
- Proteína: ${targetProtein}g
- Carboidratos: ${targetCarbs}g
- Gorduras: ${targetFats}g
- Calorias: ${targetCalories} kcal

📋 ESTRATÉGIA: ${strategy.toUpperCase()}

${mealsText}

⚠️ REGRAS OBRIGATÓRIAS:
1. Calcule quantidades em gramas usando a proporção dos macros por porção
2. Exemplo: Se precisa 50g de proteína e frango tem 31g P a cada 100g, use aproximadamente 160g de frango
3. Use MÚLTIPLOS DE 5g (150g, 155g, 160g, etc)
4. Quantidade mínima: 30g
5. A SOMA de cada macro em TODAS as refeições deve dar EXATAMENTE a meta total (±3g)
6. Priorize bater CARBOIDRATOS primeiro, depois PROTEÍNA, depois GORDURA

🎯 RESPONDA APENAS JSON (sem markdown):
{
  "portions": {
    "meal_food_id_1": 150,
    "meal_food_id_2": 200
  }
}

IMPORTANTE: As quantidades devem fazer a SOMA TOTAL bater exatamente ${targetProtein}g P, ${targetCarbs}g C, ${targetFats}g G`;

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
