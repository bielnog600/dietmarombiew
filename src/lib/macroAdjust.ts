import { supabase } from './supabase';
import type { Diet } from '../types';

interface MacroRichFood {
  name: string;
  protein: number;
  carbs: number;
  fats: number;
  portion_size: number;
}

const MACRO_RICH_FOODS: Record<string, MacroRichFood> = {
  protein: { name: 'Peito de Frango', protein: 31, carbs: 0, fats: 3.6, portion_size: 100 },
  carbs: { name: 'Arroz Branco', protein: 2.7, carbs: 28, fats: 0.3, portion_size: 100 },
  fats: { name: 'Azeite de Oliva', protein: 0, carbs: 0, fats: 100, portion_size: 10 }
};

const MEAL_DISTRIBUTIONS = {
  cutting: [
    { protein: 0.30, carbs: 0.20, fats: 0.20 },
    { protein: 0.15, carbs: 0.25, fats: 0.10 },
    { protein: 0.25, carbs: 0.35, fats: 0.08 },
    { protein: 0.20, carbs: 0.15, fats: 0.25 },
    { protein: 0.10, carbs: 0.05, fats: 0.37 }
  ],
  bulking: [
    { protein: 0.25, carbs: 0.20, fats: 0.20 },
    { protein: 0.20, carbs: 0.25, fats: 0.15 },
    { protein: 0.25, carbs: 0.30, fats: 0.15 },
    { protein: 0.20, carbs: 0.20, fats: 0.30 },
    { protein: 0.10, carbs: 0.05, fats: 0.20 }
  ]
};

export async function adjustMacrosWithStrategy(
  diet: Diet,
  strategy: 'cutting' | 'bulking'
): Promise<{ portions: Record<string, number>; foodsAdded: boolean }> {
  if (!diet.meals || diet.meals.length === 0) {
    return { portions: {}, foodsAdded: false };
  }

  const targetProtein = diet.macros?.protein || Math.round((diet.calories * 0.4) / 4);
  const targetCarbs = diet.macros?.carbs || Math.round((diet.calories * 0.3) / 4);
  const targetFats = diet.macros?.fats || Math.round((diet.calories * 0.3) / 9);

  const distribution = MEAL_DISTRIBUTIONS[strategy];
  const portions: Record<string, number> = {};
  let foodsAdded = false;

  for (let mealIndex = 0; mealIndex < diet.meals.length; mealIndex++) {
    const meal = diet.meals[mealIndex];
    const mealDist = distribution[Math.min(mealIndex, distribution.length - 1)];
    const mealTargetProtein = targetProtein * mealDist.protein;
    const mealTargetCarbs = targetCarbs * mealDist.carbs;
    const mealTargetFats = targetFats * mealDist.fats;

    const mealFoods = meal.meal_foods || [];

    mealFoods.forEach(mf => {
      portions[mf.id] = Math.round(mf.quantity * mf.food.portion_size);
    });

    let lastProteinDiff = 0;
    let lastCarbsDiff = 0;
    let lastFatsDiff = 0;

    for (let iteration = 0; iteration < 200; iteration++) {
      let currentProtein = 0;
      let currentCarbs = 0;
      let currentFats = 0;

      mealFoods.forEach(mf => {
        const grams = portions[mf.id] || 0;
        const multiplier = grams / mf.food.portion_size;
        currentProtein += mf.food.protein * multiplier;
        currentCarbs += mf.food.carbs * multiplier;
        currentFats += mf.food.fats * multiplier;
      });

      const proteinDiff = currentProtein - mealTargetProtein;
      const carbsDiff = currentCarbs - mealTargetCarbs;
      const fatsDiff = currentFats - mealTargetFats;

      lastProteinDiff = proteinDiff;
      lastCarbsDiff = carbsDiff;
      lastFatsDiff = fatsDiff;

      if (Math.abs(proteinDiff) <= 2 && Math.abs(carbsDiff) <= 2 && Math.abs(fatsDiff) <= 1) {
        break;
      }

      const proteinFoods = mealFoods.filter(mf => (mf.food.protein / mf.food.portion_size) > 0.15);
      const carbsFoods = mealFoods.filter(mf => (mf.food.carbs / mf.food.portion_size) > 0.15);
      const fatsFoods = mealFoods.filter(mf => (mf.food.fats / mf.food.portion_size) > 0.05);

      const priorityMacro = Math.max(
        Math.abs(proteinDiff),
        Math.abs(carbsDiff),
        Math.abs(fatsDiff) * 2
      );

      if (priorityMacro === Math.abs(proteinDiff) && proteinFoods.length > 0) {
        const adjustmentPerFood = -proteinDiff / proteinFoods.length;
        proteinFoods.forEach(mf => {
          const proteinPerGram = mf.food.protein / mf.food.portion_size;
          const gramsAdjustment = adjustmentPerFood / proteinPerGram;
          const currentGrams = portions[mf.id];
          const newGrams = currentGrams + gramsAdjustment;
          if (newGrams >= 30) {
            portions[mf.id] = Math.round(newGrams);
          }
        });
      } else if (priorityMacro === Math.abs(carbsDiff) && carbsFoods.length > 0) {
        const adjustmentPerFood = -carbsDiff / carbsFoods.length;
        carbsFoods.forEach(mf => {
          const carbsPerGram = mf.food.carbs / mf.food.portion_size;
          const gramsAdjustment = adjustmentPerFood / carbsPerGram;
          const currentGrams = portions[mf.id];
          const newGrams = currentGrams + gramsAdjustment;
          if (newGrams >= 30) {
            portions[mf.id] = Math.round(newGrams);
          }
        });
      } else if (fatsFoods.length > 0) {
        const adjustmentPerFood = -fatsDiff / fatsFoods.length;
        fatsFoods.forEach(mf => {
          const fatsPerGram = mf.food.fats / mf.food.portion_size;
          const gramsAdjustment = (adjustmentPerFood / fatsPerGram) * 0.3;
          const currentGrams = portions[mf.id];
          const newGrams = currentGrams + gramsAdjustment;
          if (newGrams >= 30) {
            portions[mf.id] = Math.round(newGrams);
          }
        });
      } else {
        break;
      }
    }

    if (mealFoods.length === 0) continue;

    const needsProtein = lastProteinDiff < -8;
    const needsCarbs = lastCarbsDiff < -8;
    const needsFats = lastFatsDiff < -5;

    if (!needsProtein && !needsCarbs && !needsFats) continue;

    const proteinFoods = mealFoods.filter(mf => (mf.food.protein / mf.food.portion_size) > 0.2);
    const carbsFoods = mealFoods.filter(mf => (mf.food.carbs / mf.food.portion_size) > 0.2);
    const fatsFoods = mealFoods.filter(mf => (mf.food.fats / mf.food.portion_size) > 0.08);

    if (needsCarbs && carbsFoods.length === 0) {
      const foodData = MACRO_RICH_FOODS.carbs;
      const gramsNeeded = (Math.abs(lastCarbsDiff) / foodData.carbs) * foodData.portion_size;
      await addOrUpdateFoodInMeal(meal.id, foodData, Math.max(50, Math.round(gramsNeeded)));
      foodsAdded = true;
    }

    if (needsProtein && proteinFoods.length === 0) {
      const foodData = MACRO_RICH_FOODS.protein;
      const gramsNeeded = (Math.abs(lastProteinDiff) / foodData.protein) * foodData.portion_size;
      await addOrUpdateFoodInMeal(meal.id, foodData, Math.max(50, Math.round(gramsNeeded)));
      foodsAdded = true;
    }

    if (needsFats && fatsFoods.length === 0) {
      const foodData = MACRO_RICH_FOODS.fats;
      const gramsNeeded = (Math.abs(lastFatsDiff) / foodData.fats) * foodData.portion_size;
      await addOrUpdateFoodInMeal(meal.id, foodData, Math.max(10, Math.round(gramsNeeded)));
      foodsAdded = true;
    }
  }

  return { portions, foodsAdded };
}

