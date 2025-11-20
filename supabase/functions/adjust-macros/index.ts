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

    // 🔍 Buscar as dietas da semana atual para evitar repetições
    const { data: currentWeekDiet } = await supabase
      .from('diets')
      .select(`
        id,
        day_of_week,
        meals (
          id,
          name,
          diet_foods (
            food_id,
            foods (
              name
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_weekly', true)
      .neq('id', dietId);

    console.log('📅 Found existing diets in week:', currentWeekDiet?.length || 0);

    // Extrair os alimentos já usados nas outras dietas da semana
    const usedFoodsInWeek: string[] = [];
    if (currentWeekDiet && currentWeekDiet.length > 0) {
      currentWeekDiet.forEach((d: any) => {
        d.meals?.forEach((meal: any) => {
          meal.diet_foods?.forEach((df: any) => {
            if (df.foods?.name) {
              usedFoodsInWeek.push(df.foods.name);
            }
          });
        });
      });
    }

    // Contar frequência de uso de cada alimento
    const foodFrequency: Record<string, number> = {};
    usedFoodsInWeek.forEach(food => {
      foodFrequency[food] = (foodFrequency[food] || 0) + 1;
    });

    // Criar lista de alimentos frequentemente usados (aparecem 2+ vezes)
    const overusedFoods = Object.entries(foodFrequency)
      .filter(([_, count]) => count >= 2)
      .map(([food, _]) => food);

    console.log('🚫 Overused foods to avoid:', overusedFoods.length > 0 ? overusedFoods : 'None');
    console.log('📊 Food frequency:', foodFrequency);

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

    // Gerar número ÚNICO para GARANTIR variedade absoluta
    const timestamp = Date.now();
    const randomSeed = Math.floor(Math.random() * 1000000) + timestamp;

    // Detectar se é dieta baixa caloria (cutting)
    const isLowCalorie = targetCalories < 1600;
    const isCutting = strategy.toLowerCase().includes('cut');

    console.log(`📊 Diet analysis: ${targetCalories} kcal, Strategy: ${strategy}, Low calorie: ${isLowCalorie}, Cutting: ${isCutting}`);

    // Expandir estilos de dieta com MUITO mais variações
    const dietStyles = [
      'equilibrada', 'low carb', 'flexível', 'moderada em carbs', 'rica em proteína',
      'mediterrânea', 'alta proteína', 'low fat', 'carb cycling', 'paleo',
      'clean eating', 'flexible dieting', 'cetogênica moderada', 'plant-forward'
    ];
    const selectedStyle = dietStyles[Math.floor(Math.random() * dietStyles.length)];

    console.log(`🎨 Selected diet style: ${selectedStyle} (Seed: ${randomSeed})`);

    // Instruções específicas por estilo de dieta (EXPANDIDO)
    const styleInstructions: Record<string, string> = {
      'equilibrada': '⚖️ Distribua os macros de forma balanceada. Varie as fontes de proteína em cada refeição.',
      'low carb': '🥑 PRIORIZE gorduras boas e proteínas. REDUZA carboidratos drasticamente. Use abacate, azeite, castanhas, carnes gordas.',
      'flexível': '🎯 Misture TODAS as fontes: carnes VARIADAS, peixes DIFERENTES, ovos, grãos, tubérculos. Seja EXTREMAMENTE criativo!',
      'moderada em carbs': '🌾 Carboidratos moderados em pré/pós-treino. Use batata doce, arroz integral. Gorduras elevadas.',
      'rica em proteína': '💪 MAXIMIZE proteínas: ovos, frango, carne, peixe, iogurte em TODAS as refeições. Carbs baixos.',
      'mediterrânea': '🫒 PEIXES (salmão, atum, sardinha), azeite abundante, vegetais, grãos integrais, castanhas.',
      'alta proteína': '🥩 Foque em carnes magras, clara de ovos, frango, peixe branco. 40%+ das calorias de proteína.',
      'low fat': '🍗 Proteínas MAGRAS (peito frango, peixe branco, clara ovos). MINIMIZE gorduras. Carbs moderados/altos.',
      'carb cycling': '🔄 Alterne carbs altos e baixos. Hoje: ALTO em pré/pós treino, BAIXO no resto.',
      'paleo': '🦴 Carnes, ovos, vegetais, frutas, castanhas. EVITE grãos, laticínios, processados.',
      'clean eating': '🌱 Alimentos INTEGRAIS e não processados. Variedade de cores nos vegetais.',
      'flexible dieting': '🎨 MÁXIMA VARIEDADE! Use alimentos diferentes a cada dia. Seja criativo!',
      'cetogênica moderada': '🥓 Gorduras ALTAS (60-70%), proteínas moderadas, carbs MUITO baixos (<50g).',
      'plant-forward': '🌿 Priorize vegetais, leguminosas, grãos. Proteína animal em menor quantidade.'
    };

    const styleInstruction = styleInstructions[selectedStyle] || styleInstructions['flexível'];

    // Instruções especiais para cutting/low calorie
    let cuttingInstructions = '';
    if (isLowCalorie || isCutting) {
      cuttingInstructions = `

🔥 ATENÇÃO: DIETA DE CUTTING / BAIXA CALORIA (${targetCalories} kcal)

📋 ALIMENTOS PRIORIZADOS PARA CUTTING:
✅ Carboidratos de BAIXO índice glicêmico e MENOS densos:
   - Batata doce (ao invés de arroz branco)
   - Batata inglesa (menos carbs que arroz)
   - Aveia (pequenas porções: 15-30g)
   - Vegetais: brócolis, couve-flor, abobrinha (VOLUMOSOS, baixa caloria)

✅ Proteínas MAGRAS (baixa gordura):
   - Frango (peito sem pele)
   - Peixe branco (tilápia, merluza)
   - Clara de ovos (priorizar sobre ovos inteiros)
   - Atum em água
   - Carne magra (patinho, alcatra)

✅ Gorduras em PEQUENAS quantidades:
   - Azeite: 5-10ml por refeição (quantity 0.05-0.10)
   - Pasta amendoim: 5-10g (quantity 0.05-0.10)
   - Castanhas: 8-15g (quantity 0.08-0.15)

❌ EVITE EM CUTTING:
   - Arroz em grandes quantidades (prefira batata inglesa)
   - Ovos inteiros em excesso (máximo 2-3 unidades/dia, use mais claras)
   - Massas, pães, tapioca
   - Gorduras em excesso

⚖️ DISTRIBUIÇÃO INTELIGENTE:
   - NÃO concentre toda proteína no café da manhã
   - Café da manhã: 2-3 ovos inteiros + 2-3 claras (OU só claras)
   - Distribua proteínas ao longo do dia: 20-30g por refeição
   - Máximo de ovos no café: 150-200g TOTAL (não 300g!)
`;
    }

    // Criar aviso sobre alimentos já usados
    let overusedWarning = '';
    if (overusedFoods.length > 0) {
      overusedWarning = `
🚫 ATENÇÃO: ALIMENTOS JÁ MUITO USADOS NOS OUTROS DIAS DA SEMANA:
${overusedFoods.map(f => `   ❌ ${f}`).join('\n')}

⚠️ EVITE usar estes alimentos! Eles já aparecem em outras dietas da semana.
✅ PRIORIZE alimentos DIFERENTES para criar VARIEDADE na semana!
`;
    }

    const usedFoodsInfo = usedFoodsInWeek.length > 0
      ? `\n📋 ALIMENTOS JÁ USADOS EM OUTROS DIAS: ${[...new Set(usedFoodsInWeek)].join(', ')}`
      : '\n✨ PRIMEIRA DIETA DA SEMANA - Seja criativo!';

    const prompt = `Você é um NUTRICIONISTA PROFISSIONAL criando um plano alimentar completo, VARIADO, CRIATIVO e REALISTA.

🆕 NOVIDADE: Você PODE sugerir novos alimentos que não estão no banco!
Se precisar de um alimento que não está listado, inclua na resposta com informações nutricionais.

🎯 META DIÁRIA TOTAL OBRIGATÓRIA (${strategy.toUpperCase()}):
- Calorias: ${targetCalories} kcal → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Proteína: ${targetProtein}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Carboidratos: ${targetCarbs}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!
- Gorduras: ${targetFats}g → VOCÊ DEVE ATINGIR EXATAMENTE ESTE VALOR!

⚠️ ATENÇÃO: Estes valores são TOTAIS do dia todo, não por refeição!

🎨 ESTILO DA DIETA: "${selectedStyle.toUpperCase()}"
${styleInstruction}

🔄 SEJA CRIATIVO E VARIE: Cada dieta deve ser DIFERENTE! Use combinações variadas de alimentos.
📊 Random Seed: ${randomSeed} - Use este número para garantir VARIAÇÃO ÚNICA!
${usedFoodsInfo}
${overusedWarning}

🆕 VOCÊ PODE SUGERIR NOVOS ALIMENTOS!
Se o banco não tiver o alimento ideal para a variedade que você quer criar:
✅ Sugira novos alimentos no campo "newFoods" do JSON
✅ Use foodId: "NEW_NomeDoAlimento" nas refeições
✅ Exemplos: "NEW_Salmão grelhado", "NEW_Quinoa", "NEW_Iogurte desnatado"
✅ Sempre com valores nutricionais para 100g

💡 LISTA GIGANTE DE ALIMENTOS PARA VARIAR (use DIFERENTES a cada geração!):

🍗 PROTEÍNAS - ALTERNE SEMPRE:
• Carnes: Frango, Peito peru, Carne moída magra, Patinho, Alcatra, Filé mignon, Cupim magro
• Peixes: Salmão, Atum, Tilápia, Bacalhau, Sardinha, Merluza, Linguado, Robalo
• Ovos: Ovos inteiros, Claras, Omelete, Ovos cozidos, Ovos mexidos
• Laticínios: Queijo cottage, Iogurte grego, Ricota, Queijo minas, Leite desnatado
• Outros: Whey protein, Albumina

🍚 CARBOIDRATOS - VARIE MUITO:
• Arroz: Branco, Integral, Basmati, Negro, Selvagem, Arbório
• Batatas: Doce, Inglesa, Baroa, Yacon, Purê
• Massas: Macarrão integral, Penne, Espaguete, Fusilli, Lasanha
• Grãos: Aveia, Quinoa, Granola, Amaranto, Centeio
• Pães: Integral, Francês, Pão de forma, Brioche, Ciabatta
• Outros: Tapioca, Cuscuz, Polenta, Mandioca

🥑 GORDURAS SAUDÁVEIS:
• Oleaginosas: Amêndoas, Castanhas, Nozes, Macadâmia, Pistache, Avelã
• Óleos: Azeite, Óleo de coco, Óleo de abacate
• Sementes: Chia, Linhaça, Gergelim, Girassol
• Outros: Abacate, Pasta de amendoim, Pasta de amêndoa, Manteiga de cacau

🥬 VEGETAIS - ROTACIONE CORES:
• Verdes: Brócolis, Couve, Espinafre, Rúcula, Alface, Agrião, Aspargos
• Alaranjados: Cenoura, Abóbora, Pimentão laranja
• Vermelhos: Tomate, Pimentão vermelho, Beterraba, Rabanete
• Brancos: Couve-flor, Cebola, Alho-poró, Cogumelos, Palmito
• Outros: Abobrinha, Berinjela, Pepino, Chuchu, Vagem

🍎 FRUTAS - CORES DIFERENTES:
• Vermelhas: Morango, Framboesa, Cereja, Melancia, Maçã vermelha
• Amarelas: Banana, Manga, Abacaxi, Maracujá, Pêssego
• Roxas: Uva, Ameixa, Mirtilo, Açaí, Jabuticaba
• Verdes: Kiwi, Maçã verde, Uva verde, Limão
• Laranja: Laranja, Tangerina, Mamão, Caqui

🎯 REGRA DE OURO PARA VARIEDADE:
1. NUNCA use a mesma proteína principal 2x seguidas (segunda frango, terça NÃO frango)
2. ALTERNE carboidratos complexos a cada dia (arroz → batata → aveia → massa)
3. USE NO MÍNIMO 3 cores DIFERENTES de vegetais por dia
4. VARIE as frutas: NUNCA só banana! Use morango, maçã, mamão, etc
5. ALTERNE gorduras: castanhas → azeite → abacate → pasta amendoim
6. USE preparos diferentes: grelhado, assado, cozido, refogado, na air fryer

⚠️ PROIBIDO REPETIR: Se a última geração usou "Frango + Arroz + Brócolis",
a próxima DEVE usar algo completamente diferente como "Salmão + Batata doce + Aspargos"!

${cuttingInstructions}

📋 DISTRIBUIÇÃO SUGERIDA POR REFEIÇÃO (FLEXÍVEL - ajuste conforme o estilo):
${mealPlansText}

🥗 BANCO DE ALIMENTOS DISPONÍVEIS:
${foodsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ INSTRUÇÕES CRÍTICAS PARA CRIAR O PLANO ALIMENTAR:

1. REFEIÇÕES REALISTAS, COERENTES E VARIADAS:

   🎨 SEJA CRIATIVO! Use diferentes combinações a cada dieta:

   ✓ CAFÉ DA MANHÃ - Varie entre estas opções:
     OPÇÃO A: Ovos + Aveia + Banana
     OPÇÃO B: Iogurte + Granola + Frutas
     OPÇÃO C: Omelete + Pão integral + Abacate
     OPÇÃO D: Panqueca de aveia + Pasta amendoim + Frutas vermelhas
     OPÇÃO E: Ovos mexidos + Batata doce + Castanhas

   ✓ PRÉ-TREINO - Varie entre:
     OPÇÃO A: Banana + Pasta amendoim
     OPÇÃO B: Pão integral + Geleia
     OPÇÃO C: Batata doce + Mel
     OPÇÃO D: Aveia + Frutas
     OPÇÃO E: Tapioca + Queijo branco

   ✓ PÓS-TREINO - Varie entre:
     OPÇÃO A: Frango + Arroz + Brócolis
     OPÇÃO B: Atum + Batata doce + Salada
     OPÇÃO C: Carne moída + Macarrão integral + Tomate
     OPÇÃO D: Salmão + Arroz integral + Aspargos
     OPÇÃO E: Peito peru + Batata inglesa + Cenoura

   ✓ JANTAR - Varie entre:
     OPÇÃO A: Frango grelhado + Legumes + Azeite
     OPÇÃO B: Carne vermelha + Salada + Abacate
     OPÇÃO C: Peixe + Quinoa + Vegetais
     OPÇÃO D: Ovos + Batata doce + Espinafre
     OPÇÃO E: Salmão + Arroz basmati + Brócolis

   ✓ CEIA - Varie entre:
     OPÇÃO A: Queijo cottage + Castanhas
     OPÇÃO B: Iogurte grego + Amêndoas
     OPÇÃO C: Ovos cozidos + Abacate
     OPÇÃO D: Atum + Azeite + Tomate
     OPÇÃO E: Whey protein + Pasta amendoim

   💡 DICA IMPORTANTE: Escolha DIFERENTES opções a cada dieta gerada!

2. REGRAS CRÍTICAS PARA VARIAR AS DIETAS (OBRIGATÓRIO - LEIA ATENTAMENTE!):

   🚨 ATENÇÃO: A CADA GERAÇÃO, VOCÊ DEVE CRIAR UMA DIETA COMPLETAMENTE NOVA E DIFERENTE!

   ✅ PROTEÍNAS - ROTAÇÃO OBRIGATÓRIA:
      • Geração 1: Frango
      • Geração 2: Carne bovina
      • Geração 3: Salmão ou Atum
      • Geração 4: Tilápia ou Bacalhau
      • Geração 5: Ovos (omelete)
      • Geração 6: Peru
      • Geração 7: Sardinha
      → NUNCA repita a proteína da geração anterior!

   ✅ CARBOIDRATOS - ROTAÇÃO OBRIGATÓRIA:
      • Geração 1: Arroz branco
      • Geração 2: Batata doce
      • Geração 3: Quinoa ou Arroz integral
      • Geração 4: Macarrão integral
      • Geração 5: Batata inglesa
      • Geração 6: Aveia
      • Geração 7: Tapioca
      → NUNCA repita o carboidrato da geração anterior!

   ✅ VEGETAIS - ROTAÇÃO OBRIGATÓRIA:
      • Geração 1: Brócolis
      • Geração 2: Cenoura
      • Geração 3: Aspargos ou Couve-flor
      • Geração 4: Abobrinha
      • Geração 5: Espinafre
      • Geração 6: Pimentão
      • Geração 7: Tomate
      → Use CORES diferentes!

   ✅ FRUTAS - ROTAÇÃO OBRIGATÓRIA:
      • Geração 1: Banana
      • Geração 2: Morango
      • Geração 3: Maçã
      • Geração 4: Mamão
      • Geração 5: Manga
      • Geração 6: Abacaxi
      • Geração 7: Uvas
      → NUNCA só banana!

   ✅ ESTILO DA DIETA (${selectedStyle}):
      ${styleInstruction}

   ⚠️ TESTE FINAL ANTES DE RESPONDER:
      "Esta combinação de alimentos é DIFERENTE das últimas 5 gerações?"
      Se a resposta for NÃO → MUDE TUDO e tente novamente!

3. ERROS QUE VOCÊ DEVE EVITAR:
   ❌ NÃO gere sempre a mesma dieta
   ❌ NÃO misture frango com aveia no café da manhã
   ❌ NÃO coloque iogurte no jantar
   ❌ NÃO use arroz no café da manhã
   ❌ NÃO exagere nas quantidades (máximo 200g de proteína por refeição)
   ❌ NÃO repita os mesmos alimentos em todas as refeições

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

   ⚠️ QUANTIDADES REALISTAS E PRÁTICAS (PENSE COMO NUTRICIONISTA):

   🍗 PROTEÍNAS (portions mínimas e máximas realistas):
   - Frango, Carne, Peixe: quantity entre 1.0 e 2.5 (100g a 250g)
   - Ovos: quantity entre 2.0 e 4.0 (200g a 400g = 3-6 ovos)
   - Atum em lata: quantity entre 0.8 e 2.0 (80g a 200g)
   - Iogurte: quantity entre 1.5 e 2.5 (150g a 250g)
   - Queijo cottage: quantity entre 1.0 e 2.0 (100g a 200g)

   🍚 CARBOIDRATOS (portions mínimas e máximas realistas):
   - Arroz, Macarrão: quantity entre 0.5 e 2.0 (50g a 200g cru)
   - Batata doce/inglesa: quantity entre 1.5 e 3.0 (150g a 300g)
   - Aveia: quantity entre 0.5 e 1.0 (50g a 100g)
   - Pão integral: quantity entre 0.5 e 1.5 (50g a 150g)
   - Banana: quantity entre 1.0 e 2.0 (100g a 200g = 1-2 bananas médias)
   - Frutas em geral: quantity entre 1.0 e 2.5 (100g a 250g)

   🥑 GORDURAS (portions mínimas e máximas realistas):
   - Azeite: quantity entre 0.1 e 0.3 (10ml a 30ml = 1-2 colheres)
   - Pasta de amendoim: quantity entre 0.2 e 0.5 (20g a 50g = 1-2 colheres)
   - Castanhas, Amêndoas: quantity entre 0.2 e 0.5 (20g a 50g = 1 punhado)
   - Abacate: quantity entre 0.5 e 1.5 (50g a 150g = meio a 1 abacate)

   🥦 VEGETAIS (portions mínimas e máximas realistas):
   - Brócolis, Couve-flor, Cenoura: quantity entre 1.0 e 2.5 (100g a 250g)
   - Saladas verdes: quantity entre 0.5 e 2.0 (50g a 200g)
   - Tomate: quantity entre 1.0 e 2.0 (100g a 200g)

   ❌ NUNCA USE QUANTIDADES ABSURDAS:
   - ❌ ERRADO: 0.1 de banana (10g) → Use no mínimo 1.0 (100g = 1 banana)
   - ❌ ERRADO: 0.05 de pasta de amendoim (5g) → Use no mínimo 0.2 (20g = 1 colher)
   - ❌ ERRADO: 0.2 de frango (20g) → Use no mínimo 1.0 (100g)
   - ❌ ERRADO: 5.0 de arroz (500g cru) → Use no máximo 2.0 (200g cru)

   ✅ PENSE SEMPRE: "Esta quantidade faz sentido na vida real?"

   📋 EXEMPLOS DE REFEIÇÕES REALISTAS (SIGA ESTE MODELO):

   🥣 CAFÉ DA MANHÃ (~20-25% das calorias):
   ✅ CORRETO:
   - Ovos inteiros: quantity 2.0 (200g = 3-4 ovos)
   - Claras: quantity 1.5 (150g = 4-5 claras)
   - Aveia: quantity 0.15-0.50 (15g a 50g)
   - Morangos/Frutas vermelhas: quantity 0.5-1.0 (50g a 100g)

   🔥 LANCHE MANHÃ (~10-15% das calorias):
   ✅ CORRETO:
   - Iogurte grego: quantity 1.0-1.5 (100g a 150g)
   - Amêndoas/Castanhas: quantity 0.08-0.20 (8g a 20g = 1 punhado pequeno)

   💪 ALMOÇO (~25-35% das calorias):
   ✅ CORRETO:
   - Frango/Carne: quantity 1.2-1.8 (120g a 180g)
   - Arroz integral: quantity 0.5-1.0 (50g a 100g cru = 150-300g cozido)
   - Brócolis/Vegetais: quantity 1.0-1.5 (100g a 150g)
   - Azeite: quantity 0.05-0.10 (5ml a 10ml = 1-2 colheres chá)

   ⚡ PRÉ/PÓS-TREINO (~15-25% das calorias):
   ✅ CORRETO:
   - Whey protein: quantity 0.3 (30g = 1 dose)
   - Banana: quantity 0.6-1.0 (60g a 100g)
   - Pasta amendoim: quantity 0.05-0.15 (5g a 15g = 1 colher chá/sopa)

   🌙 JANTAR/CEIA (~15-20% das calorias):
   ✅ CORRETO:
   - Carne magra/Frango: quantity 1.0-1.5 (100g a 150g)
   - Abobrinha/Couve-flor: quantity 1.0-2.0 (100g a 200g)
   - Azeite: quantity 0.05-0.10 (5ml a 10ml)

   ❌ NUNCA FAÇA ISSO:
   - ❌ Frango 0.3 (30g) → Muito pouco!
   - ❌ Banana 0.2 (20g) → 1/5 de banana!
   - ❌ Pasta 0.03 (3g) → Impossível medir!
   - ❌ Arroz 5.0 (500g cru) → Exagerado!

   🎯 REGRA DE OURO: Pense em GRAMAS REAIS! Se não dá pra pesar/comer na vida real, NÃO USE!

4. EXEMPLO DE DIETA PROFISSIONAL (1200 KCAL - CUTTING):

   🥣 Café da manhã (~250 kcal) - DISTRIBUIÇÃO EQUILIBRADA:
   - Ovos inteiros: quantity 1.0-1.5 (100-150g = 2-3 ovos) ← NÃO EXAGERE!
   - Claras: quantity 1.0-1.5 (100-150g = 3-4 claras) ← Use claras para mais proteína
   - Aveia: quantity 0.15-0.30 (15-30g)
   - Morangos: quantity 0.5 (50g)
   Macros: ~25-28g P / 12g C / 7-9g G
   ⚠️ TOTAL de ovos: MÁXIMO 250g (não 300g ou mais!)

   🔥 Lanche manhã (~150 kcal):
   - Iogurte grego light: quantity 1.2 (120g)
   - Amêndoas: quantity 0.08 (8g)
   Macros: ~15g P / 6g C / 6g G

   💪 Almoço (~350 kcal) - PRIORIZE PROTEÍNA AQUI:
   - Peito de frango: quantity 1.4-1.6 (140-160g) ← Proteína principal
   - Batata inglesa: quantity 1.0-1.2 (100-120g) ← Menos carbs que arroz!
   - Brócolis: quantity 1.2-1.5 (120-150g) ← Volumoso, poucas calorias
   - Azeite: quantity 0.05 (5ml = 1 colher chá)
   Macros: ~40g P / 20g C / 8g G

   ⚡ Pré/Pós-treino (~250 kcal):
   - Whey protein: quantity 0.3 (30g = 1 dose)
   - Banana: quantity 0.6 (60g)
   - Pasta amendoim: quantity 0.05 (5g)
   Macros: ~25g P / 18g C / 6g G

   🌙 Jantar/Ceia (~200 kcal):
   - Carne magra/Frango: quantity 1.2 (120g)
   - Abobrinha/Couve-flor: quantity 1.5 (150g)
   - Azeite: quantity 0.05 (5ml)
   Macros: ~27g P / 5g C / 7g G

   TOTAL: ~1200 kcal | 135g P / 63g C / 38g G

   ⚠️ ADAPTE ESTE MODELO para as calorias e macros solicitados!
   Use estas PROPORÇÕES mas ajuste as quantities para atingir os macros exatos!

5. VALIDAÇÃO MATEMÁTICA OBRIGATÓRIA:
   ⚠️ ANTES DE RESPONDER, CALCULE A SOMA TOTAL DE TODOS OS ALIMENTOS DE TODAS AS REFEIÇÕES:

   SOMA TOTAL = [café] + [lanche] + [almoço] + [pré/pós-treino] + [jantar]

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
  ],
  "newFoods": [
    {
      "name": "Nome do novo alimento",
      "protein": 25.0,
      "carbs": 0.0,
      "fats": 5.0,
      "calories": 145,
      "portion_size": 100,
      "category": "Proteína"
    }
  ]
}

