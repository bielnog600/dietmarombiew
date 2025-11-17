import { supabase } from './supabase';
import type { Food, MacroDistribution } from '../types';

interface MealConfig {
  name: string;
  enabled: boolean;
  categories: string[];
  percentage: number;
}

// Calculate optimal portion size based on remaining macros
export function calculateOptimalPortion(
  food: Food,
  remainingMacros: MacroDistribution,
  currentMacros: MacroDistribution,
  remainingCalories: number,
  minPortion: number = 25,  // Minimum 25g portion
  maxPortion: number = 300  // Maximum 300g portion
): number {
  // Calculate portions based on each macro target
  const portions = {
    protein: food.protein > 0 ? (remainingMacros.protein / food.protein) * food.portion_size : 0,
    carbs: food.carbs > 0 ? (remainingMacros.carbs / food.carbs) * food.portion_size : 0,
    fats: food.fats > 0 ? (remainingMacros.fats / food.fats) * food.portion_size : 0
  };

  // Get the smallest non-zero portion that would satisfy any macro
  let portionSize = Math.min(
    ...[portions.protein, portions.carbs, portions.fats]
      .filter(p => p > 0)
  );

  // If no portion was calculated, use minimum portion
  if (!portionSize || !isFinite(portionSize)) {
    portionSize = minPortion;
  }

  // Ensure portion is within bounds
  portionSize = Math.min(maxPortion, Math.max(minPortion, portionSize));

  // Check if this portion would exceed remaining calories
  const foodCalories = Math.round(food.calories * (portionSize / food.portion_size));
  
  if (foodCalories > remainingCalories) {
    // Adjust portion to fit remaining calories
    portionSize = (portionSize * remainingCalories) / foodCalories;
    portionSize = Math.min(maxPortion, Math.max(minPortion, portionSize));
  }

  return Math.round(portionSize);
}

