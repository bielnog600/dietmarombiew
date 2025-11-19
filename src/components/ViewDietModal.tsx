import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronLeft, ChevronRight, Upload, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Diet, Food, MacroDistribution } from '../types';
import AddFoodModal from './AddFoodModal';
import PasteDietModal from './PasteDietModal';
import { useTranslation } from '../translations';
import { generateDiet } from '../lib/diet';
import { adjustMacrosWithStrategy } from '../lib/macroAdjust';

interface ViewDietModalProps {
  isOpen: boolean;
  onClose: () => void;
  diet: Diet | null;
  userName: string;
  onDietDeleted?: () => void;
}

export default function ViewDietModal({ isOpen, onClose, diet, userName }: ViewDietModalProps) {
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showPasteDietModal, setShowPasteDietModal] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [editingPortions, setEditingPortions] = useState<Record<string, number>>({});
  const [savingPortions, setSavingPortions] = useState<Record<string, boolean>>({});
  const [deletingFoods, setDeletingFoods] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [localDiet, setLocalDiet] = useState<Diet | null>(diet);
  const [previewTotals, setPreviewTotals] = useState<Record<string, any>>({});
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [editingMacros, setEditingMacros] = useState(false);
  const [macroForm, setMacroForm] = useState({
    protein: 0,
    carbs: 0,
    fats: 0
  });
  const [editingCalories, setEditingCalories] = useState(false);
  const [calorieForm, setCalorieForm] = useState(0);
  const [transferringFood, setTransferringFood] = useState<string | null>(null);
  const [transferTargetMeal, setTransferTargetMeal] = useState<string>('');
  const [adjustingQuantities, setAdjustingQuantities] = useState(false);
  const [showMacroStrategyModal, setShowMacroStrategyModal] = useState(false);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(diet?.day_of_week ?? new Date().getDay());
  const [allWeekDiets, setAllWeekDiets] = useState<Diet[]>([]);
  const [addToAllDays, setAddToAllDays] = useState(true);
  const { t } = useTranslation();

  // Initialize selectedDayOfWeek when diet changes
  useEffect(() => {
    if (diet?.day_of_week !== undefined) {
      setSelectedDayOfWeek(diet.day_of_week);
    }
  }, [diet?.id]);

  // Load all week diets
  useEffect(() => {
    const loadAllWeekDiets = async () => {
      if (!diet?.user_id) return;

      try {
        const { data: diets, error: fetchError } = await supabase
          .from('diets')
          .select(`
            *,
            meals:meals(
              *,
              meal_foods:meal_foods(
                *,
                food:foods(*, food_categories(*))
              )
            ),
            macros:diet_macros(*)
          `)
          .eq('user_id', diet.user_id)
          .order('day_of_week', { ascending: true });

        if (fetchError) throw fetchError;

        setAllWeekDiets(diets || []);

        const currentDayDiet = diets?.find(d => d.day_of_week === selectedDayOfWeek);
        if (currentDayDiet) {
          setLocalDiet(currentDayDiet);
        }
      } catch (err) {
        console.error('Error loading week diets:', err);
      }
    };

    loadAllWeekDiets();
  }, [diet?.user_id, selectedDayOfWeek]);

  // Update local diet when prop changes
  useEffect(() => {
    setPreviewTotals({});
    if (localDiet?.macros) {
      setMacroForm({
        protein: localDiet.macros.protein,
        carbs: localDiet.macros.carbs,
        fats: localDiet.macros.fats
      });
    }
    setCalorieForm(localDiet?.calories || 0);
  }, [localDiet]);

  const refreshDietData = async () => {
    if (!diet?.user_id) return;

    try {
      setError('');

      // Reload all week diets
      const { data: diets, error: fetchError } = await supabase
        .from('diets')
        .select(`
          *,
          meals:meals(
            *,
            meal_foods:meal_foods(
              *,
              food:foods(*, food_categories(*))
            )
          ),
          macros:diet_macros(*)
        `)
        .eq('user_id', diet.user_id)
        .order('day_of_week', { ascending: true });

      if (fetchError) throw fetchError;

      if (diets) {
        setAllWeekDiets(diets);

        // Find and set the current day's diet
        const currentDayDiet = diets.find(d => d.day_of_week === selectedDayOfWeek);
        if (currentDayDiet) {
          setLocalDiet(currentDayDiet);
          setPreviewTotals({});
          if (currentDayDiet.macros) {
            setMacroForm({
              protein: currentDayDiet.macros.protein,
              carbs: currentDayDiet.macros.carbs,
              fats: currentDayDiet.macros.fats
            });
          }
          setCalorieForm(currentDayDiet.calories);
        }
      }
    } catch (err) {
      console.error('Error refreshing diet data:', err);
      setError('Erro ao atualizar os dados da dieta');
    }
  };

  const handleGenerateNewDiet = async () => {
    if (!localDiet || generatingDiet) return;
    setGeneratingDiet(true);
    setError('');

    try {
      // Get all food categories from database
      const { data: categoriesData } = await supabase
        .from('food_categories')
        .select('id');

      const allCategoryIds = categoriesData?.map(c => c.id) || [];

      // Get meal configurations from current diet
      const mealConfigs = localDiet.meals?.map(meal => ({
        name: meal.name,
        enabled: true,
        percentage: meal.meal_foods?.reduce((acc, mf) => acc + (mf.food.calories * mf.quantity), 0) / localDiet.calories || 1 / localDiet.meals!.length,
        categories: allCategoryIds
      })) || [];

      // Get target macros from diet_macros or use default values
      const targetMacros: MacroDistribution = {
        protein: localDiet.macros?.protein || Math.round((localDiet.calories * 0.3) / 4),
        carbs: localDiet.macros?.carbs || Math.round((localDiet.calories * 0.45) / 4),
        fats: localDiet.macros?.fats || Math.round((localDiet.calories * 0.25) / 9)
      };

      // Generate new diet plan
      const dietPlan = await generateDiet(localDiet.calories, targetMacros, mealConfigs);

      // Create new diet
      const { data: dietData, error: dietError } = await supabase
        .from('diets')
        .insert([{
          user_id: localDiet.user_id,
          calories: localDiet.calories,
          carb_day_type: localDiet.carb_day_type
        }])
        .select()
        .single();

      if (dietError) throw dietError;

      // Store diet macros
      const { error: macrosError } = await supabase
        .from('diet_macros')
        .insert([{
          diet_id: dietData.id,
          protein: targetMacros.protein,
          carbs: targetMacros.carbs,
          fats: targetMacros.fats
        }]);

      if (macrosError) throw macrosError;

      // Create meals and add foods
      let foodIndex = 0;
      for (const mealConfig of mealConfigs) {
        // Create meal
        const { data: mealData, error: mealError } = await supabase
          .from('meals')
          .insert([{
            diet_id: dietData.id,
            name: mealConfig.name
          }])
          .select()
          .single();

        if (mealError) throw mealError;

        // Get foods for this meal from the diet plan
        const startIndex = Math.floor(foodIndex);
        const endIndex = Math.floor(foodIndex + (dietPlan.length / mealConfigs.length));
        const mealFoods = dietPlan.slice(startIndex, endIndex);
        foodIndex = endIndex;

        // Add foods to meal
        if (mealFoods.length > 0) {
          const { error: foodsError } = await supabase
            .from('meal_foods')
            .insert(
              mealFoods.map(food => ({
                meal_id: mealData.id,
                food_id: food.id,
                quantity: food.portion_size / 100 // Convert portion size to quantity multiplier
              }))
            );

          if (foodsError) throw foodsError;
        }
      }

      // Refresh data
      const { data: newDiet, error: fetchError } = await supabase
        .from('diets')
        .select(`
          *,
          meals:meals(
            *,
            meal_foods:meal_foods(
              *,
              food:foods(*, food_categories(*))
            )
          ),
          macros:diet_macros(*)
        `)
        .eq('id', dietData.id)
        .single();

      if (fetchError) throw fetchError;
      if (newDiet) {
        setLocalDiet(newDiet);
        setPreviewTotals({});
        if (newDiet.macros) {
          setMacroForm({
            protein: newDiet.macros.protein,
            carbs: newDiet.macros.carbs,
            fats: newDiet.macros.fats
          });
        }
      }
    } catch (err) {
      console.error('Error generating new diet:', err);
      setError(t('errorGeneratingDiet'));
    } finally {
      setGeneratingDiet(false);
    }
  };

  const handleSaveCalories = async () => {
    if (!localDiet) return;
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('diets')
        .update({ calories: calorieForm })
        .eq('id', localDiet.id);

      if (updateError) throw updateError;

      await refreshDietData();
      setEditingCalories(false);
    } catch (err) {
      console.error('Error updating calories:', err);
      setError('Erro ao atualizar meta de calorias');
    }
  };

  // Calculate calories from macros
  const calculateCaloriesFromMacros = (protein: number, carbs: number, fats: number) => {
    return (protein * 4) + (carbs * 4) + (fats * 9);
  };

  // Calculate macro percentages
  const calculateMacroPercentages = (protein: number, carbs: number, fats: number) => {
    const proteinCals = protein * 4;
    const carbsCals = carbs * 4;
    const fatsCals = fats * 9;
    const totalCals = proteinCals + carbsCals + fatsCals;

    return {
      protein: totalCals > 0 ? Math.round((proteinCals / totalCals) * 100) : 0,
      carbs: totalCals > 0 ? Math.round((carbsCals / totalCals) * 100) : 0,
      fats: totalCals > 0 ? Math.round((fatsCals / totalCals) * 100) : 0
    };
  };

  // Handle macro value changes
  const handleMacroChange = (type: 'protein' | 'carbs' | 'fats', value: number) => {
    if (!localDiet) return;

    const targetCalories = localDiet.calories;
    let newProtein = macroForm.protein;
    let newCarbs = macroForm.carbs;
    let newFats = macroForm.fats;

    // Update the changed macro
    if (type === 'protein') newProtein = value;
    if (type === 'carbs') newCarbs = value;
    if (type === 'fats') newFats = value;

    // Calculate current calories from macros
    const currentCalories = calculateCaloriesFromMacros(newProtein, newCarbs, newFats);
    const percentages = calculateMacroPercentages(newProtein, newCarbs, newFats);

    // Adjust other macros to maintain proportions and hit calorie target
    if (type === 'protein') {
      // Adjust carbs and fats proportionally
      const remainingCals = targetCalories - (newProtein * 4);
      const carbsRatio = percentages.carbs / (percentages.carbs + percentages.fats);
      newCarbs = Math.round((remainingCals * carbsRatio) / 4);
      newFats = Math.round((remainingCals * (1 - carbsRatio)) / 9);
    } else if (type === 'carbs') {
      // Adjust protein and fats proportionally
      const remainingCals = targetCalories - (newCarbs * 4);
      const proteinRatio = percentages.protein / (percentages.protein + percentages.fats);
      newProtein = Math.round((remainingCals * proteinRatio) / 4);
      newFats = Math.round((remainingCals * (1 - proteinRatio)) / 9);
    } else {
      // Adjust protein and carbs proportionally
      const remainingCals = targetCalories - (newFats * 9);
      const proteinRatio = percentages.protein / (percentages.protein + percentages.carbs);
      newProtein = Math.round((remainingCals * proteinRatio) / 4);
      newCarbs = Math.round((remainingCals * (1 - proteinRatio)) / 4);
    }

    // Update form state
    setMacroForm({
      protein: Math.max(0, newProtein),
      carbs: Math.max(0, newCarbs),
      fats: Math.max(0, newFats)
    });
  };

  const handleSaveMacros = async () => {
    if (!localDiet) return;
    setError('');

    try {
      // First check if macros exist for this diet
      const { data: existingMacros, error: checkError } = await supabase
        .from('diet_macros')
        .select('id')
        .eq('diet_id', localDiet.id)
        .maybeSingle();

      if (checkError) throw checkError;

      let macrosError;
      if (existingMacros) {
        // Update existing macros
        const { error: updateError } = await supabase
          .from('diet_macros')
          .update({
            protein: macroForm.protein,
            carbs: macroForm.carbs,
            fats: macroForm.fats
          })
          .eq('id', existingMacros.id);
        
        macrosError = updateError;
      } else {
        // Insert new macros
        const { error: insertError } = await supabase
          .from('diet_macros')
          .insert([{
            diet_id: localDiet.id,
            protein: macroForm.protein,
            carbs: macroForm.carbs,
            fats: macroForm.fats
          }]);
        
        macrosError = insertError;
      }

      if (macrosError) throw macrosError;

      await refreshDietData();
      setEditingMacros(false);
    } catch (err) {
      console.error('Error updating macros:', err);
      setError('Erro ao atualizar macros');
    }
  };

  const calculateMealTotals = (meal: Meal) => {
    return meal.meal_foods?.reduce(
      (acc, mf) => {
        // Use preview portion if available, otherwise use actual quantity
        const quantity = previewTotals?.[mf.id] !== undefined
          ? previewTotals[mf.id] / mf.food.portion_size
          : mf.quantity;

        return {
          calories: acc.calories + Math.round(mf.food.calories * quantity),
          protein: acc.protein + mf.food.protein * quantity,
          carbs: acc.carbs + mf.food.carbs * quantity,
          fats: acc.fats + mf.food.fats * quantity
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    ) || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  };

  const calculateDietTotals = (previewPortions?: Record<string, number>) => {
    return localDiet?.meals?.reduce(
      (acc, meal) => {
        const mealTotals = calculateMealTotals(meal);
        return {
          calories: acc.calories + mealTotals.calories,
          protein: acc.protein + mealTotals.protein,
          carbs: acc.carbs + mealTotals.carbs,
          fats: acc.fats + mealTotals.fats
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    ) || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  };

  const handleAddFood = (mealId: string) => {
    setSelectedMealId(mealId);
    setShowAddFoodModal(true);
  };

  const handleDeleteFood = async (mealFoodId: string) => {
    try {
      setDeletingFoods(prev => ({ ...prev, [mealFoodId]: true }));
      setError('');

      const { error: deleteError } = await supabase
        .from('meal_foods')
        .delete()
        .eq('id', mealFoodId);

      if (deleteError) throw deleteError;

      // Immediately refresh diet data after deletion
      await refreshDietData();
    } catch (err) {
      console.error('Error deleting food:', err);
      setError('Erro ao remover alimento');
    } finally {
      setDeletingFoods(prev => ({ ...prev, [mealFoodId]: false }));
    }
  };

  const handlePortionChange = (mealFoodId: string, currentGrams: number, increment: boolean) => {
    const step = 10; // Adjust portion by 10g increments
    const minPortion = 25; // Minimum 25g portion
    const maxPortion = 300; // Maximum 300g portion

    const newGrams = increment
      ? Math.min(maxPortion, currentGrams + step)
      : Math.max(minPortion, currentGrams - step);

    if (adjustingQuantities) {
      // Preview mode: just update the preview totals
      handlePortionPreview(mealFoodId, newGrams);
    } else {
      // Direct save mode
      handleUpdatePortion(mealFoodId, newGrams);
    }
  };

  const handleAutoAdjustWithStrategy = async (strategy: 'cutting' | 'bulking') => {
    if (!localDiet) return;

    try {
      const { portions, foodsAdded } = await adjustMacrosWithStrategy(localDiet, strategy);

      if (foodsAdded) {
        await refreshDietData();
        setTimeout(() => handleAutoAdjustWithStrategy(strategy), 800);
        return;
      }

      setPreviewTotals(portions);
    } catch (err) {
      console.error('Error adjusting macros:', err);
      setError('Erro ao ajustar macros');
    }
  };

  const handleAutoAdjustQuantities = (strategy?: 'cutting' | 'bulking') => {
    if (!localDiet) return;

    const targetProtein = localDiet.macros?.protein || Math.round((localDiet.calories * 0.3) / 4);
    const targetCarbs = localDiet.macros?.carbs || Math.round((localDiet.calories * 0.45) / 4);
    const targetFats = localDiet.macros?.fats || Math.round((localDiet.calories * 0.25) / 9);
    const targetCalories = localDiet.calories;

    if (strategy) {
      handleAutoAdjustWithStrategy(strategy);
      return;
    }

    const allMealFoods = localDiet.meals?.flatMap(m => m.meal_foods || []) || [];

    const portions: Record<string, number> = {};
    allMealFoods.forEach(mf => {
      portions[mf.id] = Math.round(mf.quantity * mf.food.portion_size);
    });

    const calculateTotalsFromPortions = (portionMap: Record<string, number>) => {
      return allMealFoods.reduce((acc, mf) => {
        const grams = portionMap[mf.id] || 0;
        const multiplier = grams / mf.food.portion_size;
        const calories = (mf.food.protein * 4 + mf.food.carbs * 4 + mf.food.fats * 9) * multiplier;
        return {
          protein: acc.protein + (mf.food.protein * multiplier),
          carbs: acc.carbs + (mf.food.carbs * multiplier),
          fats: acc.fats + (mf.food.fats * multiplier),
          calories: acc.calories + calories
        };
      }, { protein: 0, carbs: 0, fats: 0, calories: 0 });
    };

    let currentTotals = calculateTotalsFromPortions(portions);

    const proteinRatio = currentTotals.protein > 0 ? targetProtein / currentTotals.protein : 1;
    const carbsRatio = currentTotals.carbs > 0 ? targetCarbs / currentTotals.carbs : 1;
    const fatsRatio = currentTotals.fats > 0 ? targetFats / currentTotals.fats : 1;
    const initialFactor = (proteinRatio + carbsRatio + fatsRatio) / 3;

    Object.keys(portions).forEach(id => {
      portions[id] = Math.max(30, Math.round(portions[id] * initialFactor));
    });

    for (let iteration = 0; iteration < 150; iteration++) {
      currentTotals = calculateTotalsFromPortions(portions);

      const caloriesDiff = currentTotals.calories - targetCalories;
      const proteinDiff = currentTotals.protein - targetProtein;
      const carbsDiff = currentTotals.carbs - targetCarbs;
      const fatsDiff = currentTotals.fats - targetFats;

      if (Math.abs(caloriesDiff) <= 55 && Math.abs(proteinDiff) <= 2 && Math.abs(carbsDiff) <= 2 && Math.abs(fatsDiff) <= 1) {
        break;
      }

      const proteinFoods = allMealFoods.filter(mf => (mf.food.protein / mf.food.portion_size) > 0.05);
      const carbsFoods = allMealFoods.filter(mf => (mf.food.carbs / mf.food.portion_size) > 0.05);
      const fatsFoods = allMealFoods.filter(mf => (mf.food.fats / mf.food.portion_size) > 0.05);

      if (Math.abs(proteinDiff) > 2 && proteinFoods.length > 0) {
        const adjustmentPerFood = -proteinDiff / proteinFoods.length;
        proteinFoods.forEach(mf => {
          const proteinPerGram = mf.food.protein / mf.food.portion_size;
          const gramsAdjustment = adjustmentPerFood / proteinPerGram;
          const currentGrams = portions[mf.id];
          portions[mf.id] = Math.max(30, Math.round(currentGrams + gramsAdjustment));
        });
      } else if (Math.abs(carbsDiff) > 2 && carbsFoods.length > 0) {
        const adjustmentPerFood = -carbsDiff / carbsFoods.length;
        carbsFoods.forEach(mf => {
          const carbsPerGram = mf.food.carbs / mf.food.portion_size;
          const gramsAdjustment = adjustmentPerFood / carbsPerGram;
          const currentGrams = portions[mf.id];
          portions[mf.id] = Math.max(30, Math.round(currentGrams + gramsAdjustment));
        });
      } else if (Math.abs(fatsDiff) > 1 && fatsFoods.length > 0) {
        const adjustmentPerFood = -fatsDiff / fatsFoods.length;
        fatsFoods.forEach(mf => {
          const fatsPerGram = mf.food.fats / mf.food.portion_size;
          const gramsAdjustment = (adjustmentPerFood / fatsPerGram) * 0.4;
          const currentGrams = portions[mf.id];
          portions[mf.id] = Math.max(30, Math.round(currentGrams + gramsAdjustment));
        });
      } else if (Math.abs(caloriesDiff) > 55) {
        allMealFoods.forEach(mf => {
          const caloriesPerGram = (mf.food.protein * 4 + mf.food.carbs * 4 + mf.food.fats * 9) / mf.food.portion_size;
          if (caloriesPerGram > 0) {
            const gramsAdjustment = -caloriesDiff / (allMealFoods.length * caloriesPerGram);
            const currentGrams = portions[mf.id];
            portions[mf.id] = Math.max(30, Math.round(currentGrams + gramsAdjustment));
          }
        });
      } else {
        break;
      }
    }

    setPreviewTotals(portions);
  };

  const handleSaveAllPortions = async () => {
    if (!localDiet || Object.keys(previewTotals).length === 0) return;

    try {
      setError('');
      const updates: Promise<any>[] = [];

      // Update all changed portions
      for (const [mealFoodId, grams] of Object.entries(previewTotals)) {
        const mealFood = localDiet.meals?.flatMap(m => m.meal_foods || [])
          .find(mf => mf.id === mealFoodId);

        if (mealFood) {
          const newQuantity = grams / mealFood.food.portion_size;
          updates.push(
            supabase
              .from('meal_foods')
              .update({ quantity: newQuantity })
              .eq('id', mealFoodId)
          );
        }
      }

      await Promise.all(updates);

      // Clear preview totals and refresh
      setPreviewTotals({});
      setAdjustingQuantities(false);
      await refreshDietData();
    } catch (err) {
      console.error('Error saving portions:', err);
      setError('Erro ao salvar ajustes');
    }
  };

  const handleUpdatePortion = async (mealFoodId: string, grams: number) => {
    if (grams <= 0) {
      setError('A porção deve ser maior que zero');
      return;
    }

    try {
      setSavingPortions(prev => ({ ...prev, [mealFoodId]: true }));
      setError('');

      // Find the meal food to get the base portion size
      const mealFood = localDiet?.meals?.flatMap(m => m.meal_foods || [])
        .find(mf => mf.id === mealFoodId);

      if (!mealFood) {
        throw new Error('Alimento não encontrado');
      }

      // Calculate the new quantity (as a multiplier of the base portion)
      const newQuantity = grams / mealFood.food.portion_size;

      const { error: updateError } = await supabase
        .from('meal_foods')
        .update({ quantity: newQuantity })
        .eq('id', mealFoodId);

      if (updateError) throw updateError;

      // Clear editing state for this food
      setEditingPortions(prev => {
        const newState = { ...prev };
        delete newState[mealFoodId];
        return newState;
      });
      
      // Immediately refresh diet data after update
      await refreshDietData();
    } catch (err) {
      console.error('Error updating portion:', err);
      setError('Erro ao atualizar porção');
    } finally {
      setSavingPortions(prev => ({ ...prev, [mealFoodId]: false }));
    }
  };

  const handleTransferFood = async (mealFoodId: string, targetMealId: string) => {
    if (!localDiet || !targetMealId) return;
    
    try {
      setError('');
      
      // Update the meal_id of the food
      const { error: transferError } = await supabase
        .from('meal_foods')
        .update({ meal_id: targetMealId })
        .eq('id', mealFoodId);

      if (transferError) throw transferError;

      // Reset transfer state
      setTransferringFood(null);
      setTransferTargetMeal('');
      
      // Refresh diet data
      await refreshDietData();
    } catch (err) {
      console.error('Error transferring food:', err);
      setError('Erro ao transferir alimento');
    }
  };

  const handleCancelTransfer = () => {
    setTransferringFood(null);
    setTransferTargetMeal('');
  };

  const handleFoodAdded = async (foodId: string, quantity: number) => {
    try {
      if (addToAllDays && selectedMealId) {
        const currentMeal = localDiet?.meals?.find(m => m.id === selectedMealId);
        if (!currentMeal) return;

        for (const diet of allWeekDiets) {
          const matchingMeal = diet.meals?.find(m => m.name === currentMeal.name);
          if (matchingMeal) {
            const { error: insertError } = await supabase
              .from('meal_foods')
              .insert({
                meal_id: matchingMeal.id,
                food_id: foodId,
                quantity: quantity
              });

            if (insertError) throw insertError;
          }
        }
      }
    } catch (err) {
      console.error('Error adding food to all days:', err);
      setError('Erro ao adicionar alimento em todos os dias');
    } finally {
      setShowAddFoodModal(false);
      setSelectedMealId(null);
      await refreshDietData();
    }
  };

  const handlePortionPreview = (mealFoodId: string, grams: number) => {
    setPreviewTotals(prev => ({
      ...prev,
      [mealFoodId]: grams
    }));
  };

  if (!isOpen || !localDiet) return null;

  const dietTotals = calculateDietTotals(previewTotals);
  const caloriesDiff = dietTotals.calories - localDiet.calories;
  const isCaloriesWithinRange = Math.abs(caloriesDiff) <= 50;

  // Get target macros from diet_macros or calculate default values
  const targetProtein = localDiet.macros?.protein || Math.round((localDiet.calories * 0.3) / 4);
  const targetCarbs = localDiet.macros?.carbs || Math.round((localDiet.calories * 0.45) / 4);
  const targetFats = localDiet.macros?.fats || Math.round((localDiet.calories * 0.25) / 9);

  // Calculate macro percentages
  const currentProteinCals = dietTotals.protein * 4;
  const currentCarbsCals = dietTotals.carbs * 4;
  const currentFatsCals = dietTotals.fats * 9;
  const totalCals = currentProteinCals + currentCarbsCals + currentFatsCals;

  const proteinPercentage = totalCals > 0 ? Math.round((currentProteinCals / totalCals) * 100) : 0;
  const carbsPercentage = totalCals > 0 ? Math.round((currentCarbsCals / totalCals) * 100) : 0;
  const fatsPercentage = totalCals > 0 ? Math.round((currentFatsCals / totalCals) * 100) : 0;

  // Calculate form macro percentages
  const formMacroPercentages = calculateMacroPercentages(
    macroForm.protein,
    macroForm.carbs,
    macroForm.fats
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-semibold text-[#f8c045]">{t('currentDiet')}</h3>
            <p className="text-gray-400">{t('user')}: {userName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPasteDietModal(true)}
              className="text-[#f8c045] hover:text-[#e6b041] transition flex items-center"
            >
              <Upload size={20} className="mr-2" />
              Colar Modelo de Dieta
            </button>
            <button
              onClick={() => {
                if (adjustingQuantities) {
                  handleSaveAllPortions();
                } else {
                  setShowMacroStrategyModal(true);
                }
              }}
              className={`px-4 py-2 rounded-lg transition font-semibold ${
                adjustingQuantities
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-[#f8c045] text-[rgb(23,23,23)] hover:bg-[#e6b041]'
              }`}
            >
              {adjustingQuantities ? 'Salvar Ajustes' : 'Ajustar Quantidades'}
            </button>
            {adjustingQuantities && (
              <button
                onClick={() => {
                  setAdjustingQuantities(false);
                  setPreviewTotals({});
                }}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition font-semibold"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-center items-center gap-3 mb-3 flex-wrap">
            {[
              { day: 0, short: 'D', full: 'Dom' },
              { day: 1, short: 'S', full: 'Seg' },
              { day: 2, short: 'T', full: 'Ter' },
              { day: 3, short: 'Q', full: 'Qua' },
              { day: 4, short: 'Q', full: 'Qui' },
              { day: 5, short: 'S', full: 'Sex' },
              { day: 6, short: 'S', full: 'Sáb' }
            ].map((item) => (
              <button
                key={item.day}
                onClick={() => setSelectedDayOfWeek(item.day)}
                className={`flex flex-col items-center transition-all duration-300 ${
                  selectedDayOfWeek === item.day
                    ? 'scale-110'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    selectedDayOfWeek === item.day
                      ? 'bg-[#f8c045] text-[rgb(23,23,23)] shadow-lg shadow-[#f8c045]/50'
                      : 'bg-[rgb(23,23,23)] text-gray-400 border-2 border-gray-700'
                  }`}
                >
                  {item.short}
                </div>
                <span
                  className={`text-xs mt-1 font-medium transition-colors duration-300 ${
                    selectedDayOfWeek === item.day ? 'text-[#f8c045]' : 'text-gray-500'
                  }`}
                >
                  {item.full}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center mb-3">
            <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={addToAllDays}
                onChange={(e) => setAddToAllDays(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-[#f8c045] focus:ring-[#f8c045] bg-[rgb(23,23,23)]"
              />
              <span className="text-sm">Adicionar alimentos em todos os dias</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-400">Meta Diária</h4>
              {!editingCalories ? (
                <button
                  onClick={() => setEditingCalories(true)}
                  className="text-[#f8c045] hover:text-[#e6b041] text-sm transition"
                >
                  Ajustar Meta
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingCalories(false)}
                    className="text-gray-400 hover:text-gray-300 text-sm transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCalories}
                    className="text-[#f8c045] hover:text-[#e6b041] text-sm transition"
                  >
                    Salvar
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div>
                {editingCalories ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={calorieForm}
                      onChange={(e) => setCalorieForm(Number(e.target.value))}
                      className="w-32 bg-[rgb(28,28,28)] text-[#f8c045] p-2 rounded border border-[#f8c045]/20 text-xl font-bold"
                      min="800"
                      max="5000"
                    />
                    <span className="text-[#f8c045] text-xl font-bold ml-2">kcal</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-[#f8c045]">{localDiet.calories} kcal</p>
                )}
              </div>
              <div className="text-right">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Calorias Atuais</h4>
                <p className={`text-2xl font-bold ${isCaloriesWithinRange ? 'text-green-400' : 'text-red-400'}`}>
                  {dietTotals.calories} kcal
                  {!editingCalories && (
                    <span className="text-sm ml-2">
                      ({caloriesDiff > 0 ? '+' : ''}{caloriesDiff} kcal)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-400">Macronutrientes</h4>
              {!editingMacros ? (
                <button
                  onClick={() => setEditingMacros(true)}
                  className="text-[#f8c045] hover:text-[#e6b041] text-sm transition"
                >
                  Ajustar Macros
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingMacros(false)}
                    className="text-gray-400 hover:text-gray-300 text-sm transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveMacros}
                    className="text-[#f8c045] hover:text-[#e6b041] text-sm transition"
                  >
                    Salvar
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400">
                    Proteínas ({editingMacros ? formMacroPercentages.protein : proteinPercentage}%)
                  </span>
                  <div className="text-right">
                    {editingMacros ? (
                      <input
                        type="number"
                        value={macroForm.protein}
                        onChange={(e) => handleMacroChange('protein', Number(e.target.value))}
                        className="w-20 bg-[rgb(28,28,28)] text-[#f8c045] p-1 rounded border border-[#f8c045]/20 text-right"
                      />
                    ) : (
                      <>
                        <span className="text-[#f8c045] font-semibold">{Math.round(dietTotals.protein)}g</span>
                        <span className="text-gray-500 text-sm ml-2">/ {targetProtein}g</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-[rgb(28,28,28)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#f8c045] transition-all"
                    style={{ width: `${Math.min(100, (dietTotals.protein / targetProtein) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400">
                    Carboidratos ({editingMacros ? formMacroPercentages.carbs : carbsPercentage}%)
                  </span>
                  <div className="text-right">
                    {editingMacros ? (
                      <input
                        type="number"
                        value={macroForm.carbs}
                        onChange={(e) => handleMacroChange('carbs', Number(e.target.value))}
                        className="w-20 bg-[rgb(28,28,28)] text-[#f8c045] p-1 rounded border border-[#f8c045]/20 text-right"
                      />
                    ) : (
                      <>
                        <span className="text-[#f8c045] font-semibold">{Math.round(dietTotals.carbs)}g</span>
                        <span className="text-gray-500 text-sm ml-2">/ {targetCarbs}g</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-[rgb(28,28,28)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#f8c045] transition-all"
                    style={{ width: `${Math.min(100, (dietTotals.carbs / targetCarbs) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400">
                    Gorduras ({editingMacros ? formMacroPercentages.fats : fatsPercentage}%)
                  </span>
                  <div className="text-right">
                    {editingMacros ? (
                      <input
                        type="number"
                        value={macroForm.fats}
                        onChange={(e) => handleMacroChange('fats', Number(e.target.value))}
                        className="w-20 bg-[rgb(28,28,28)] text-[#f8c045] p-1 rounded border border-[#f8c045]/20 text-right"
                      />
                    ) : (
                      <>
                        <span className="text-[#f8c045] font-semibold">{Math.round(dietTotals.fats)}g</span>
                        <span className="text-gray-500 text-sm ml-2">/ {targetFats}g</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-[rgb(28,28,28)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#f8c045] transition-all"
                    style={{ width: `${Math.min(100, (dietTotals.fats / targetFats) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {localDiet.meals?.map((meal, index) => {
            const mealTotals = calculateMealTotals(meal);
            
            return (
              <div
                key={meal.id}
                className="bg-[rgb(23,23,23)] p-6 rounded-lg border border-[#f8c045]/20"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-[#f8c045]">
                    {meal.name || `Refeição ${index + 1}`}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-400">
                      {mealTotals.calories} kcal
                    </div>
                    <button
                      onClick={() => handleAddFood(meal.id)}
                      className="flex items-center text-[#f8c045] hover:text-[#e6b041] transition text-sm"
                    >
                      <Plus size={16} className="mr-1" />
                      Adicionar Alimento
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-gray-300">
                    <thead>
                      <tr className="border-b border-[#f8c045]/10">
                        <th className="text-left py-2 px-4">Alimento</th>
                        <th className="text-right py-2 px-6">Porção</th>
                        <th className="text-center py-2 px-5">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meal.meal_foods?.map((mealFood) =>  {
                        const previewQuantity = previewTotals[mealFood.id] !== undefined
                          ? previewTotals[mealFood.id] / mealFood.food.portion_size
                          : mealFood.quantity;

                        return (
                          <tr key={mealFood.id} className="border-b border-[#f8c045]/10">
                            <td className="py-2 px-3">{mealFood.food.name}</td>
                            <td className="py-1 px-0">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handlePortionChange(
                                    mealFood.id,
                                    Math.round(mealFood.quantity * mealFood.food.portion_size),
                                    false
                                  )}
                                  className="text-[#f8c045] hover:text-[#e6b041] transition p-1"
                                  title={t('decreasePortion')}
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                <span className="min-w-[3ch] text-center">
                                  {Math.round(previewQuantity * mealFood.food.portion_size)}g
                                </span>
                                <button
                                  onClick={() => handlePortionChange(
                                    mealFood.id,
                                    Math.round(mealFood.quantity * mealFood.food.portion_size),
                                    true
                                  )}
                                  className="text-[#f8c045] hover:text-[#e6b041] transition p-1"
                                  title={t('increasePortion')}
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </td>
                            
                            <td className="py-2 px-4 text-center">
                              {transferringFood === mealFood.id ? (
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={transferTargetMeal}
                                    onChange={(e) => setTransferTargetMeal(e.target.value)}
                                    className="bg-[rgb(28,28,28)] text-gray-300 p-1 rounded border border-[#f8c045]/20 text-sm"
                                  >
                                    <option value="">Selecionar refeição...</option>
                                    {localDiet?.meals?.filter(m => m.id !== meal.id).map(targetMeal => (
                                      <option key={targetMeal.id} value={targetMeal.id}>
                                        {targetMeal.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleTransferFood(mealFood.id, transferTargetMeal)}
                                    disabled={!transferTargetMeal}
                                    className="text-green-500 hover:text-green-400 transition disabled:opacity-50"
                                    title="Confirmar transferência"
                                  >
                                    <ArrowRight size={16} />
                                  </button>
                                  <button
                                    onClick={handleCancelTransfer}
                                    className="text-gray-400 hover:text-gray-300 transition"
                                    title="Cancelar"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => setTransferringFood(mealFood.id)}
                                    className="text-blue-500 hover:text-blue-400 transition"
                                    title="Transferir para outra refeição"
                                  >
                                    <ArrowRight size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFood(mealFood.id)}
                                    className="text-red-500 hover:text-red-400 transition disabled:opacity-50"
                                    title="Remover"
                                    disabled={deletingFoods[mealFood.id]}
                                  >
                                    <Trash2 
                                      size={16} 
                                      className={deletingFoods[mealFood.id] ? 'animate-spin' : ''} 
                                    />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {showAddFoodModal && selectedMealId && (
          <AddFoodModal
            isOpen={showAddFoodModal}
            onClose={() => {
              setShowAddFoodModal(false);
              setSelectedMealId(null);
            }}
            mealId={selectedMealId}
            onFoodAdded={handleFoodAdded}
            skipInsert={addToAllDays}
          />
        )}

        {showPasteDietModal && localDiet && (
          <PasteDietModal
            isOpen={showPasteDietModal}
            onClose={() => setShowPasteDietModal(false)}
            userId={localDiet.user_id}
            dietId={localDiet.id}
            meals={localDiet.meals || []}
            onDietGenerated={async () => {
              setShowPasteDietModal(false);
              await refreshDietData();
            }}
          />
        )}

        {showMacroStrategyModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(23,23,23)] border border-gray-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Escolha a Estratégia</h3>
              <p className="text-gray-300 mb-6 text-sm">
                Selecione como deseja distribuir os macronutrientes ao longo das refeições:
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => {
                    setShowMacroStrategyModal(false);
                    setAdjustingQuantities(true);
                    handleAutoAdjustQuantities('cutting');
                  }}
                  className="w-full p-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-left"
                >
                  <div className="font-bold mb-1">Cutting</div>
                  <div className="text-sm opacity-90">
                    Distribuição otimizada para perda de gordura e manutenção muscular
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowMacroStrategyModal(false);
                    setAdjustingQuantities(true);
                    handleAutoAdjustQuantities('bulking');
                  }}
                  className="w-full p-4 rounded-lg bg-green-600 hover:bg-green-700 text-white transition text-left"
                >
                  <div className="font-bold mb-1">Bulking</div>
                  <div className="text-sm opacity-90">
                    Distribuição otimizada para ganho de massa muscular
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowMacroStrategyModal(false)}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}