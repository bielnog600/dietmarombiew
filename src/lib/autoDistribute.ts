import { supabase } from './supabase';

interface MealSelection {
  mealId: string;
  foodIds: string[];
}

interface Food {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
}

export async function autoDistributeFoods(
  mealSelections: MealSelection[],
  targetProtein: number,
  targetCarbs: number,
  targetFats: number
) {
  console.log('Auto-distribute started');
  console.log('Target totals:', { targetProtein, targetCarbs, targetFats });

  const allFoodIds = mealSelections.flatMap(ms => ms.foodIds);

  const { data: allFoods, error: foodsError } = await supabase
    .from('foods')
    .select('id, name, protein, carbs, fats, calories')
    .in('id', allFoodIds);

  if (foodsError) throw foodsError;
  if (!allFoods) throw new Error('No foods found');

  const foodMap = new Map<string, Food>();
  allFoods.forEach(food => foodMap.set(food.id, food));

  const mealFoodsToInsert: Array<{ meal_id: string; food_id: string; quantity: number }> = [];

  const totalMealCount = mealSelections.filter(ms => ms.foodIds.length > 0).length;
  const proteinPerMeal = targetProtein / totalMealCount;
  const carbsPerMeal = targetCarbs / totalMealCount;
  const fatsPerMeal = targetFats / totalMealCount;

  console.log('Target per meal:', { proteinPerMeal, carbsPerMeal, fatsPerMeal, totalMeals: totalMealCount });

  for (const selection of mealSelections) {
    if (selection.foodIds.length === 0) continue;

    const mealFoods = selection.foodIds.map(id => foodMap.get(id)!).filter(Boolean);

    console.log(`\nProcessing meal: ${selection.mealId}`);
    console.log('Foods selected:', mealFoods.map(f => f.name));

    const quantities = calculateOptimalQuantities(
      mealFoods,
      proteinPerMeal,
      carbsPerMeal,
      fatsPerMeal
    );

    const totalMacros = {
      protein: quantities.reduce((sum, q, i) => sum + q * mealFoods[i].protein, 0),
      carbs: quantities.reduce((sum, q, i) => sum + q * mealFoods[i].carbs, 0),
      fats: quantities.reduce((sum, q, i) => sum + q * mealFoods[i].fats, 0)
    };

    console.log('Calculated quantities:', quantities.map((q, i) => `${mealFoods[i].name}: ${q.toFixed(2)}`));
    console.log('Meal totals:', totalMacros);

    for (let i = 0; i < mealFoods.length; i++) {
      mealFoodsToInsert.push({
        meal_id: selection.mealId,
        food_id: mealFoods[i].id,
        quantity: quantities[i]
      });
    }
  }

  const finalTotals = {
    protein: mealFoodsToInsert.reduce((sum, mf) => {
      const food = foodMap.get(mf.food_id)!;
      return sum + food.protein * mf.quantity;
    }, 0),
    carbs: mealFoodsToInsert.reduce((sum, mf) => {
      const food = foodMap.get(mf.food_id)!;
      return sum + food.carbs * mf.quantity;
    }, 0),
    fats: mealFoodsToInsert.reduce((sum, mf) => {
      const food = foodMap.get(mf.food_id)!;
      return sum + food.fats * mf.quantity;
    }, 0)
  };

  console.log('\n=== FINAL TOTALS ===');
  console.log('Target:', { targetProtein, targetCarbs, targetFats });
  console.log('Actual:', finalTotals);
  console.log('Difference:', {
    protein: (finalTotals.protein - targetProtein).toFixed(1),
    carbs: (finalTotals.carbs - targetCarbs).toFixed(1),
    fats: (finalTotals.fats - targetFats).toFixed(1)
  });

  const mealIds = mealSelections.map(ms => ms.mealId);
  await supabase.from('meal_foods').delete().in('meal_id', mealIds);

  const { error: insertError } = await supabase
    .from('meal_foods')
    .insert(mealFoodsToInsert);

  if (insertError) throw insertError;

  console.log('Distribution complete!');
}

function calculateOptimalQuantities(
  foods: Food[],
  targetProtein: number,
  targetCarbs: number,
  targetFats: number
): number[] {
  const n = foods.length;
  const quantities = new Array(n).fill(0);

  if (n === 1) {
    const food = foods[0];
    const proteinQ = targetProtein / (food.protein || 1);
    const carbsQ = targetCarbs / (food.carbs || 1);
    const fatsQ = targetFats / (food.fats || 1);
    quantities[0] = Math.max(0.5, Math.min(5, (proteinQ + carbsQ + fatsQ) / 3));
    return quantities;
  }

  const proteinFoods: number[] = [];
  const carbFoods: number[] = [];
  const fatFoods: number[] = [];

  for (let i = 0; i < n; i++) {
    const food = foods[i];
    if (food.protein >= food.carbs && food.protein >= food.fats) {
      proteinFoods.push(i);
    }
    if (food.carbs >= food.protein && food.carbs >= food.fats) {
      carbFoods.push(i);
    }
    if (food.fats >= food.protein && food.fats >= food.carbs) {
      fatFoods.push(i);
    }
  }

  if (proteinFoods.length === 0) proteinFoods.push(0);
  if (carbFoods.length === 0) carbFoods.push(n > 1 ? 1 : 0);
  if (fatFoods.length === 0) fatFoods.push(n > 2 ? 2 : 0);

  for (const idx of proteinFoods) {
    quantities[idx] = targetProtein / (foods[idx].protein * proteinFoods.length || 1);
  }
  for (const idx of carbFoods) {
    quantities[idx] = targetCarbs / (foods[idx].carbs * carbFoods.length || 1);
  }
  for (const idx of fatFoods) {
    quantities[idx] = targetFats / (foods[idx].fats * fatFoods.length || 1);
  }

  for (let iteration = 0; iteration < 10; iteration++) {
    const currentProtein = quantities.reduce((sum, q, i) => sum + q * foods[i].protein, 0);
    const currentCarbs = quantities.reduce((sum, q, i) => sum + q * foods[i].carbs, 0);
    const currentFats = quantities.reduce((sum, q, i) => sum + q * foods[i].fats, 0);

    const proteinError = targetProtein - currentProtein;
    const carbsError = targetCarbs - currentCarbs;
    const fatsError = targetFats - currentFats;

    if (Math.abs(proteinError) < 1 && Math.abs(carbsError) < 1 && Math.abs(fatsError) < 1) {
      break;
    }

    for (const idx of proteinFoods) {
      if (foods[idx].protein > 0) {
        quantities[idx] += (proteinError / proteinFoods.length) / foods[idx].protein;
      }
    }
    for (const idx of carbFoods) {
      if (foods[idx].carbs > 0) {
        quantities[idx] += (carbsError / carbFoods.length) / foods[idx].carbs;
      }
    }
    for (const idx of fatFoods) {
      if (foods[idx].fats > 0) {
        quantities[idx] += (fatsError / fatFoods.length) / foods[idx].fats;
      }
    }
  }

  for (let i = 0; i < n; i++) {
    quantities[i] = Math.max(0.1, Math.min(10, quantities[i]));
  }

  return quantities;
}