export async function generateDiet(
  targetCalories: number,
  targetMacros: MacroDistribution,
  mealConfigs: MealConfig[]
): Promise<Food[]> {
  // Fetch all foods with their categories
  const { data: foods, error } = await supabase
    .from('foods')
    .select(`
      *,
      food_categories (
        name
      )
    `)
    .order('category_id');

  if (error) throw error;
  if (!foods) return [];

  console.log('=== GENERATE DIET DEBUG ===');
  console.log('Foods fetched:', foods.length);
  if (foods.length > 0) {
    console.log('Sample food:', foods[0]);
    console.log('All categories in foods:', [...new Set(foods.map(f => f.food_categories?.name))]);
  } else {
    console.log('NO FOODS FOUND IN DATABASE!');
  }
  console.log('Meal configs:', mealConfigs);
  console.log('Meal configs count:', mealConfigs.length);
  mealConfigs.forEach(mc => {
    console.log(`Meal "${mc.name}" - Categories:`, mc.categories);
  });

  // Get supplement category ID
  const supplementCategory = foods.find(f => f.food_categories?.name === 'Suplementos')?.category_id;

  // Function to calculate macros from a food portion
  const calculateMacros = (food: Food, portionSize: number): MacroDistribution => {
    const multiplier = portionSize / food.portion_size;
    return {
      protein: food.protein * multiplier,
      carbs: food.carbs * multiplier,
      fats: food.fats * multiplier
    };
  };

  // Function to calculate calories from macros
  const calculateCaloriesFromMacros = (macros: MacroDistribution): number => {
    return Math.round(
      (macros.protein * 4) + // 4 calories per gram of protein
      (macros.carbs * 4) +   // 4 calories per gram of carbs
      (macros.fats * 9)      // 9 calories per gram of fat
    );
  };

  // Function to get foods by category, excluding supplements
  const getFoodsByCategory = (categoryId: string, usedFoods: Set<string>, excludeSupplements: boolean = true): Food[] => {
    return foods
      .filter(food =>
        food.category_id === categoryId &&
        !usedFoods.has(food.id) &&
        (!excludeSupplements || food.category_id !== supplementCategory)
      )
      .sort(() => Math.random() - 0.5); // Randomize food selection
  };

  // Function to check if meal is pre/post workout
  const isWorkoutMeal = (mealName: string): boolean => {
    const normalizedName = mealName.toLowerCase();
    return normalizedName.includes('pré-treino') ||
           normalizedName.includes('pós-treino') ||
           normalizedName.includes('pre-treino') ||
           normalizedName.includes('pos-treino') ||
           normalizedName.includes('pre treino') ||
           normalizedName.includes('pos treino');
  };

  const dietPlan: Food[] = [];
  const usedFoods = new Set<string>();

  // Process each meal
  for (const mealConfig of mealConfigs) {
    if (!mealConfig.enabled) continue;

    const mealTargetCalories = Math.round(targetCalories * mealConfig.percentage);
    const mealTargetMacros = {
      protein: Math.round(targetMacros.protein * mealConfig.percentage),
      carbs: Math.round(targetMacros.carbs * mealConfig.percentage),
      fats: Math.round(targetMacros.fats * mealConfig.percentage)
    };

    let mealCurrentCalories = 0;
    let mealCurrentMacros = { protein: 0, carbs: 0, fats: 0 };

    const isWorkout = isWorkoutMeal(mealConfig.name);

    // If this is a workout meal and supplements exist, add a supplement first
    if (isWorkout && supplementCategory) {
      const supplementFoods = getFoodsByCategory(supplementCategory, usedFoods, false);

      if (supplementFoods.length > 0) {
        // Pick a random supplement
        const supplement = supplementFoods[0];

        const remainingMealMacros = {
          protein: Math.max(0, mealTargetMacros.protein - mealCurrentMacros.protein),
          carbs: Math.max(0, mealTargetMacros.carbs - mealCurrentMacros.carbs),
          fats: Math.max(0, mealTargetMacros.fats - mealCurrentMacros.fats)
        };

        const remainingCalories = mealTargetCalories - mealCurrentCalories;
        const portionSize = calculateOptimalPortion(
          supplement,
          remainingMealMacros,
          mealCurrentMacros,
          remainingCalories
        );

        const supplementMacros = calculateMacros(supplement, portionSize);
        const supplementCalories = calculateCaloriesFromMacros(supplementMacros);

        // Add supplement to diet plan
        dietPlan.push({
          ...supplement,
          portion_size: portionSize
        });

        // Update meal totals
        mealCurrentCalories += supplementCalories;
        mealCurrentMacros.protein += supplementMacros.protein;
        mealCurrentMacros.carbs += supplementMacros.carbs;
        mealCurrentMacros.fats += supplementMacros.fats;

        usedFoods.add(supplement.id);
      }
    }

    // Helper function to add food to meal
    const addFoodToMeal = (food: Food) => {
      const remainingMealMacros = {
        protein: Math.max(0, mealTargetMacros.protein - mealCurrentMacros.protein),
        carbs: Math.max(0, mealTargetMacros.carbs - mealCurrentMacros.carbs),
        fats: Math.max(0, mealTargetMacros.fats - mealCurrentMacros.fats)
      };

      const remainingCalories = mealTargetCalories - mealCurrentCalories;
      const portionSize = calculateOptimalPortion(
        food,
        remainingMealMacros,
        mealCurrentMacros,
        remainingCalories
      );

      const foodMacros = calculateMacros(food, portionSize);
      const foodCalories = calculateCaloriesFromMacros(foodMacros);

      dietPlan.push({
        ...food,
        portion_size: portionSize
      });

      mealCurrentCalories += foodCalories;
      mealCurrentMacros.protein += foodMacros.protein;
      mealCurrentMacros.carbs += foodMacros.carbs;
      mealCurrentMacros.fats += foodMacros.fats;

      usedFoods.add(food.id);
    };

    // Get category IDs by name
    const proteinCategory = foods.find(f => f.food_categories?.name?.includes('Proteínas'))?.category_id;
    const carbCategory = foods.find(f => f.food_categories?.name?.includes('Carboidratos'))?.category_id;
    const fatCategory = foods.find(f => f.food_categories?.name?.includes('Gorduras'))?.category_id;
    const veggieCategory = foods.find(f => f.food_categories?.name?.includes('Verduras') || f.food_categories?.name?.includes('Legumes'))?.category_id;

    // 1. Add exactly 1 protein
    if (proteinCategory) {
      const proteinFoods = getFoodsByCategory(proteinCategory, usedFoods);
      if (proteinFoods.length > 0) {
        addFoodToMeal(proteinFoods[0]);
      }
    }

    // 2. Add 1-2 carbs (randomly choose)
    if (carbCategory) {
      const carbFoods = getFoodsByCategory(carbCategory, usedFoods);
      const numCarbs = Math.random() > 0.5 ? 2 : 1;

      for (let i = 0; i < numCarbs && i < carbFoods.length; i++) {
        addFoodToMeal(carbFoods[i]);
      }
    }

    // 3. Add 1 fat if needed (based on remaining fat macros)
    if (fatCategory && mealCurrentMacros.fats < mealTargetMacros.fats * 0.5) {
      const fatFoods = getFoodsByCategory(fatCategory, usedFoods);
      if (fatFoods.length > 0) {
        addFoodToMeal(fatFoods[0]);
      }
    }

    // 4. Add 1 veggie if meal is lunch or dinner
    const mealNameLower = mealConfig.name.toLowerCase();
    const isMainMeal = mealNameLower.includes('almoço') || mealNameLower.includes('jantar');

    if (isMainMeal && veggieCategory) {
      const veggieFoods = getFoodsByCategory(veggieCategory, usedFoods);
      if (veggieFoods.length > 0) {
        addFoodToMeal(veggieFoods[0]);
      }
    }
  }

  return dietPlan;
}