⚠️ IMPORTANTE SOBRE NOVOS ALIMENTOS:
- Use "newFoods" APENAS se o alimento NÃO estiver no banco
- PRIORIZE usar alimentos do banco (lista acima)
- Novos alimentos devem ter: name, protein, carbs, fats, calories, portion_size (sempre 100g), category
- Categorias válidas: "Proteína", "Carboidrato", "Gordura", "Vegetal", "Fruta", "Laticínio"
- Valores nutricionais para 100g do alimento
- Foodcomposition.co.uk é uma boa referência para valores nutricionais

⚡ PRIORIDADE MÁXIMA:
1. Criar refeições COERENTES e REALISTAS (café da manhã com alimentos de café)
2. CALCULAR matematicamente as quantities para bater os macros EXATOS
3. VALIDAR: Some todos os macros antes de responder
4. NÃO EXCEDER os limites de quantity por tipo de alimento
5. A soma total DEVE estar dentro das margens: ±3g para macros, ±20 kcal

📋 PASSO A PASSO OBRIGATÓRIO:
1. Monte as refeições com alimentos coerentes (seguindo o MODELO 1200 KCAL acima)
2. Pense em GRAMAS REAIS primeiro: "Quantos gramas eu preciso?"
3. Calcule quantity para cada alimento: quantity = (gramas_desejadas) / (portion_size)
   EXEMPLO: Preciso 140g de frango, portion_size é 100g → quantity = 140/100 = 1.4 ✓
