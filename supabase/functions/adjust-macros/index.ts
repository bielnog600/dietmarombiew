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

    // Buscar TODOS os alimentos disponíveis
    const { data: allFoods, error: foodsError } = await supabase
      .from('foods')
      .select('id,name,protein,carbs,fats,calories');

    if (foodsError) {
      console.error('Error fetching foods:', foodsError);
      throw new Error(`Failed to fetch foods: ${foodsError.message}`);
    }

    if (!allFoods || allFoods.length === 0) {
      console.error('No foods found in database');
      throw new Error('No foods found');
    }

    console.log(`📦 Found ${allFoods.length} foods in database`);

    // Embaralhar alimentos para garantir variedade a cada requisição
    const shuffled = [...allFoods].sort(() => Math.random() - 0.5);

    // Selecionar 30-40 alimentos aleatórios
    const randomCount = 30 + Math.floor(Math.random() * 11);
    const selectedFoods = shuffled.slice(0, Math.min(randomCount, shuffled.length));

    // Criar lista detalhada dos alimentos com valores nutricionais
    const foodList = selectedFoods.map(f =>
      `${f.name}(${f.calories || Math.round((f.protein*4)+(f.carbs*4)+(f.fats*9))}kcal,${f.protein}P,${f.carbs}C,${f.fats}F/100g)`
    ).join(', ');

    const foodsMap = new Map(allFoods.map(f => [f.name.toLowerCase(), f.id]));

    // Múltiplos seeds de aleatoriedade
    const timeSeed = Date.now();
    const randomSeed = Math.floor(Math.random() * 100000);
    const combinedSeed = timeSeed + randomSeed;

    // Variações de estilo para cada geração
    const styleVariations = [
      'minimalista', 'diversificada', 'tradicional', 'moderna',
      'rica em vegetais', 'proteica', 'equilibrada', 'low carb moderado',
      'mediterrânea', 'fitness', 'natural', 'caseira'
    ];
    const randomStyle = styleVariations[Math.floor(Math.random() * styleVariations.length)];

    // Configurações específicas para cada estratégia
    let strategyConfig = {
      mealCount: '5-6',
      distribution: 'equilibrada',
      focus: '',
      mealsStyle: ''
    };

    if (strategy === 'cutting') {
      strategyConfig = {
        mealCount: '5-6',
        distribution: 'Foque em PROTEÍNAS e vegetais, reduza carboidratos simples',
        focus: 'Priorize alimentos com alto teor proteico e baixas calorias. Use vegetais em abundância.',
        mealsStyle: 'Refeições leves e frequentes para saciedade'
      };
    } else if (strategy === 'bulking') {
      strategyConfig = {
        mealCount: '4-5',
        distribution: 'Foque em CARBOIDRATOS complexos e proteínas',
        focus: 'Priorize alimentos calóricos e ricos em carboidratos. Inclua boas gorduras.',
        mealsStyle: 'Refeições abundantes com boas fontes de energia'
      };
    }

    const systemPrompt = `Você é um nutricionista criativo especializado em cálculo preciso de porções.

REGRAS CRÍTICAS:
1. As quantidades são em GRAMAS (100g = 1.0)
2. NUNCA ultrapasse as metas de calorias e macros
3. Calcule as porções com PRECISÃO para ficar DENTRO ou ABAIXO das metas
4. Use porções pequenas (0.5, 0.8, 1.2) para controle fino
5. VARIE MUITO os alimentos entre refeições - NUNCA repita o mesmo alimento
6. Seja CRIATIVO e use combinações diferentes a cada geração

FORMATO JSON OBRIGATÓRIO:
{"meals":[{"name":"Café da Manhã","foods":[{"foodName":"Frango","quantity":1.5}]}]}

Responda APENAS com JSON puro, sem texto adicional.`;

    const prompt = `🎯 META DIÁRIA (NÃO ULTRAPASSAR):
- Calorias: ${targetCalories} kcal
- Proteínas: ${targetProtein}g
- Carboidratos: ${targetCarbs}g
- Gorduras: ${targetFats}g

📋 ESTRATÉGIA: ${strategy || 'Manutenção'}
${strategyConfig.focus}

🥗 ALIMENTOS DISPONÍVEIS (valores por 100g):
${foodList}

📝 INSTRUÇÕES CRÍTICAS:
1. Crie ${strategyConfig.mealCount} refeições ${strategyConfig.mealsStyle}
2. ${strategyConfig.distribution}
3. Calcule as quantidades para FICAR DENTRO das metas
4. Use porções realistas (ex: 1.5 = 150g, 0.8 = 80g)
5. ⚠️ MÁXIMA VARIEDADE: Use alimentos DIFERENTES em CADA refeição
6. 🎲 Seja criativo! Estilo: ${randomStyle}
7. 🔀 Seed de aleatoriedade: ${combinedSeed}

IMPORTANTE:
- Cada quantity é em múltiplos de 100g
- NUNCA repita alimentos entre refeições
- Crie combinações únicas e interessantes`;
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    console.log(`🎲 Seed: ${combinedSeed} | Style: ${randomStyle} | Strategy: ${strategy || 'maintenance'} | Foods: ${selectedFoods.length}`);

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
          temperature: 1.2,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 4096
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

    console.log(`✅ ${result.meals.length} meals | Total: ${Math.round(totalCals)}kcal ${Math.round(totalProt)}P ${Math.round(totalCarbs)}C ${Math.round(totalFats)}F | Target: ${targetCalories}kcal ${targetProtein}P ${targetCarbs}C ${targetFats}F`);

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
