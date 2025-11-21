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
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { dietId, strategy, targetCalories, targetProtein, targetCarbs, targetFats, userId } = body;

    if (!dietId || !userId) throw new Error('Missing required parameters');

    // Buscar alimentos com valores nutricionais completos
    const { data: allFoods } = await supabase.from('foods').select('id,name,protein,carbs,fats,calories').limit(30);
    if (!allFoods || allFoods.length === 0) throw new Error('No foods found');

    // Criar lista detalhada dos alimentos com valores nutricionais
    const foodList = allFoods.map(f =>
      `${f.name}(${f.calories || Math.round((f.protein*4)+(f.carbs*4)+(f.fats*9))}kcal,${f.protein}P,${f.carbs}C,${f.fats}F/100g)`
    ).join(', ');

    const foodsMap = new Map(allFoods.map(f => [f.name.toLowerCase(), f.id]));

    // Random seed para variação
    const seed = Date.now() % 10000;

    const systemPrompt = `Você é um nutricionista especializado em cálculo preciso de porções.

REGRAS CRÍTICAS:
1. As quantidades são em GRAMAS (100g = 1.0)
2. NUNCA ultrapasse as metas de calorias e macros
3. Calcule as porções com PRECISÃO para ficar DENTRO ou ABAIXO das metas
4. Use porções pequenas (0.5, 0.8, 1.2) para controle fino
5. Varie os alimentos entre refeições

FORMATO JSON OBRIGATÓRIO:
{"meals":[{"name":"Café da Manhã","foods":[{"foodName":"Frango","quantity":1.5}]}]}

Responda APENAS com JSON puro, sem texto adicional.`;

    const prompt = `META DIÁRIA (NÃO ULTRAPASSAR):
- Calorias: ${targetCalories} kcal
- Proteínas: ${targetProtein}g
- Carboidratos: ${targetCarbs}g
- Gorduras: ${targetFats}g

ALIMENTOS DISPONÍVEIS (valores por 100g):
${foodList}

INSTRUÇÕES:
1. Crie 5-6 refeições balanceadas
2. Calcule as quantidades em gramas para FICAR DENTRO das metas
3. Distribua os macros proporcionalmente entre as refeições
4. Use porções realistas (ex: 1.5 = 150g, 0.8 = 80g)
5. Varie os alimentos entre as refeições (seed: ${seed})
6. ${strategy || 'Distribua equilibradamente'}

IMPORTANTE: Cada quantity é em múltiplos de 100g. Se um alimento tem 30P/100g e você quer 45g de proteína, use quantity: 1.5`;
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 3072
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    let content = geminiData.candidates[0].content.parts[0].text.trim();

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

    // Calcular totais para validação
    let totalCals = 0, totalProt = 0, totalCarbs = 0, totalFats = 0;
    for (const meal of result.meals) {
      if (meal.foods) {
        for (const food of meal.foods) {
          const foodData = allFoods.find(f =>
            f.name.toLowerCase() === food.foodName?.toLowerCase() ||
            f.name.toLowerCase().includes(food.foodName?.toLowerCase())
          );
          if (foodData && food.quantity) {
            totalCals += (foodData.calories || ((foodData.protein*4)+(foodData.carbs*4)+(foodData.fats*9))) * food.quantity;
            totalProt += foodData.protein * food.quantity;
            totalCarbs += foodData.carbs * food.quantity;
            totalFats += foodData.fats * food.quantity;
          }
        }
      }
    }

    console.log(`✅ ${result.meals.length} meals | Total: ${Math.round(totalCals)}kcal ${Math.round(totalProt)}P ${Math.round(totalCarbs)}C ${Math.round(totalFats)}F`);

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