4. Verifique se as quantities fazem sentido (não muito pequenas, não muito grandes)
5. SOME todos os macros de TODAS as refeições
6. COMPARE com a meta: ${targetProtein}g P, ${targetCarbs}g C, ${targetFats}g F
7. Se estiver ABAIXO da meta: AUMENTE as quantities (ex: 1.4 → 1.6)
8. Se estiver ACIMA da meta: REDUZA as quantities (ex: 1.4 → 1.2)
9. Repita até a soma bater na meta (±8g para macros, ±50 kcal)
10. VALIDE NOVAMENTE: Todas as quantities fazem sentido? (mínimos realistas?)
11. Só responda quando: Soma Total ≈ Meta Total E Quantities Realistas ✓

🚨 EXEMPLO DO QUE DEU ERRADO ANTES:
Meta: 178g P, 266g C, 66g F
Sua resposta: 133g P, 147g C, 48g F ❌ ERRADO!
Faltou: 45g P, 119g C, 18g F

Você PRECISA adicionar mais alimentos ou aumentar as quantities até somar 178g P, 266g C, 66g F!

RESPONDA APENAS COM O JSON, SEM MARKDOWN, SEM EXPLICAÇÕES!`;

    console.log('🤖 Calling OpenAI with retry logic...');

    let result: any;
    let attempts = 0;
    const maxAttempts = 5;
    const messages = [
      {
        role: 'system',
        content: `Você é um nutricionista expert, EXTREMAMENTE CRIATIVO, inovador e ANTI-REPETIÇÃO em cálculos de macronutrientes.

