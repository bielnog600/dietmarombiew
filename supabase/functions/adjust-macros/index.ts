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

    // Buscar alimentos
    const { data: allFoods } = await supabase.from('foods').select('*').order('name');
    if (!allFoods || allFoods.length === 0) throw new Error('No foods found');

    // Criar lista de alimentos
    const foodsList = allFoods.map(f => `${f.name} [${f.id}]: ${f.protein}gP/${f.carbs}gC/${f.fats}gF por ${f.portion_size}g`).join('\n');

    // Random seed para variedade
    const randomSeed = Math.floor(Math.random() * 1000000) + Date.now();
    const dietStyles = ['equilibrada', 'low carb', 'flexível', 'mediterrânea', 'alta proteína'];
    const selectedStyle = dietStyles[Math.floor(Math.random() * dietStyles.length)];

    // Prompt ENXUTO
    const prompt = `Crie plano alimentar JSON VARIADO (seed ${randomSeed}, estilo ${selectedStyle}).

META: ${targetCalories}kcal | ${targetProtein}gP | ${targetCarbs}gC | ${targetFats}gF (${strategy})

ALIMENTOS DISPONÍVEIS:
${foodsList}

ESTRUTURA:
{"meals":[{"name":"Café","foods":[{"foodId":"uuid","quantity":1.5}]}],"newFoods":[]}

REGRAS:
- quantity = gramas/portion_size
- Varie: proteínas/carbos/vegetais diferentes
- Quantities realistas: frango 1-2.5, ovos 2-4, banana 0.6-2
- Soma final: ±10g macros, ±50kcal`;

    console.log(`🎨 Style: ${selectedStyle}, Seed: ${randomSeed}`);

    const messages = [
      {
        role: 'system',
        content: 'Você é nutricionista. Responda APENAS JSON válido. Varie alimentos a cada geração. Use seed fornecido para unicidade.'
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
        max_tokens: 2000,
        frequency_penalty: 0.8,
        presence_penalty: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    let content = openaiData.choices[0].message.content.trim();
    
    // Limpar e parsear JSON
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const result = JSON.parse(jsonMatch[0]);
    if (!result.meals || !Array.isArray(result.meals)) throw new Error('Invalid structure');

    console.log(`✅ ${result.meals.length} meals created`);

    // Processar novos alimentos se houver
    if (result.newFoods && Array.isArray(result.newFoods)) {
      for (const newFood of result.newFoods) {
        const { data: existingFood } = await supabase.from('foods').select('id').ilike('name', newFood.name).maybeSingle();
        
        if (!existingFood) {
          const { data: createdFood } = await supabase.from('foods').insert({
            name: newFood.name,
            protein: newFood.protein || 0,
            carbs: newFood.carbs || 0,
            fats: newFood.fats || 0,
            calories: newFood.calories || Math.round((newFood.protein * 4) + (newFood.carbs * 4) + (newFood.fats * 9)),
            portion_size: 100,
            user_id: userId
          }).select().single();

          if (createdFood) {
            console.log(`✅ New food: ${createdFood.name}`);
            // Substituir referências
            for (const meal of result.meals) {
              for (const food of meal.foods || []) {
                if (food.foodId === `NEW_${newFood.name}`) {
                  food.foodId = createdFood.id;
                }
              }
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
        const mealFoods = meal.foods.map((food: any) => ({
          meal_id: createdMeal.id,
          food_id: food.foodId,
          quantity: food.quantity
        }));

        await supabase.from('meal_foods').insert(mealFoods);
      }
    }

    console.log('🎉 Diet created successfully!');

    return new Response(JSON.stringify({ success: true, mealsCreated: result.meals.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Error:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Internal server error',
      details: err.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
