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

interface Meal {
  id: string;
  name: string;
}

export async function autoDistributeFoods(
  mealSelections: MealSelection[],
  targetProtein: number,
  targetCarbs: number,
  targetFats: number
) {
  console.log('Auto-distribute started with', mealSelections.length, 'meals');

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

  console.log('Target per meal:', { proteinPerMeal, carbsPerMeal, fatsPerMeal });

  for (const selection of mealSelections) {
    if (selection.foodIds.length === 0) continue;

    const mealFoods = selection.foodIds.map(id => foodMap.get(id)!).filter(Boolean);

    const proteinFoods = mealFoods.filter(f => f.protein >= f.carbs && f.protein >= f.fats);
    const carbFoods = mealFoods.filter(f => f.carbs >= f.protein && f.carbs >= f.fats);
    const fatFoods = mealFoods.filter(f => f.fats >= f.protein && f.fats >= f.carbs);

    if (proteinFoods.length === 0) proteinFoods.push(...mealFoods.sort((a, b) => b.protein - a.protein).slice(0, 1));
    if (carbFoods.length === 0) carbFoods.push(...mealFoods.sort((a, b) => b.carbs - a.carbs).slice(0, 1));
    if (fatFoods.length === 0) fatFoods.push(...mealFoods.sort((a, b) => b.fats - a.fats).slice(0, 1));

    const n = mealFoods.length;
    const A: number[][] = [];
    const b: number[] = [proteinPerMeal, carbsPerMeal, fatsPerMeal];

    for (let i = 0; i < 3; i++) {
      A[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === 0) A[i][j] = mealFoods[j].protein;
        else if (i === 1) A[i][j] = mealFoods[j].carbs;
        else A[i][j] = mealFoods[j].fats;
      }
    }

    const quantities = solveLinearSystem(A, b, n);

    for (let i = 0; i < n; i++) {
      const quantity = Math.max(0.1, Math.min(5, quantities[i]));
      mealFoodsToInsert.push({
        meal_id: selection.mealId,
        food_id: mealFoods[i].id,
        quantity
      });
    }

    console.log(`Meal ${selection.mealId}: distributed ${mealFoods.length} foods`);
  }

  const mealIds = mealSelections.map(ms => ms.mealId);
  await supabase.from('meal_foods').delete().in('meal_id', mealIds);

  const { error: insertError } = await supabase
    .from('meal_foods')
    .insert(mealFoodsToInsert);

  if (insertError) throw insertError;

  console.log('Distribution complete!');
}

function solveLinearSystem(A: number[][], b: number[], n: number): number[] {
  const quantities = new Array(n).fill(0);

  if (n === 1) {
    const avgMacro = (b[0] + b[1] + b[2]) / 3;
    const avgFoodMacro = (A[0][0] + A[1][0] + A[2][0]) / 3;
    quantities[0] = avgMacro / (avgFoodMacro || 1);
    return quantities;
  }

  for (let i = 0; i < n; i++) {
    const protein = A[0][i];
    const carbs = A[1][i];
    const fats = A[2][i];

    if (protein > carbs && protein > fats) {
      quantities[i] = b[0] / (protein * n);
    } else if (carbs > protein && carbs > fats) {
      quantities[i] = b[1] / (carbs * n);
    } else {
      quantities[i] = b[2] / (fats * n);
    }
  }

  const currentProtein = quantities.reduce((sum, q, i) => sum + q * A[0][i], 0);
  const currentCarbs = quantities.reduce((sum, q, i) => sum + q * A[1][i], 0);
  const currentFats = quantities.reduce((sum, q, i) => sum + q * A[2][i], 0);

  const proteinRatio = b[0] / (currentProtein || 1);
  const carbsRatio = b[1] / (currentCarbs || 1);
  const fatsRatio = b[2] / (currentFats || 1);
  const avgRatio = (proteinRatio + carbsRatio + fatsRatio) / 3;

  for (let i = 0; i < n; i++) {
    quantities[i] *= avgRatio;
  }

  return quantities;
}
