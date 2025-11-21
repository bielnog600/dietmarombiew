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

    if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { dietId, strategy, targetCalories, targetProtein, targetCarbs, targetFats, userId } = body;

    if (!dietId || !userId) throw new Error('Missing required parameters');

    // Buscar APENAS 20 alimentos principais para prompt minúsculo
    const { data: allFoods } = await supabase.from('foods').select('id,name,protein,carbs,fats').limit(20);
    if (!allFoods || allFoods.length === 0) throw new Error('No foods found');

    // Lista MINÚSCULA (sem IDs no prompt para economizar espaço)
    const foodNames = allFoods.map(f => f.name).join(',');
    const foodsMap = new Map(allFoods.map(f => [f.name.toLowerCase(), f.id]));

    // Random seed
    const seed = Date.now() % 10000;
    const styles = ['equilibrada', 'low carb', 'flexível'];
    const style = styles[seed % styles.length];

    // Prompt MÍNIMO (evitar Unterminated String)
    const prompt = `JSON dieta. ${targetCalories}kcal ${targetProtein}P ${targetCarbs}C ${targetFats}F. Alimentos:${foodNames}. Seed:${seed} Style:${style}. ${strategy}`;

    console.log(`Seed:${seed} Style:${style}`);

    const messages = [
      {
        role: 'system',
        content: 'Nutricionista. Responda JSON: {"meals":[{"name":"Café","foods":[{"foodName":"Frango","quantity":1.5}]}]}. Varie alimentos.'
      },
      { role: 'user', content: prompt }
    ];

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.9,
        max_tokens: 1500,
        frequency_penalty: 0.7,
        presence_penalty: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    let content = openaiData.choices[0].message.content.trim();

    // Parse robusto
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    let jsonStr = jsonMatch[0]
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/,(\s*[}\]])/g, '$1')
      .trim();

    const result = JSON.parse(jsonStr);
    if (!result.meals || !Array.isArray(result.meals)) throw new Error('Invalid structure');

    console.log(`✅ ${result.meals.length} meals`);

    // Converter foodName para foodId
    for (const meal of result.meals) {
      if (meal.foods) {
        for (const food of meal.foods) {
          if (food.foodName && !food.foodId) {
            const foodId = foodsMap.get(food.foodName.toLowerCase()) ||
                          allFoods.find(f => f.name.toLowerCase().includes(food.foodName.toLowerCase()))?.id;
            if (foodId) {
              food.foodId = foodId;
              delete food.foodName;
            }
          }
        }
      }
    }

    // Deletar refeições antigas
    await supabase.from('meals').delete().eq('diet_id', dietId);

    // Criar novas refeições
    for (const meal of result.meals) {
      const { data: createdMeal } = await supabase.from('meals').insert({
        diet_id: dietId,
        name: meal.name
      }).select().single();

      if (createdMeal && meal.foods && meal.foods.length > 0) {
        const validFoods = meal.foods.filter((f: any) => f.foodId);
        if (validFoods.length > 0) {
          const mealFoods = validFoods.map((food: any) => ({
            meal_id: createdMeal.id,
            food_id: food.foodId,
            quantity: food.quantity || 1
          }));

          await supabase.from('meal_foods').insert(mealFoods);
        }
      }
    }

    console.log('🎉 Success!');

    return new Response(JSON.stringify({ success: true, meals: result.meals.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Error:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Internal error',
      details: err.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