async function addOrUpdateFoodInMeal(
  mealId: string,
  foodData: MacroRichFood,
  quantity: number
): Promise<void> {
  try {
    let { data: existingFood } = await supabase
      .from('foods')
      .select('id')
      .eq('name', foodData.name)
      .maybeSingle();

    let foodId: string;

    if (!existingFood) {
      const calories = Math.round(foodData.protein * 4 + foodData.carbs * 4 + foodData.fats * 9);

      const { data: newFood, error: foodError } = await supabase
        .from('foods')
        .insert({
          name: foodData.name,
          protein: foodData.protein,
          carbs: foodData.carbs,
          fats: foodData.fats,
          portion_size: foodData.portion_size,
          calories: calories,
          portion: `${foodData.portion_size}g`
        })
        .select()
        .single();

      if (foodError) throw foodError;
      foodId = newFood.id;
    } else {
      foodId = existingFood.id;
    }

    const { data: existingMealFood } = await supabase
      .from('meal_foods')
      .select('id, quantity')
      .eq('meal_id', mealId)
      .eq('food_id', foodId)
      .maybeSingle();

    const normalizedQuantity = quantity / foodData.portion_size;

    if (existingMealFood) {
      const { error: updateError } = await supabase
        .from('meal_foods')
        .update({ quantity: existingMealFood.quantity + normalizedQuantity })
        .eq('id', existingMealFood.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('meal_foods')
        .insert({
          meal_id: mealId,
          food_id: foodId,
          quantity: normalizedQuantity
        });

      if (insertError) throw insertError;
    }
  } catch (err) {
    console.error('Error adding/updating food in meal:', err);
    throw err;
  }
}