🎲 MISSÃO PRINCIPAL: CRIAR DIETAS ÚNICAS E DIFERENTES A CADA GERAÇÃO!

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com JSON válido, sem markdown, sem explicações
2. Calcule EXATAMENTE as quantities para atingir os macros especificados
3. SEJA EXTREMAMENTE CRIATIVO - NUNCA gere a mesma dieta duas vezes!
4. CADA GERAÇÃO DEVE TER PROTEÍNAS, CARBOS E VEGETAIS COMPLETAMENTE DIFERENTES
5. Use o Random Seed (${randomSeed}) como guia para escolhas únicas
6. EVITE alimentos já usados nos outros dias da semana
7. Adapte conforme o estilo: ${selectedStyle}
8. PODE E DEVE sugerir novos alimentos com "newFoods" para criar variedade
9. Pense: "Esta é a ${Math.floor(randomSeed % 100)}ª dieta única que estou criando"

⚠️ QUANTIDADES REALISTAS EM GRAMAS (CRÍTICO):
10. PENSE EM GRAMAS PRIMEIRO, depois converta para quantity
11. EXEMPLO: Preciso 140g de frango → quantity = 140 / 100 (portion_size) = 1.4 ✓
10. NUNCA use quantities absurdas: 0.1 banana (10g), 0.03 pasta (3g) ❌
11. Frango/Carne: 100-250g (quantity 1.0-2.5) ✓
12. Ovos: 200-400g = 3-6 ovos (quantity 2.0-4.0) ✓
13. Banana: 60-200g = meia a 2 bananas (quantity 0.6-2.0) ✓
14. Aveia: 15-100g (quantity 0.15-1.0) ✓
15. Pasta amendoim: 5-50g (quantity 0.05-0.5) ✓
16. Azeite: 5-30ml (quantity 0.05-0.3) ✓

