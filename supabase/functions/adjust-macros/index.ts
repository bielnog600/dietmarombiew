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
    const { dietId, strategy, dietModel, targetCalories, targetProtein, targetCarbs, targetFats, userId, manualFoods } = body;

    if (!dietId || !userId) throw new Error('Missing required parameters');

    // Se manualFoods foi enviado, processar seleção manual
    if (manualFoods && Array.isArray(manualFoods) && manualFoods.length > 0) {
      console.log(`🎯 Modo manual: ${manualFoods.length} refeições com alimentos pré-selecionados`);
      console.log('📋 Manual foods received:', JSON.stringify(manualFoods, null, 2));

      // Buscar informações completas dos alimentos selecionados
      const allFoodIds = manualFoods.flatMap((meal: any) => meal.foods.map((f: any) => f.foodId));
      console.log(`🔍 Looking for ${allFoodIds.length} food IDs:`, allFoodIds);

      const { data: selectedFoodsData, error: foodsFetchError } = await supabase
        .from('foods')
        .select('id,name,protein,carbs,fats,calories')
        .in('id', allFoodIds);

      if (foodsFetchError) {
        console.error('❌ Error fetching foods:', foodsFetchError);
        throw new Error(`Failed to fetch foods: ${foodsFetchError.message}`);
      }

      console.log(`✅ Found ${selectedFoodsData?.length || 0} foods:`, selectedFoodsData?.map(f => f.name));

      // Criar prompt específico para ajustar quantidades
      const mealsPrompt = manualFoods.map((meal: any) => {
        const foodsList = meal.foods.map((f: any) => {
          const foodData = selectedFoodsData?.find((fd: any) => fd.id === f.foodId);
          return `  - ${foodData?.name}: ${f.initialQuantity * 100}g inicial (P:${foodData?.protein}g C:${foodData?.carbs}g G:${foodData?.fats}g por 100g)`;
        }).join('\n');
        return `${meal.mealName}:\n${foodsList}`;
      }).join('\n\n');

      const manualPrompt = `🎯 META DIÁRIA (NÃO ULTRAPASSAR):
- Calorias: ${targetCalories} kcal
- Proteínas: ${targetProtein}g
- Carboidratos: ${targetCarbs}g
- Gorduras: ${targetFats}g

📋 ESTRATÉGIA: ${strategy || 'Manutenção'}

👨‍🍳 ALIMENTOS PRÉ-SELECIONADOS PELO USUÁRIO:
${mealsPrompt}

📝 SUA TAREFA:
1. Use EXATAMENTE os alimentos que o usuário selecionou para cada refeição
2. AJUSTE APENAS AS QUANTIDADES para bater nas metas nutricionais
3. Mantenha os nomes das refeições como fornecidos
4. Quantity é em múltiplos de 100g (ex: 1.5 = 150g)
5. Tente ficar o mais próximo possível das metas sem ultrapassar

Responda APENAS com JSON no formato:
{"meals":[{"name":"Nome da Refeição","foods":[{"foodName":"Nome Exato","quantity":1.5}]}]}`;

      console.log('📤 Sending prompt to Gemini AI...');

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: manualPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8000 }
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('❌ Gemini API error:', errorText);
        throw new Error(`Gemini API failed: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      console.log('📥 Gemini response received');

      let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('📝 Raw AI response:', rawText);

      // Limpar a resposta da IA
      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Função para tentar múltiplas estratégias de correção
      const tryParseJSON = (text: string): any => {
        const strategies = [
          // Estratégia 1: Parse direto
          (t: string) => JSON.parse(t),

          // Estratégia 2: Corrigir vírgulas extras
          (t: string) => JSON.parse(
            t.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
          ),

          // Estratégia 3: Corrigir falta de vírgulas entre objetos/arrays
          (t: string) => JSON.parse(
            t.replace(/}\s*{/g, '},{').replace(/]\s*\[/g, '],[')
          ),

          // Estratégia 4: Corrigir todas as vírgulas
          (t: string) => JSON.parse(
            t.replace(/,\s*}/g, '}')
             .replace(/,\s*]/g, ']')
             .replace(/}\s*{/g, '},{')
             .replace(/]\s*\[/g, '],[')
          ),

          // Estratégia 5: Remover quebras de linha extras e espaços
          (t: string) => JSON.parse(
            t.replace(/\n\s*\n/g, '\n')
             .replace(/,\s*}/g, '}')
             .replace(/,\s*]/g, ']')
          ),

          // Estratégia 6: Extrair apenas o primeiro objeto JSON válido
          (t: string) => {
            const match = t.match(/\{[\s\S]*\}/);
            if (match) {
              return JSON.parse(
                match[0]
                  .replace(/,\s*}/g, '}')
                  .replace(/,\s*]/g, ']')
              );
            }
            throw new Error('No JSON object found');
          }
        ];

        let lastError;
        for (const strategy of strategies) {
          try {
            return strategy(text);
          } catch (e: any) {
            lastError = e;
            continue;
          }
        }
        throw lastError;
      };

      let dietPlan;
      try {
        dietPlan = tryParseJSON(rawText);
        console.log('✅ Diet plan parsed:', dietPlan);
      } catch (parseError: any) {
        console.error('❌ Failed to parse AI response after all strategies:', parseError.message);
        console.error('📄 Raw text that failed:', rawText);
        throw new Error(`Invalid AI response: ${parseError.message}`);
      }

      // Validar estrutura
      if (!dietPlan.meals || !Array.isArray(dietPlan.meals)) {
        throw new Error('Invalid diet plan structure: missing meals array');
      }

      // Deletar refeições e alimentos existentes
      const { data: existingMeals } = await supabase
        .from('meals')
        .select('id')
        .eq('diet_id', dietId);

      if (existingMeals && existingMeals.length > 0) {
        const mealIds = existingMeals.map((m: any) => m.id);
        await supabase.from('meal_foods').delete().in('meal_id', mealIds);
        await supabase.from('meals').delete().in('id', mealIds);
      }

      // Inserir novas refeições
      console.log(`📝 Inserting ${dietPlan.meals.length} meals...`);

      for (const meal of dietPlan.meals) {
        console.log(`🍽️ Creating meal: ${meal.name} with ${meal.foods.length} foods`);

        const { data: newMeal, error: mealError } = await supabase
          .from('meals')
          .insert({ diet_id: dietId, name: meal.name })
          .select()
          .single();

        if (mealError) {
          console.error(`❌ Error creating meal ${meal.name}:`, mealError);
          continue;
        }

        if (newMeal) {
          console.log(`✅ Meal created: ${newMeal.id}`);

          for (const food of meal.foods) {
            console.log(`🔍 Looking for food: ${food.foodName}`);

            const foodData = selectedFoodsData?.find((f: any) => f.name === food.foodName);

            if (foodData) {
              console.log(`✅ Found food: ${foodData.name} (${foodData.id})`);

              const { error: foodError } = await supabase.from('meal_foods').insert({
                meal_id: newMeal.id,
                food_id: foodData.id,
                quantity: food.quantity
              });

              if (foodError) {
                console.error(`❌ Error inserting food ${food.foodName}:`, foodError);
              } else {
                console.log(`✅ Food inserted: ${food.foodName} (${food.quantity})`);
              }
            } else {
              console.error(`❌ Food not found in database: ${food.foodName}`);
              console.log('Available foods:', selectedFoodsData?.map((f: any) => f.name));
            }
          }
        }
      }

      console.log(`✅ All meals processed for diet ${dietId}`);

      return new Response(
        JSON.stringify({ success: true, meals: dietPlan.meals.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Modo automático (IA escolhe tudo)
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

    // Modelos alimentares detalhados
    const dietModels: Record<string, string> = {
      'low-carb': `MODELO LOW CARB:
- Café da Manhã: Ovos (fritos na manteiga, mexidos ou cozidos), bacon artesanal, queijo amarelo (prato, mussarela, parmesão), abacate, coco seco, morango, café preto ou com creme de leite
- Almoço: Carne vermelha (pode ter gordura), sobrecoxa de frango com pele, peixes gordos (salmão, sardinha), brócolis, couve-flor, abobrinha, espinafre, acelga, azeite de oliva, azeitonas
- Lanche da Tarde: Castanhas, nozes, macadâmias, amêndoas, queijo em cubos, salame artesanal, ovos de codorna, coco em lascas
- Jantar: Espaguete de abobrinha, purê de couve-flor, omelete recheado com queijo e bacon, carne moída com vagem, peixe assado`,

      'balanced-cutting': `MODELO CUTTING EQUILIBRADO:
- Priorize proteínas magras (frango, peixe, claras de ovo)
- Carboidratos moderados de fontes integrais (aveia, batata-doce, arroz integral)
- Vegetais em abundância em todas as refeições
- Gorduras saudáveis em quantidade controlada (azeite, abacate, oleaginosas)`,

      'high-carb': `MODELO BULKING TRADICIONAL:
- Café da Manhã: Pão integral, tapioca, cuscuz, aveia, ovos, queijo branco (minas ou ricota), leite desnatado, iogurte natural, mamão, banana, melão
- Lanche da Manhã: Maçã, pera, mix de castanhas (pará, caju, nozes), água de coco
- Almoço: Arroz (integral ou branco), feijão, lentilha, grão-de-bico, batata, mandioca, frango, carne magra (patinho, alcatra), peixe, alface, tomate, cenoura, beterraba, pepino
- Lanche da Tarde: Iogurte natural, frutas picadas, granola sem açúcar, claras de ovos, queijo minas
- Jantar: Saladas variadas, filé de frango grelhado, omelete simples, legumes refogados`,

      'balanced-bulking': `MODELO BULKING LIMPO:
- Alto volume de alimentos de qualidade
- Carboidratos de fontes limpas (arroz integral, batata-doce, aveia, frutas)
- Proteínas variadas (frango, carne magra, peixe, ovos, laticínios)
- Gorduras de qualidade (azeite, abacate, oleaginosas, peixes gordos)
- Evitar alimentos processados`
    };

    const selectedModel = dietModel && dietModels[dietModel] ? dietModels[dietModel] : '';

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

${selectedModel ? `\n🎨 MODELO ALIMENTAR A SEGUIR:\n${selectedModel}\n\n⚠️ IMPORTANTE: Use este modelo como REFERÊNCIA PRINCIPAL para escolher os tipos de alimentos. Priorize alimentos similares aos mencionados no modelo!\n` : ''}

🥗 ALIMENTOS DISPONÍVEIS (valores por 100g):
${foodList}

📝 INSTRUÇÕES CRÍTICAS:
1. Crie ${strategyConfig.mealCount} refeições ${strategyConfig.mealsStyle}
2. ${strategyConfig.distribution}
3. ${selectedModel ? 'SIGA O MODELO ALIMENTAR acima como referência principal' : 'Distribua equilibradamente'}
4. Calcule as quantidades para FICAR DENTRO das metas
5. Use porções realistas (ex: 1.5 = 150g, 0.8 = 80g)
6. ⚠️ MÁXIMA VARIEDADE: Use alimentos DIFERENTES em CADA refeição
7. 🎲 Seja criativo! Estilo: ${randomStyle}
8. 🔀 Seed de aleatoriedade: ${combinedSeed}

IMPORTANTE:
- Cada quantity é em múltiplos de 100g
- NUNCA repita alimentos entre refeições
- Crie combinações únicas e interessantes
${selectedModel ? '- Priorize alimentos do MODELO ALIMENTAR quando disponíveis' : ''}`;
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    console.log(`🎲 Seed: ${combinedSeed} | Style: ${randomStyle} | Strategy: ${strategy || 'maintenance'} | Model: ${dietModel || 'none'} | Foods: ${selectedFoods.length}`);

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
