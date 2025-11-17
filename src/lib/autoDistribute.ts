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

  if (n === 0) return [];

  if (n === 1) {
    const food = foods[0];
    const calsFromProtein = targetProtein * 4;
    const calsFromCarbs = targetCarbs * 4;
    const calsFromFats = targetFats * 9;
    const totalTargetCals = calsFromProtein + calsFromCarbs + calsFromFats;
    const quantity = totalTargetCals / (food.calories || 1);
    return [Math.max(0.5, Math.min(10, quantity))];
  }

  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    A.push([foods[i].protein, foods[i].carbs, foods[i].fats]);
  }

  const b = [targetProtein, targetCarbs, targetFats];

  const quantities = solveLeastSquares(A, b);

  if (quantities.length !== n) {
    console.error('Quantities length mismatch:', quantities.length, 'vs', n);
    return new Array(n).fill(1);
  }

  console.log('Initial quantities:', quantities.map((q, i) => `${foods[i].name}: ${q.toFixed(2)}`));

  for (let iteration = 0; iteration < 50; iteration++) {
    const currentProtein = quantities.reduce((sum, q, i) => sum + q * foods[i].protein, 0);
    const currentCarbs = quantities.reduce((sum, q, i) => sum + q * foods[i].carbs, 0);
    const currentFats = quantities.reduce((sum, q, i) => sum + q * foods[i].fats, 0);

    const proteinError = targetProtein - currentProtein;
    const carbsError = targetCarbs - currentCarbs;
    const fatsError = targetFats - currentFats;

    const totalError = Math.abs(proteinError) + Math.abs(carbsError) + Math.abs(fatsError);

    if (totalError < 1.5) {
      console.log(`Converged after ${iteration + 1} iterations (error: ${totalError.toFixed(2)}g)`);
      break;
    }

    for (let i = 0; i < n; i++) {
      const food = foods[i];
      const totalMacro = food.protein + food.carbs + food.fats;

      if (totalMacro > 0) {
        const proteinWeight = food.protein / totalMacro;
        const carbsWeight = food.carbs / totalMacro;
        const fatsWeight = food.fats / totalMacro;

        const weightedError =
          proteinError * proteinWeight +
          carbsError * carbsWeight +
          fatsError * fatsWeight;

        const adjustment = weightedError / totalMacro * 0.3;
        quantities[i] = Math.max(0.1, quantities[i] + adjustment);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    quantities[i] = Math.max(0.1, Math.min(10, quantities[i]));
  }

  return quantities;
}

function solveLeastSquares(A: number[][], b: number[]): number[] {
  const n = A.length;

  if (n === 0) return [];

  const m = A[0].length;

  const AT: number[][] = [];
  for (let j = 0; j < m; j++) {
    AT[j] = [];
    for (let i = 0; i < n; i++) {
      AT[j][i] = A[i][j];
    }
  }

  const ATA: number[][] = [];
  for (let i = 0; i < m; i++) {
    ATA[i] = [];
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += AT[i][k] * A[k][j];
      }
      ATA[i][j] = sum;
    }
  }

  const ATb: number[] = [];
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let k = 0; k < b.length; k++) {
      sum += AT[i][k] * b[k];
    }
    ATb[i] = sum;
  }

  const x = solveLinearSystem3x3(ATA, ATb);

  const result = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    result[i] = 0;
    for (let j = 0; j < m; j++) {
      result[i] += A[i][j] * x[j];
    }
  }

  const scale = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const total = A[i][0] + A[i][1] + A[i][2];
    if (total > 0) {
      scale[i] = (b[0] * A[i][0] / total + b[1] * A[i][1] / total + b[2] * A[i][2] / total) / total;
    } else {
      scale[i] = 1;
    }
  }

  return scale;
}

function solveLinearSystem3x3(A: number[][], b: number[]): number[] {
  const n = Math.min(A.length, b.length, 3);
  const augmented: number[][] = [];

  for (let i = 0; i < n; i++) {
    augmented[i] = [...A[i], b[i]];
  }

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let j = i; j <= n; j++) {
      augmented[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  const x: number[] = [];
  for (let i = 0; i < n; i++) {
    x[i] = Math.max(0.1, augmented[i][n]);
  }

  return x;
}
