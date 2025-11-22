import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronLeft, ChevronRight, Upload, ArrowRight, ArrowRightLeft, Edit2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Diet, Food, MacroDistribution } from '../types';
import AddFoodModal from './AddFoodModal';
import PasteDietModal from './PasteDietModal';
import { FoodSubstitutionModal } from './FoodSubstitutionModal';
import BaseFoodSelectionModal from './BaseFoodSelectionModal';
import { useTranslation } from '../translations';
import { generateDiet } from '../lib/diet';
import { adjustMacrosWithStrategy } from '../lib/macroAdjust';
import { adjustMacrosWithAI } from '../lib/openaiAdjust';

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
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [selectedFoodForSubstitution, setSelectedFoodForSubstitution] = useState<any>(null);
  const [editingPortionId, setEditingPortionId] = useState<string | null>(null);
  const [tempPortionValue, setTempPortionValue] = useState<string>('');
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
  const [selectedStrategy, setSelectedStrategy] = useState<'cutting' | 'bulking' | null>(null);
  const [showDietModelModal, setShowDietModelModal] = useState(false);
  const [selectedDietModel, setSelectedDietModel] = useState<string | null>(null);
  const [showBaseFoodSelection, setShowBaseFoodSelection] = useState(false);
  const [baseFoods, setBaseFoods] = useState<Record<string, string[]>>({});
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(diet?.day_of_week ?? new Date().getDay());
  const [allWeekDiets, setAllWeekDiets] = useState<Diet[]>([]);
  const [addToAllDays, setAddToAllDays] = useState(true);
  const [replicateToAllDays, setReplicateToAllDays] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingMealName, setEditingMealName] = useState('');
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [addingNewMeal, setAddingNewMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const { t } = useTranslation();

  // Initialize selectedDayOfWeek when diet changes
  useEffect(() => {
    if (diet?.day_of_week !== undefined) {
      setSelectedDayOfWeek(diet.day_of_week);
    }
  }, [diet?.id]);

  // Load all foods
  useEffect(() => {
    const loadAllFoods = async () => {
      try {
        const { data: foods, error: foodsError } = await supabase
          .from('foods')
          .select('*, food_categories(*)')
          .order('name');

        if (foodsError) throw foodsError;
        setAllFoods(foods || []);
      } catch (err) {
        console.error('Error loading foods:', err);
      }
    };

    loadAllFoods();
  }, []);

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
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Keep only the most recent diet for each day_of_week
        const uniqueDiets = diets?.reduce((acc: Diet[], current) => {
          const existingIndex = acc.findIndex(d => d.day_of_week === current.day_of_week);
          if (existingIndex === -1) {
            acc.push(current);
          }
          return acc;
        }, []) || [];

        // Sort by day_of_week
        uniqueDiets.sort((a, b) => a.day_of_week - b.day_of_week);

        setAllWeekDiets(uniqueDiets);

        const currentDayDiet = uniqueDiets.find(d => d.day_of_week === selectedDayOfWeek);
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

      console.log('🔄 Refreshing diet data from database...');
      console.log(`📍 Current localDiet.id BEFORE refresh: ${localDiet?.id}`);
      console.log(`📍 Current selectedDayOfWeek: ${selectedDayOfWeek}`);

      // Adicionar timestamp para forçar bypass do cache
      const timestamp = Date.now();
      console.log(`⏰ Fetch timestamp: ${timestamp}`);

      // Reload all week diets - força fresh data do servidor
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
        console.log(`✅ Loaded ${diets.length} diets from database`);
        console.log('📋 Diet IDs mapping:');
        diets.forEach(d => {
          const mealCount = d.meals?.length || 0;
          const foodCount = d.meals?.reduce((sum: number, m: any) => sum + (m.meal_foods?.length || 0), 0) || 0;
          console.log(`  📅 Day ${d.day_of_week}: ${mealCount} meals, ${foodCount} foods | ID: ${d.id}`);

          // Log detalhado das meals para debug
          if (d.meals && d.meals.length > 0) {
            d.meals.forEach((meal: any) => {
              console.log(`    🍽️ ${meal.name}: ${meal.meal_foods?.length || 0} foods`);
              meal.meal_foods?.forEach((mf: any) => {
                console.log(`      - ${mf.food.name} (${mf.quantity * 100}g)`);
              });
            });
          }
        });

        setAllWeekDiets(diets);

        // Find and set the current day's diet
        const currentDayDiet = diets.find(d => d.day_of_week === selectedDayOfWeek);
        if (currentDayDiet) {
          console.log(`📌 Setting current day (${selectedDayOfWeek}) with ${currentDayDiet.meals?.length || 0} meals`);
          console.log(`🔄 Diet ID changed from ${localDiet?.id} to ${currentDayDiet.id}`);
          console.log('📦 Current day diet object:', JSON.stringify({
            id: currentDayDiet.id,
            day_of_week: currentDayDiet.day_of_week,
            calories: currentDayDiet.calories,
            meals_count: currentDayDiet.meals?.length,
            meals: currentDayDiet.meals?.map(m => ({
              id: m.id,
              name: m.name,
              foods_count: m.meal_foods?.length
            }))
          }, null, 2));

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
        } else {
          console.error(`❌ No diet found for day ${selectedDayOfWeek}!`);
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

  const mealTypeOptions = [
    'Café da Manhã',
    'Lanche da Manhã',
    'Almoço',
    'Lanche da Tarde',
    'Pré-treino',
    'Pós-treino',
    'Jantar',
    'Ceia',
    'Suplementos'
  ];

  const handleEditMeal = (mealId: string, currentName: string) => {
    setEditingMealId(mealId);
    setEditingMealName(currentName);
  };

  const handleSaveMealType = async (mealId: string) => {
    if (!editingMealName.trim()) {
      setError('Tipo de refeição não pode estar vazio');
      return;
    }

    try {
      setError('');
      const { error: updateError } = await supabase
        .from('meals')
        .update({ name: editingMealName.trim() })
        .eq('id', mealId);

      if (updateError) throw updateError;

      setEditingMealId(null);
      setEditingMealName('');
      await refreshDietData();
    } catch (err) {
      console.error('Error updating meal type:', err);
      setError('Erro ao atualizar tipo da refeição');
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta refeição? Todos os alimentos serão removidos.')) {
      return;
    }

    try {
      setDeletingMealId(mealId);
      setError('');

      const { error: deleteError } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId);

      if (deleteError) throw deleteError;

      await refreshDietData();
    } catch (err) {
      console.error('Error deleting meal:', err);
      setError('Erro ao deletar refeição');
    } finally {
      setDeletingMealId(null);
    }
  };

  const handleAddNewMeal = async () => {
    if (!newMealName.trim() || !localDiet) {
      setError('Nome da refeição não pode estar vazio');
      return;
    }

    try {
      setError('');
      const { error: insertError } = await supabase
        .from('meals')
        .insert([{
          diet_id: localDiet.id,
          name: newMealName.trim()
        }]);

      if (insertError) throw insertError;

      setAddingNewMeal(false);
      setNewMealName('');
      await refreshDietData();
    } catch (err) {
      console.error('Error adding meal:', err);
      setError('Erro ao adicionar refeição');
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

  const handleAutoAdjustWithStrategy = async (
    strategy: 'cutting' | 'bulking',
    dietModel?: string,
    baseFoodsSelection?: Record<string, string[]>
  ) => {
    if (!localDiet) return;

    try {
      setError('');
      setGeneratingDiet(true);

      console.log('🎯 Base foods selected:', baseFoodsSelection);

      if (replicateToAllDays) {
        // Replicar para todos os dias da semana
        const userId = localDiet.user_id;

        // Buscar todas as dietas da semana
        const { data: allDiets, error: fetchError } = await supabase
          .from('diets')
          .select('id, day_of_week, calories, macros:diet_macros(*)')
          .eq('user_id', userId)
          .order('day_of_week', { ascending: true });

        if (fetchError) throw fetchError;

        // Ajustar cada dieta com a IA, usando mesmos alimentos mas respeitando metas
        let successCount = 0;
        let errorCount = 0;
        let quotaError = false;

        for (const diet of allDiets || []) {
          console.log(`⏳ Adjusting diet for day ${diet.day_of_week}...`);
          try {
            await adjustMacrosWithAI(diet, strategy, dietModel, baseFoodsSelection);
            console.log(`✅ Diet adjusted for day ${diet.day_of_week}`);
            successCount++;
            // Pequeno delay entre requisições
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            errorCount++;
            console.error(`❌ Error adjusting diet for day ${diet.day_of_week}:`, err);

            // Se for erro de quota, parar e informar
            if (err instanceof Error && (err.message.includes('quota') || err.message.includes('429'))) {
              quotaError = true;
              break;
            }
          }
        }

        console.log('⏳ Aguardando finalização de todas as operações...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (quotaError) {
          alert(`⚠️ Dietas geradas com sucesso: ${successCount} de ${allDiets?.length || 0} dias.\n\n` +
                `Limite de requisições da API atingido.\n\n` +
                `Sugestão: Aguarde alguns minutos e gere os dias restantes, ou desmarque "Aplicar em todos os dias" e gere 1 dia por vez.`);
        } else if (errorCount > 0) {
          alert(`⚠️ Dietas ajustadas: ${successCount} de ${allDiets?.length || 0} dias.\n${errorCount} erros encontrados.`);
        } else {
          alert(`✅ Dietas ajustadas em ${allDiets?.length || 0} dias da semana!`);
        }
      } else {
        // Ajustar apenas o dia atual
        await adjustMacrosWithAI(localDiet, strategy, dietModel, baseFoodsSelection);
        alert('✅ Dieta ajustada com sucesso!');
      }

      // Fechar modals
      setShowMacroStrategyModal(false);
      setShowDietModelModal(false);
      setSelectedStrategy(null);
      setBaseFoods({});

      // Recarregar dados da dieta
      await refreshDietData();
    } catch (err) {
      console.error('Error adjusting macros with AI:', err);
      setError('Erro ao ajustar macros: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setGeneratingDiet(false);
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

  const handlePortionClick = (mealFoodId: string, currentGrams: number) => {
    setEditingPortionId(mealFoodId);
    setTempPortionValue(currentGrams.toString());
  };

  const handlePortionInputChange = (value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setTempPortionValue(value);
    }
  };

  const handlePortionInputBlur = async (mealFoodId: string) => {
    const newGrams = parseInt(tempPortionValue) || 5;
    const minPortion = 5;
    const maxPortion = 1000;
    const validGrams = Math.min(maxPortion, Math.max(minPortion, newGrams));

    await handleUpdatePortion(mealFoodId, validGrams);
    setEditingPortionId(null);
  };

  const handlePortionInputKeyDown = (e: React.KeyboardEvent, mealFoodId: string) => {
    if (e.key === 'Enter') {
      handlePortionInputBlur(mealFoodId);
    } else if (e.key === 'Escape') {
      setEditingPortionId(null);
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
            // Verificar se o alimento já existe nesta refeição
            const { data: existingFood } = await supabase
              .from('meal_foods')
              .select('id, quantity')
              .eq('meal_id', matchingMeal.id)
              .eq('food_id', foodId)
              .maybeSingle();

            if (existingFood) {
              // Se já existe, aumentar a quantidade
              const { error: updateError } = await supabase
                .from('meal_foods')
                .update({ quantity: existingFood.quantity + quantity })
                .eq('id', existingFood.id);

              if (updateError) throw updateError;
            } else {
              // Se não existe, inserir novo
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
                <div className="flex flex-col items-end gap-1">
                  <p className={`text-2xl font-bold ${isCaloriesWithinRange ? 'text-green-400' : 'text-red-400'}`}>
                    {dietTotals.calories} kcal
                  </p>
                  {!editingCalories && (
                    <span className={`text-base font-semibold ${caloriesDiff > 0 ? 'text-red-400' : caloriesDiff < 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {caloriesDiff > 0 ? '+' : ''}{caloriesDiff} kcal {caloriesDiff > 0 ? 'acima' : caloriesDiff < 0 ? 'abaixo' : 'na meta'}
                    </span>
                  )}
                </div>
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
                  {editingMealId === meal.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={editingMealName}
                        onChange={(e) => setEditingMealName(e.target.value)}
                        className="flex-1 bg-[rgb(28,28,28)] text-[#f8c045] px-3 py-2 rounded border border-[#f8c045]/20 cursor-pointer"
                        autoFocus
                      >
                        {mealTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveMealType(meal.id)}
                        className="text-green-500 hover:text-green-400 transition"
                        title="Salvar"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingMealId(null);
                          setEditingMealName('');
                        }}
                        className="text-gray-400 hover:text-gray-300 transition"
                        title="Cancelar"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-[#f8c045]">
                        {meal.name || `Refeição ${index + 1}`}
                      </h3>
                      <button
                        onClick={() => handleEditMeal(meal.id, meal.name || `Refeição ${index + 1}`)}
                        className="text-[#f8c045]/60 hover:text-[#f8c045] transition"
                        title="Trocar tipo de refeição"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        disabled={deletingMealId === meal.id}
                        className="text-red-500/60 hover:text-red-500 transition disabled:opacity-50"
                        title="Deletar refeição"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
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

                        const portion = Math.round(mealFood.quantity * mealFood.food.portion_size);

                        return (
                          <tr key={mealFood.id} className="border-b border-[#f8c045]/10">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span>{mealFood.food.name}</span>
                                <button
                                  onClick={() => {
                                    setSelectedFoodForSubstitution({
                                      id: mealFood.food.id,
                                      name: mealFood.food.name,
                                      protein: mealFood.food.protein,
                                      carbs: mealFood.food.carbs,
                                      fats: mealFood.food.fats,
                                      calories: mealFood.food.calories,
                                      quantity: mealFood.quantity,
                                      mealId: meal.id
                                    });
                                    setSubstitutionModalOpen(true);
                                  }}
                                  className="text-[#f8c045]/70 hover:text-[#f8c045] transition"
                                  title="Substituir alimento"
                                >
                                  <ArrowRightLeft size={14} className="rotate-90" />
                                </button>
                              </div>
                            </td>
                            <td className="py-1 px-0">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handlePortionChange(
                                    mealFood.id,
                                    portion,
                                    false
                                  )}
                                  className="text-[#f8c045] hover:text-[#e6b041] transition p-1"
                                  title={t('decreasePortion')}
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                {editingPortionId === mealFood.id ? (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={tempPortionValue}
                                    onChange={(e) => handlePortionInputChange(e.target.value)}
                                    onBlur={() => handlePortionInputBlur(mealFood.id)}
                                    onKeyDown={(e) => handlePortionInputKeyDown(e, mealFood.id)}
                                    placeholder="0"
                                    className="w-16 bg-[rgb(23,23,23)] text-[#f8c045] text-center rounded border-2 border-[#f8c045] focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 px-1 py-0.5 text-sm font-medium"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    onClick={() => handlePortionClick(mealFood.id, portion)}
                                    className="min-w-[4ch] text-center cursor-pointer hover:bg-[rgb(23,23,23)] hover:ring-2 hover:ring-[#f8c045]/30 px-2 py-0.5 rounded transition text-[#f8c045] font-medium"
                                    title="Clique para editar a quantidade"
                                  >
                                    {portion}g
                                  </span>
                                )}
                                <button
                                  onClick={() => handlePortionChange(
                                    mealFood.id,
                                    portion,
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

          {addingNewMeal ? (
            <div className="bg-[rgb(23,23,23)] p-6 rounded-lg border border-[#f8c045]/20">
              <div className="flex items-center gap-3">
                <select
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  className="flex-1 bg-[rgb(28,28,28)] text-[#f8c045] px-3 py-2 rounded border border-[#f8c045]/20 cursor-pointer"
                  autoFocus
                >
                  <option value="">Selecione o tipo de refeição</option>
                  {mealTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddNewMeal}
                  className="text-green-500 hover:text-green-400 transition"
                  title="Salvar"
                >
                  <Check size={24} />
                </button>
                <button
                  onClick={() => {
                    setAddingNewMeal(false);
                    setNewMealName('');
                  }}
                  className="text-gray-400 hover:text-gray-300 transition"
                  title="Cancelar"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingNewMeal(true)}
              className="w-full bg-[rgb(23,23,23)] p-6 rounded-lg border border-[#f8c045]/20 hover:border-[#f8c045]/40 transition flex items-center justify-center gap-2 text-[#f8c045] hover:text-[#e6b041]"
            >
              <Plus size={20} />
              <span>Adicionar Nova Refeição</span>
            </button>
          )}
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

        {substitutionModalOpen && selectedFoodForSubstitution && (
          <FoodSubstitutionModal
            isOpen={substitutionModalOpen}
            onClose={() => {
              setSubstitutionModalOpen(false);
              setSelectedFoodForSubstitution(null);
            }}
            currentFood={selectedFoodForSubstitution}
            mealId={selectedFoodForSubstitution.mealId}
            onSubstitute={async () => {
              setSubstitutionModalOpen(false);
              setSelectedFoodForSubstitution(null);
              await refreshDietData();
            }}
          />
        )}

        {showDietModelModal && selectedStrategy && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
            <div className="bg-[rgb(23,23,23)] border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-2">
                Escolha o Modelo Alimentar - {selectedStrategy === 'cutting' ? 'Cutting' : 'Bulking'}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Selecione o modelo que a IA usará como referência para gerar suas dietas:
              </p>

              {selectedStrategy === 'cutting' && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSelectedDietModel('low-carb');
                      setShowBaseFoodSelection(true);
                    }}
                    disabled={generatingDiet}
                    className="w-full p-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-bold mb-2 text-lg">🥩 Low Carb (Baixo Carboidrato)</div>
                    <div className="text-sm space-y-1 opacity-90">
                      <div><strong>Café da Manhã:</strong> Ovos (fritos, mexidos, cozidos), bacon artesanal, queijo amarelo, abacate, coco seco, morango, café preto</div>
                      <div><strong>Almoço:</strong> Carne vermelha, sobrecoxa com pele, peixes gordos (salmão, sardinha), brócolis, couve-flor, abobrinha, espinafre, azeite</div>
                      <div><strong>Lanche:</strong> Castanhas, nozes, macadâmias, amêndoas, queijo em cubos, salame, ovos de codorna, coco em lascas</div>
                      <div><strong>Jantar:</strong> Espaguete de abobrinha, purê de couve-flor, omelete com queijo e bacon, carne moída com vagem</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedDietModel('balanced-cutting');
                      setShowBaseFoodSelection(true);
                    }}
                    disabled={generatingDiet}
                    className="w-full p-4 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-bold mb-2 text-lg">⚖️ Cutting Equilibrado</div>
                    <div className="text-sm opacity-90">
                      Modelo balanceado com carboidratos moderados, proteínas altas e variedade de alimentos limpos
                    </div>
                  </button>
                </div>
              )}

              {selectedStrategy === 'bulking' && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSelectedDietModel('high-carb');
                      setShowBaseFoodSelection(true);
                    }}
                    disabled={generatingDiet}
                    className="w-full p-4 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-bold mb-2 text-lg">💪 Bulking Tradicional (Alto Carboidrato)</div>
                    <div className="text-sm space-y-1 opacity-90">
                      <div><strong>Café da Manhã:</strong> Pão integral, tapioca, cuscuz, aveia, ovos, queijo branco, leite desnatado, iogurte natural, mamão, banana</div>
                      <div><strong>Lanche Manhã:</strong> Maçã, pera, mix de castanhas, água de coco</div>
                      <div><strong>Almoço:</strong> Arroz (integral/branco), feijão, lentilha, grão-de-bico, batata, mandioca, frango, carne magra, peixe, saladas</div>
                      <div><strong>Lanche Tarde:</strong> Iogurte natural, frutas picadas, granola sem açúcar, claras de ovos, queijo minas</div>
                      <div><strong>Jantar:</strong> Saladas variadas, filé de frango grelhado, omelete simples, legumes refogados</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedDietModel('balanced-bulking');
                      setShowBaseFoodSelection(true);
                    }}
                    disabled={generatingDiet}
                    className="w-full p-4 rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-bold mb-2 text-lg">🍽️ Bulking Limpo</div>
                    <div className="text-sm opacity-90">
                      Ganho de massa com foco em alimentos de qualidade, menos processados e fontes limpas de carboidratos
                    </div>
                  </button>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDietModelModal(false);
                    setSelectedStrategy(null);
                    setSelectedDietModel(null);
                  }}
                  disabled={generatingDiet}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-50"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}


        {showMacroStrategyModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(23,23,23)] border border-gray-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Escolha a Estratégia</h3>
              <p className="text-gray-300 mb-4 text-sm">
                Selecione como deseja distribuir os macronutrientes ao longo das refeições:
              </p>

              <div className="space-y-3 mb-4">
                <button
                  onClick={() => {
                    setSelectedStrategy('cutting');
                    setShowDietModelModal(true);
                  }}
                  disabled={generatingDiet}
                  className="w-full p-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-bold mb-1">
                    Cutting
                  </div>
                  <div className="text-sm opacity-90">
                    Distribuição otimizada para perda de gordura e manutenção muscular
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedStrategy('bulking');
                    setShowDietModelModal(true);
                  }}
                  disabled={generatingDiet}
                  className="w-full p-4 rounded-lg bg-green-600 hover:bg-green-700 text-white transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-bold mb-1">
                    Bulking
                  </div>
                  <div className="text-sm opacity-90">
                    Distribuição otimizada para ganho de massa muscular
                  </div>
                </button>
              </div>

              <div className={`mb-4 p-4 rounded-lg border transition-all ${
                replicateToAllDays
                  ? 'bg-[#f8c045]/10 border-[#f8c045]/50'
                  : 'bg-gray-800 border-gray-600'
              }`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replicateToAllDays}
                    onChange={(e) => setReplicateToAllDays(e.target.checked)}
                    disabled={generatingDiet}
                    className="w-5 h-5 rounded border-gray-500 text-[#f8c045] focus:ring-[#f8c045] bg-[rgb(23,23,23)] cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      Aplicar em todos os dias da semana
                      {replicateToAllDays && (
                        <span className="text-xs bg-[#f8c045] text-[rgb(23,23,23)] px-2 py-0.5 rounded-full font-bold">
                          7 DIAS
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Os mesmos alimentos serão distribuídos em todos os dias, respeitando as metas de calorias e macros de cada dia
                    </div>
                  </div>
                </label>
                {replicateToAllDays && (
                  <div className="mt-3 p-2 bg-[#f8c045]/20 border border-[#f8c045]/50 rounded text-xs text-[#f8c045] flex items-start gap-2">
                    <span>⚠️</span>
                    <span>Esta ação modificará TODAS as dietas da semana (7 dias)</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowMacroStrategyModal(false)}
                disabled={generatingDiet}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <BaseFoodSelectionModal
          isOpen={showBaseFoodSelection}
          onClose={() => {
            setShowBaseFoodSelection(false);
            setBaseFoods({});
          }}
          meals={['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar']}
          allFoods={allFoods}
          onComplete={(selectedFoods) => {
            setBaseFoods(selectedFoods);
            setShowBaseFoodSelection(false);
            handleAutoAdjustWithStrategy(selectedStrategy!, selectedDietModel!, selectedFoods);
          }}
        />

      </div>
    </div>
  );
}