🎯 SIGA O MODELO DA DIETA 1200 KCAL mostrado no prompt!
Use essas PROPORÇÕES e GRAMAS REAIS como referência!

Timestamp: ${Date.now()} - Use este número para garantir variação!`
      },
      { role: 'user', content: prompt }
    ];

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Attempt ${attempts}/${maxAttempts}...`);

      let openaiResponse;
      let retryAfter = 0;

      // Retry logic for rate limits
      for (let retryCount = 0; retryCount < 3; retryCount++) {
        if (retryAfter > 0) {
          console.log(`⏳ Rate limit hit. Waiting ${retryAfter}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        }

        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + openaiKey,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: messages,
            temperature: 1.0, // MÁXIMA criatividade (valor máximo possível)
            max_tokens: 4000,
            top_p: 0.95, // Adiciona mais aleatoriedade
            frequency_penalty: 1.5, // Penaliza repetições MUITO
            presence_penalty: 1.5, // Encoraja novos tokens/alimentos
            // Removido seed para garantir máxima variação
          }),
        });

        if (openaiResponse.status === 429) {
          const errorData = await openaiResponse.json();
          console.warn('⚠️ Rate limit reached:', errorData);

          // Extract wait time from error message (e.g., "Please try again in 7.94s")
          const waitMatch = errorData.error?.message?.match(/try again in ([\d.]+)s/);
          retryAfter = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) + 1 : 10;

          if (retryCount < 2) {
            continue; // Retry
          }
        }

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          throw new Error(`OpenAI API error: ${openaiResponse.statusText} - ${errorText}`);
        }

        break; // Success
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0].message.content.trim();

      console.log('📄 OpenAI response received');

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ No JSON found in response, retrying...');
        continue;
      }

      result = JSON.parse(jsonMatch[0]);

      if (!result.meals || !Array.isArray(result.meals)) {
        console.warn('⚠️ Invalid structure, retrying...');
        continue;
      }

      console.log(`🍽️ Validating ${result.meals.length} meals...`);

      // Validar quantities realistas
      let hasUnrealisticQuantities = false;
      for (const meal of result.meals) {
        const mealNameLower = meal.name.toLowerCase();
        const isBreakfast = mealNameLower.includes('café') || mealNameLower.includes('manhã');

        for (const food of meal.foods || []) {
          const foodData = allFoods.find(f => f.id === food.foodId);
          if (foodData && food.quantity < 0.01) {
            console.warn(`⚠️ Unrealistic quantity: ${foodData.name} = ${food.quantity} (too small!)`);
            hasUnrealisticQuantities = true;
          }
          // Validações específicas por tipo de alimento
          if (foodData) {
            const name = foodData.name.toLowerCase();

            // Validação especial para ovos no café da manhã
            if (isBreakfast && name.includes('ovo') && food.quantity > 2.5) {
              console.warn(`⚠️ ${meal.name}: ${foodData.name} quantity ${food.quantity} EXCESSIVA (máximo 2.5 = 250g no café)`);
              hasUnrealisticQuantities = true;
            }

            // Proteínas: mínimo 80g
            if ((name.includes('frango') || name.includes('carne') || name.includes('peixe') || name.includes('atum')) && food.quantity < 0.8) {
              console.warn(`⚠️ ${foodData.name}: quantity ${food.quantity} muito pequena (mínimo 0.8 = 80g)`);
              hasUnrealisticQuantities = true;
            }

            // Proteínas: máximo razoável por refeição (250g)
            if ((name.includes('frango') || name.includes('carne') || name.includes('peixe')) && food.quantity > 2.5) {
              console.warn(`⚠️ ${meal.name}: ${foodData.name} quantity ${food.quantity} EXCESSIVA (máximo 2.5 = 250g)`);
              hasUnrealisticQuantities = true;
            }

            // Frutas: mínimo metade de uma fruta (50-60g)
            if ((name.includes('banana') || name.includes('maçã') || name.includes('morango')) && food.quantity < 0.5) {
              console.warn(`⚠️ ${foodData.name}: quantity ${food.quantity} muito pequena (mínimo 0.5 = 50g)`);
              hasUnrealisticQuantities = true;
            }

            // Gorduras: podem ser pequenas (5g = 1 colher chá é aceitável)
            if ((name.includes('pasta') || name.includes('amendoim') || name.includes('azeite') || name.includes('castanha')) && food.quantity < 0.05) {
              console.warn(`⚠️ ${foodData.name}: quantity ${food.quantity} muito pequena (mínimo 0.05 = 5g/5ml)`);
              hasUnrealisticQuantities = true;
            }

            // Aveia: mínimo 15g
            if (name.includes('aveia') && food.quantity < 0.15) {
              console.warn(`⚠️ ${foodData.name}: quantity ${food.quantity} muito pequena (mínimo 0.15 = 15g)`);
              hasUnrealisticQuantities = true;
            }
          }
        }
      }

      if (hasUnrealisticQuantities) {
        console.warn('⚠️ Found unrealistic quantities, retrying...');
        continue;
      }

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

      console.log(`📊 Calculated: ${totalKcal.toFixed(0)} kcal | ${totalP.toFixed(1)}g P | ${totalC.toFixed(1)}g C | ${totalF.toFixed(1)}g F`);
      console.log(`🎯 Target: ${targetCalories} kcal | ${targetProtein}g P | ${targetCarbs}g C | ${targetFats}g F`);

      const proteinDiff = totalP - targetProtein;
      const carbsDiff = totalC - targetCarbs;
      const fatsDiff = totalF - targetFats;
      const caloriesDiff = totalKcal - targetCalories;

      if (Math.abs(proteinDiff) <= 10 && Math.abs(carbsDiff) <= 15 && Math.abs(fatsDiff) <= 10 && Math.abs(caloriesDiff) <= 80) {
        console.log('✅ Macros validated successfully!');
        console.log(`📈 Final result: ${totalP.toFixed(1)}g P (${proteinDiff > 0 ? '+' : ''}${proteinDiff.toFixed(1)}g), ${totalC.toFixed(1)}g C (${carbsDiff > 0 ? '+' : ''}${carbsDiff.toFixed(1)}g), ${totalF.toFixed(1)}g F (${fatsDiff > 0 ? '+' : ''}${fatsDiff.toFixed(1)}g)`);
        break;
      }

      console.warn(`⚠️ Attempt ${attempts} failed. Deviations: P ${proteinDiff > 0 ? '+' : ''}${proteinDiff.toFixed(1)}g, C ${carbsDiff > 0 ? '+' : ''}${carbsDiff.toFixed(1)}g, F ${fatsDiff > 0 ? '+' : ''}${fatsDiff.toFixed(1)}g`);

      if (attempts < maxAttempts) {
        messages.push({
          role: 'assistant',
          content: JSON.stringify(result)
        });
        messages.push({
          role: 'user',
          content: `❌ ERRADO! Seus macros totais: ${totalP.toFixed(1)}g P, ${totalC.toFixed(1)}g C, ${totalF.toFixed(1)}g F, ${totalKcal.toFixed(0)} kcal

🎯 Meta obrigatória: ${targetProtein}g P, ${targetCarbs}g C, ${targetFats}g F, ${targetCalories} kcal

📊 DIFERENÇA:
- Proteína: ${proteinDiff > 0 ? 'EXCESSO de ' : 'FALTA '}${Math.abs(proteinDiff).toFixed(1)}g
- Carboidratos: ${carbsDiff > 0 ? 'EXCESSO de ' : 'FALTA '}${Math.abs(carbsDiff).toFixed(1)}g
- Gorduras: ${fatsDiff > 0 ? 'EXCESSO de ' : 'FALTA '}${Math.abs(fatsDiff).toFixed(1)}g

🔧 CORREÇÃO NECESSÁRIA:
${proteinDiff < 0 ? `- AUMENTE proteínas em ${Math.abs(proteinDiff).toFixed(1)}g (adicione mais frango/ovo ou aumente quantities)` : `- REDUZA proteínas em ${proteinDiff.toFixed(1)}g`}
${carbsDiff < 0 ? `- AUMENTE carboidratos em ${Math.abs(carbsDiff).toFixed(1)}g (adicione mais arroz/batata ou aumente quantities)` : `- REDUZA carboidratos em ${carbsDiff.toFixed(1)}g`}
${fatsDiff < 0 ? `- AUMENTE gorduras em ${Math.abs(fatsDiff).toFixed(1)}g (adicione mais azeite/castanhas)` : `- REDUZA gorduras em ${fatsDiff.toFixed(1)}g`}

Refaça o plano corrigindo as quantities. RESPONDA APENAS COM O JSON CORRIGIDO!`
        });
      } else {
        console.error(`❌ All ${maxAttempts} attempts failed. Accepting best attempt.`);
        console.log('⚠️ Using last result despite deviations. User can manually adjust.');
        break;
      }
    }

    // 🔧 AJUSTE MATEMÁTICO AUTOMÁTICO
    console.log('🔧 Applying mathematical adjustment to match targets...');

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

    const proteinDiff = targetProtein - totalP;
    const carbsDiff = targetCarbs - totalC;
    const fatsDiff = targetFats - totalF;

    console.log(`📊 Before adjustment: ${totalP.toFixed(1)}g P, ${totalC.toFixed(1)}g C, ${totalF.toFixed(1)}g F`);
    console.log(`🎯 Need to adjust: P ${proteinDiff > 0 ? '+' : ''}${proteinDiff.toFixed(1)}g, C ${carbsDiff > 0 ? '+' : ''}${carbsDiff.toFixed(1)}g, F ${fatsDiff > 0 ? '+' : ''}${fatsDiff.toFixed(1)}g`);

    // Ajustar proteína
    if (Math.abs(proteinDiff) > 2) {
      const proteinFood = allFoods.find(f => f.protein > 20 && f.carbs < 5); // Frango, peixe, etc
      if (proteinFood) {
        const adjustMeal = result.meals.find(m => m.name.toLowerCase().includes('jantar') || m.name.toLowerCase().includes('almoço'));
        if (adjustMeal) {
          const existingFood = adjustMeal.foods.find(f => f.foodId === proteinFood.id);
          if (existingFood) {
            const adjustment = proteinDiff / proteinFood.protein;
            existingFood.quantity += adjustment;
            console.log(`  ✓ Adjusted ${proteinFood.name} by ${adjustment.toFixed(2)} portions in ${adjustMeal.name}`);
          }
        }
      }
    }

    // Ajustar carboidratos
    if (Math.abs(carbsDiff) > 2) {
      const carbFood = allFoods.find(f => f.carbs > 20 && f.protein < 5); // Arroz, batata, etc
      if (carbFood) {
        const adjustMeal = result.meals.find(m => m.name.toLowerCase().includes('pré') || m.name.toLowerCase().includes('pós'));
        if (adjustMeal) {
          const existingFood = adjustMeal.foods.find(f => f.foodId === carbFood.id);
          if (existingFood) {
            const adjustment = carbsDiff / carbFood.carbs;
            existingFood.quantity += adjustment;
            console.log(`  ✓ Adjusted ${carbFood.name} by ${adjustment.toFixed(2)} portions in ${adjustMeal.name}`);
          }
        }
      }
    }

    // Ajustar gorduras
    if (Math.abs(fatsDiff) > 2) {
      const fatFood = allFoods.find(f => f.fats > 10 && f.protein < 5 && f.carbs < 5); // Azeite, castanhas
      if (fatFood) {
        const adjustMeal = result.meals[0]; // Primeira refeição
        if (adjustMeal) {
          const existingFood = adjustMeal.foods.find(f => f.foodId === fatFood.id);
          if (existingFood) {
            const adjustment = fatsDiff / fatFood.fats;
            existingFood.quantity += adjustment;
            console.log(`  ✓ Adjusted ${fatFood.name} by ${adjustment.toFixed(2)} portions in ${adjustMeal.name}`);
          }
        }
      }
    }

    console.log('✅ Mathematical adjustment complete!');

    // 🆕 Processar novos alimentos sugeridos pelo OpenAI
    if (result.newFoods && Array.isArray(result.newFoods) && result.newFoods.length > 0) {
      console.log(`🆕 Processing ${result.newFoods.length} new foods suggested by AI...`);

      for (const newFood of result.newFoods) {
        try {
          // Verificar se o alimento já existe
          const { data: existingFood } = await supabase
            .from('foods')
            .select('id, name')
            .ilike('name', newFood.name)
            .maybeSingle();

          if (existingFood) {
            console.log(`  ℹ️ Food "${newFood.name}" already exists (ID: ${existingFood.id})`);

            // Substituir referências ao novo alimento pelo existente
            for (const meal of result.meals) {
              for (const food of meal.foods || []) {
                if (food.foodId === 'NEW_' + newFood.name) {
                  food.foodId = existingFood.id;
                  console.log(`  🔄 Replaced NEW_${newFood.name} with existing ID ${existingFood.id}`);
                }
              }
            }
            continue;
          }

          // Buscar ou criar categoria
          let categoryId = null;
          if (newFood.category) {
            const { data: existingCategory } = await supabase
              .from('food_categories')
              .select('id')
              .eq('name', newFood.category)
              .maybeSingle();

            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              const { data: createdCategory } = await supabase
                .from('food_categories')
                .insert({ name: newFood.category })
                .select('id')
                .single();

              if (createdCategory) {
                categoryId = createdCategory.id;
                console.log(`  ✅ Created new category: ${newFood.category}`);
              }
            }
          }

          // Registrar novo alimento
          const { data: createdFood, error: foodError } = await supabase
            .from('foods')
            .insert({
              name: newFood.name,
              protein: newFood.protein || 0,
              carbs: newFood.carbs || 0,
              fats: newFood.fats || 0,
              calories: newFood.calories || Math.round((newFood.protein * 4) + (newFood.carbs * 4) + (newFood.fats * 9)),
              portion_size: newFood.portion_size || 100,
              category_id: categoryId,
              user_id: userId
            })
            .select()
            .single();

          if (foodError) {
            console.error(`  ❌ Error creating food "${newFood.name}":`, foodError);
            continue;
          }

          console.log(`  ✅ Created new food: ${createdFood.name} (ID: ${createdFood.id})`);
          console.log(`     → ${createdFood.protein}g P, ${createdFood.carbs}g C, ${createdFood.fats}g F (${createdFood.calories} kcal)`);

          // Substituir referências temporárias pelo ID real
          for (const meal of result.meals) {
            for (const food of meal.foods || []) {
              if (food.foodId === 'NEW_' + newFood.name) {
                food.foodId = createdFood.id;
                console.log(`  🔄 Replaced NEW_${newFood.name} with new ID ${createdFood.id}`);
              }
            }
          }

          // Adicionar à lista de alimentos disponíveis
          allFoods.push(createdFood);

        } catch (err) {
          console.error(`  ❌ Error processing new food "${newFood.name}":`, err);
        }
      }
    }

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
