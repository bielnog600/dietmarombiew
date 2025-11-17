import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Apple, UtensilsCrossed, Scale, Clock, User, Camera, Droplet, Lock, Home, BarChart as ChartBar, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import type { Diet, Food, MacroDistribution } from '../types';
import AddFoodModal from '../components/AddFoodModal';
import AutoDistributeFoodsModal from '../components/AutoDistributeFoodsModal';
import Progress from '../components/Progress';
import Settings from '../components/Settings';
import DietPlanMeal from '../components/DietPlanMeal';
import CarbCyclingSelector from '../components/CarbCyclingSelector';
import WaterIntakeTracker from '../components/WaterIntakeTracker';
import { useTranslation } from '../translations';
import { useAuthStore } from '../store/authStore';
import { calculateRecommendedCalories } from '../lib/calories';
import { calculateOptimalPortion } from '../lib/diet';

type TabType = 'home' | 'progress' | 'settings';

const DietPlan = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showAutoDistributeModal, setShowAutoDistributeModal] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentCard, setCurrentCard] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [carbDayType, setCarbDayType] = useState<'high' | 'moderate' | 'low' | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(new Date().getDay());

  useEffect(() => {
    if (user) {
      fetchLatestDiet();
    }
  }, [user, selectedDayOfWeek]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) < minSwipeDistance) {
      return;
    }

    if (distance > 0 && currentCard < 3) {
      setCurrentCard(prev => prev + 1);
    }

    if (distance < 0 && currentCard > 0) {
      setCurrentCard(prev => prev - 1);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchStart) return;
    setTouchEnd(e.clientX);
  };

  const handleMouseUp = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) < minSwipeDistance) {
      return;
    }

    if (distance > 0 && currentCard < 3) {
      setCurrentCard(prev => prev + 1);
    }

    if (distance < 0 && currentCard > 0) {
      setCurrentCard(prev => prev - 1);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleMouseLeave = () => {
    setTouchStart(null);
    setTouchEnd(null);
  };

  const fetchLatestDiet = async () => {
    try {
      const { data: diets, error: dietError } = await supabase
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
        .eq('user_id', user?.id)
        .eq('day_of_week', selectedDayOfWeek)
        .order('created_at', { ascending: false })
        .limit(1);

      if (dietError) throw dietError;

      if (diets && diets.length > 0) {
        setDiet(diets[0]);
        setCarbDayType(diets[0].carb_day_type || null);
      } else {
        setDiet(null);
      }
    } catch (err) {
      console.error('Error fetching diet:', err);
      setError('Não foi possível carregar sua dieta. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMealTotals = (meal: any) => {
    return meal.meal_foods?.reduce(
      (acc: any, mf: any) => ({
        calories: acc.calories + Math.round(mf.food.calories * mf.quantity),
        protein: acc.protein + mf.food.protein * mf.quantity,
        carbs: acc.carbs + mf.food.carbs * mf.quantity,
        fats: acc.fats + mf.food.fats * mf.quantity
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    ) || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  };

  const calculateDietTotals = () => {
    return diet?.meals?.reduce(
      (acc: any, meal: any) => {
        const mealMacros = calculateMealTotals(meal);
        return {
          calories: acc.calories + mealMacros.calories,
          protein: acc.protein + mealMacros.protein,
          carbs: acc.carbs + mealMacros.carbs,
          fats: acc.fats + mealMacros.fats
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    ) || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  };

  const handleCarbDayChange = async (type: 'high' | 'moderate' | 'low', newMacros: MacroDistribution) => {
    if (!diet) return;

    try {
      const { error: dietError } = await supabase
        .from('diets')
        .update({ carb_day_type: type })
        .eq('id', diet.id);

      if (dietError) throw dietError;

      const { error: macrosError } = await supabase
        .from('diet_macros')
        .upsert({
          diet_id: diet.id,
          protein: newMacros.protein,
          carbs: newMacros.carbs,
          fats: newMacros.fats
        }, {
          onConflict: 'diet_id'
        });

      if (macrosError) throw macrosError;

      for (const meal of diet.meals || []) {
        const mealTotals = calculateMealTotals(meal);
        const currentTotal = calculateDietTotals();
        
        const mealProportion = mealTotals.calories / currentTotal.calories;
        const mealTargetMacros = {
          protein: Math.round(newMacros.protein * mealProportion),
          carbs: Math.round(newMacros.carbs * mealProportion),
          fats: Math.round(newMacros.fats * mealProportion)
        };

        for (const mealFood of meal.meal_foods || []) {
          const newPortion = calculateOptimalPortion(
            mealFood.food,
            mealTargetMacros,
            mealTotals,
            Math.round(diet.calories * mealProportion)
          );

          const { error: updateError } = await supabase
            .from('meal_foods')
            .update({ 
              quantity: newPortion / mealFood.food.portion_size 
            })
            .eq('id', mealFood.id);

          if (updateError) throw updateError;
        }
      }

      setCarbDayType(type);
      await fetchLatestDiet();
    } catch (err) {
      console.error('Error updating carb day type:', err);
      setError('Erro ao atualizar tipo de dia do carb cycling');
    }
  };

  const handleAddFood = (mealId: string) => {
    setSelectedMealId(mealId);
    setShowAddFoodModal(true);
  };

  const handleFoodAdded = async (foodId: string, quantity: number) => {
    setShowAddFoodModal(false);
    setSelectedMealId(null);
    await fetchLatestDiet();
  };

  const handleDeleteFood = async (mealFoodId: string) => {
    if (deleteLoading || !diet) return;
    setDeleteLoading(true);

    try {
      const { error: deleteError } = await supabase
        .from('meal_foods')
        .delete()
        .eq('id', mealFoodId);

      if (deleteError) throw deleteError;

      setDiet(prev => {
        if (!prev) return null;
        return {
          ...prev,
          meals: prev.meals?.map(m => ({
            ...m,
            meal_foods: m.meal_foods?.filter(mf => mf.id !== mealFoodId)
          }))
        };
      });
    } catch (err) {
      console.error('Error deleting food:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdatePortion = async (mealFoodId: string, newGrams: number) => {
    if (!diet) return;

    try {
      const mealFood = diet.meals?.flatMap(m => m.meal_foods || [])
        .find(mf => mf.id === mealFoodId);

      if (!mealFood) return;

      const newQuantity = newGrams / mealFood.food.portion_size;

      const { error: updateError } = await supabase
        .from('meal_foods')
        .update({ quantity: newQuantity })
        .eq('id', mealFoodId);

      if (updateError) throw updateError;

      setDiet(prev => {
        if (!prev) return null;
        return {
          ...prev,
          meals: prev.meals?.map(m => ({
            ...m,
            meal_foods: m.meal_foods?.map(mf => 
              mf.id === mealFoodId 
                ? { ...mf, quantity: newQuantity }
                : mf
            )
          }))
        };
      });
    } catch (err) {
      console.error('Error updating portion:', err);
    }
  };

  const handleAutoDistribute = async (selectedFoodIds: string[]) => {
    if (!diet || selectedFoodIds.length === 0) {
      console.log('No diet or no foods selected');
      return;
    }

    console.log('Starting auto-distribute with', selectedFoodIds.length, 'foods');
    setLoading(true);
    setError('');

    try {
      const { data: foodsData, error: foodsError } = await supabase
        .from('foods')
        .select('*, food_categories(*)')
        .in('id', selectedFoodIds);

      if (foodsError) throw foodsError;

      console.log('Fetched foods:', foodsData?.length);
      console.log('Foods with categories:', foodsData?.map(f => ({ name: f.name, category: f.food_categories?.name })));

      const targetProtein = diet.macros?.protein || Math.round((diet.calories * 0.3) / 4);
      const targetCarbs = diet.macros?.carbs || Math.round((diet.calories * 0.45) / 4);
      const targetFats = diet.macros?.fats || Math.round((diet.calories * 0.25) / 9);

      console.log('Target macros:', { targetProtein, targetCarbs, targetFats });

      let mealsForDay = diet.meals || [];

      if (mealsForDay.some(m => m.day_of_week !== undefined && m.day_of_week !== null)) {
        mealsForDay = mealsForDay.filter(m => m.day_of_week === selectedDayOfWeek);
      }

      const numMeals = mealsForDay.length;

      console.log('Meals for day', selectedDayOfWeek, ':', numMeals);
      console.log('Available meals:', mealsForDay.map(m => ({ id: m.id, name: m.name, day: m.day_of_week })));

      if (numMeals === 0) {
        setError('Nenhuma refeição encontrada. Crie uma dieta primeiro ou selecione outro dia.');
        setLoading(false);
        return;
      }

      console.log('Deleting existing meal_foods for meals:', mealsForDay.map(m => m.id));
      const { error: deleteError } = await supabase
        .from('meal_foods')
        .delete()
        .in('meal_id', mealsForDay.map(m => m.id));

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      console.log('Deleted existing foods');

      const getMealType = (mealName: string, index: number): 'low-carb' | 'pre-workout' | 'post-workout' | 'normal' => {
        const nameLower = mealName.toLowerCase();
        if (nameLower.includes('café') || nameLower.includes('breakfast') || index === 0) return 'low-carb';
        if (nameLower.includes('jantar') || nameLower.includes('dinner') || nameLower.includes('ceia') || index === mealsForDay.length - 1) return 'low-carb';
        if (nameLower.includes('pré') || nameLower.includes('pre') || nameLower.includes('antes')) return 'pre-workout';
        if (nameLower.includes('pós') || nameLower.includes('post') || nameLower.includes('depois')) return 'post-workout';
        return 'normal';
      };

      const getMealMacros = (type: 'low-carb' | 'pre-workout' | 'post-workout' | 'normal', totalCals: number) => {
        switch (type) {
          case 'low-carb':
            return {
              protein: Math.round((totalCals * 0.35) / 4),
              carbs: Math.round((totalCals * 0.15) / 4),
              fats: Math.round((totalCals * 0.50) / 9)
            };
          case 'pre-workout':
            return {
              protein: Math.round((totalCals * 0.30) / 4),
              carbs: Math.round((totalCals * 0.55) / 4),
              fats: Math.round((totalCals * 0.15) / 9)
            };
          case 'post-workout':
            return {
              protein: Math.round((totalCals * 0.40) / 4),
              carbs: Math.round((totalCals * 0.50) / 4),
              fats: Math.round((totalCals * 0.10) / 9)
            };
          case 'normal':
            return {
              protein: Math.round((totalCals * 0.30) / 4),
              carbs: Math.round((totalCals * 0.40) / 4),
              fats: Math.round((totalCals * 0.30) / 9)
            };
        }
      };

      console.log('Distributing with meal-specific macro targets');

      const usedFoodIds = new Set<string>();

      for (let i = 0; i < mealsForDay.length; i++) {
        const meal = mealsForDay[i];
        const mealType = getMealType(meal.name, i);
        const caloriesForMeal = Math.round(diet.calories / numMeals);
        const mealTargetMacros = getMealMacros(mealType, caloriesForMeal);

        console.log(`Processing meal ${i + 1}:`, meal.name, 'Type:', mealType, 'Macros:', mealTargetMacros);

        const currentMacros = { protein: 0, carbs: 0, fats: 0, calories: 0 };
        const mealFoods: Array<{ meal_id: string; food_id: string; quantity: number }> = [];

        const categorizeFoods = (foods: typeof foodsData) => {
          const protein = foods.filter(f => f.protein >= 10 && f.protein >= f.carbs && f.protein >= f.fats);
          const carbs = foods.filter(f => f.carbs >= 10 && f.carbs >= f.protein && f.carbs >= f.fats);
          const fats = foods.filter(f => f.fats >= 3 && f.fats >= f.protein && f.fats >= f.carbs);

          if (protein.length === 0) {
            protein.push(...foods.filter(f => f.protein >= 5).sort((a, b) => b.protein - a.protein).slice(0, 1));
          }
          if (carbs.length === 0) {
            carbs.push(...foods.filter(f => f.carbs >= 5).sort((a, b) => b.carbs - a.carbs).slice(0, 1));
          }
          if (fats.length === 0) {
            fats.push(...foods.filter(f => f.fats >= 1).sort((a, b) => b.fats - a.fats).slice(0, 1));
          }

          console.log('Categorized foods:', {
            protein: protein.map(f => f.name),
            carbs: carbs.map(f => f.name),
            fats: fats.map(f => f.name)
          });

          return { protein, carbs, fats };
        };

        const isFoodValidForMeal = (food: typeof foodsData[0], mealName: string, mealIndex: number): boolean => {
          const categoryName = food.food_categories?.name?.toLowerCase() || '';
          const mealLower = mealName.toLowerCase();

          const isFlexibleCategory = categoryName.includes('fruta') ||
                                     categoryName.includes('gordura') ||
                                     categoryName.includes('vegeta') ||
                                     categoryName.includes('salada') ||
                                     categoryName.includes('azeite') ||
                                     categoryName.includes('oleaginosa');

          console.log(`Checking food "${food.name}" (category: "${food.food_categories?.name}") for meal "${mealName}"`);

          if (mealLower.includes('café') || mealLower.includes('breakfast') || mealIndex === 0) {
            const valid = categoryName.includes('café') ||
                   categoryName.includes('breakfast') ||
                   categoryName.includes('manhã') ||
                   categoryName.includes('carboidrato') ||
                   (isFlexibleCategory && !categoryName.includes('jantar') && !categoryName.includes('almoço'));
            console.log(`  -> Café da manhã check: ${valid}`);
            return valid;
          }

          if (mealLower.includes('lanche') || mealLower.includes('snack')) {
            const valid = categoryName.includes('lanche') ||
                   categoryName.includes('snack') ||
                   categoryName.includes('meio') ||
                   categoryName.includes('café') ||
                   categoryName.includes('proteína') ||
                   categoryName.includes('carboidrato') ||
                   isFlexibleCategory;
            console.log(`  -> Lanche check: ${valid}`);
            return valid;
          }

          if (mealLower.includes('almoço') || mealLower.includes('lunch')) {
            const valid = categoryName.includes('almoço') ||
                   categoryName.includes('lunch') ||
                   categoryName.includes('proteína') ||
                   categoryName.includes('carboidrato') ||
                   isFlexibleCategory;
            console.log(`  -> Almoço check: ${valid}`);
            return valid;
          }

          if (mealLower.includes('jantar') || mealLower.includes('dinner') || mealLower.includes('ceia')) {
            const valid = categoryName.includes('jantar') ||
                   categoryName.includes('dinner') ||
                   categoryName.includes('ceia') ||
                   categoryName.includes('proteína') ||
                   categoryName.includes('carboidrato') ||
                   (isFlexibleCategory && !categoryName.includes('fruta'));
            console.log(`  -> Jantar check: ${valid}`);
            return valid;
          }

          if (mealLower.includes('pré') || mealLower.includes('pre') || mealLower.includes('antes')) {
            const valid = categoryName.includes('treino') ||
                   categoryName.includes('workout') ||
                   categoryName.includes('carboidrato') ||
                   categoryName.includes('proteína') ||
                   categoryName.includes('fruta');
            console.log(`  -> Pré-treino check: ${valid}`);
            return valid;
          }

          if (mealLower.includes('pós') || mealLower.includes('post') || mealLower.includes('depois')) {
            const valid = categoryName.includes('treino') ||
                   categoryName.includes('workout') ||
                   categoryName.includes('carboidrato') ||
                   categoryName.includes('proteína') ||
                   categoryName.includes('fruta');
            console.log(`  -> Pós-treino check: ${valid}`);
            return valid;
          }

          console.log(`  -> Default: true (no specific meal requirement)`);
          return true;
        };

        const validFoods = foodsData.filter(f => isFoodValidForMeal(f, meal.name, i) && !usedFoodIds.has(f.id));
        console.log(`Filtered foods for "${meal.name}": ${validFoods.length} valid out of ${foodsData.length} total (${usedFoodIds.size} already used)`);

        const categorizedFoods = categorizeFoods(validFoods);

        const proteinFood = categorizedFoods.protein[0];
        const carbFood = categorizedFoods.carbs[0];
        const fatFood = categorizedFoods.fats[0];

        if (!proteinFood || !carbFood || !fatFood) {
          console.log(`Missing food types for meal "${meal.name}": protein=${!!proteinFood}, carbs=${!!carbFood}, fats=${!!fatFood}`);
          continue;
        }

        console.log(`Selected foods for "${meal.name}":`, {
          protein: proteinFood.name,
          carbs: carbFood.name,
          fats: fatFood.name
        });

        const totalMacros = {
          protein: mealTargetMacros.protein,
          carbs: mealTargetMacros.carbs,
          fats: mealTargetMacros.fats
        };

        const A = [
          [proteinFood.protein, carbFood.protein, fatFood.protein],
          [proteinFood.carbs, carbFood.carbs, fatFood.carbs],
          [proteinFood.fats, carbFood.fats, fatFood.fats]
        ];

        const b = [totalMacros.protein, totalMacros.carbs, totalMacros.fats];

        const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
                    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
                    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

        if (Math.abs(det) < 0.001) {
          console.log('System is singular, using proportional distribution');
          const proteinQuantity = Math.max(0.5, totalMacros.protein / (proteinFood.protein || 1));
          const carbQuantity = Math.max(0.5, totalMacros.carbs / (carbFood.carbs || 1));
          const fatQuantity = Math.max(0.5, totalMacros.fats / (fatFood.fats || 1));

          mealFoods.push(
            { meal_id: meal.id, food_id: proteinFood.id, quantity: proteinQuantity },
            { meal_id: meal.id, food_id: carbFood.id, quantity: carbQuantity },
            { meal_id: meal.id, food_id: fatFood.id, quantity: fatQuantity }
          );

          usedFoodIds.add(proteinFood.id);
          usedFoodIds.add(carbFood.id);
          usedFoodIds.add(fatFood.id);
        } else {
          const detX1 = b[0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
                       A[0][1] * (b[1] * A[2][2] - A[1][2] * b[2]) +
                       A[0][2] * (b[1] * A[2][1] - A[1][1] * b[2]);

          const detX2 = A[0][0] * (b[1] * A[2][2] - A[1][2] * b[2]) -
                       b[0] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
                       A[0][2] * (A[1][0] * b[2] - b[1] * A[2][0]);

          const detX3 = A[0][0] * (A[1][1] * b[2] - b[1] * A[2][1]) -
                       A[0][1] * (A[1][0] * b[2] - b[1] * A[2][0]) +
                       b[0] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

          let proteinQuantity = Math.max(0.5, detX1 / det);
          let carbQuantity = Math.max(0.5, detX2 / det);
          let fatQuantity = Math.max(0.5, detX3 / det);

          proteinQuantity = Math.min(5, proteinQuantity);
          carbQuantity = Math.min(5, carbQuantity);
          fatQuantity = Math.min(5, fatQuantity);

          console.log(`Calculated quantities: protein=${proteinQuantity.toFixed(2)}, carbs=${carbQuantity.toFixed(2)}, fats=${fatQuantity.toFixed(2)}`);

          mealFoods.push(
            { meal_id: meal.id, food_id: proteinFood.id, quantity: proteinQuantity },
            { meal_id: meal.id, food_id: carbFood.id, quantity: carbQuantity },
            { meal_id: meal.id, food_id: fatFood.id, quantity: fatQuantity }
          );

          usedFoodIds.add(proteinFood.id);
          usedFoodIds.add(carbFood.id);
          usedFoodIds.add(fatFood.id);
        }

        console.log('Meal foods to insert:', mealFoods.length);

        if (mealFoods.length > 0) {
          const { error: insertError } = await supabase
            .from('meal_foods')
            .insert(mealFoods);

          if (insertError) {
            console.error('Insert error:', insertError);
            throw insertError;
          }
          console.log('Inserted', mealFoods.length, 'foods for meal');
        }
      }

      console.log('Distribution complete, fetching updated diet');
      await fetchLatestDiet();
      console.log('Diet fetched successfully');
    } catch (err: any) {
      console.error('Error auto-distributing foods:', err);
      setError(err.message || 'Erro ao distribuir alimentos automaticamente');
    } finally {
      setLoading(false);
    }
  };

  const isPlanExpired = user?.plan_expiry && new Date(user.plan_expiry) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f8c045]"></div>
      </div>
    );
  }

  if (isPlanExpired) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-[rgb(28,28,28)] p-8 rounded-lg shadow-xl border border-[#f8c045]/10 text-center">
          <Lock className="mx-auto h-16 w-16 text-[#f8c045] mb-4" />
          <h2 className="text-2xl font-bold text-[#f8c045] mb-4">
            Plano Expirado
          </h2>
          <p className="text-gray-400 mb-6">
            Seu plano expirou em {new Date(user.plan_expiry!).toLocaleDateString()}. 
            Entre em contato com o Fabiew para renovar seu acesso.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!diet) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-[rgb(28,28,28)] p-6 border-b border-[#f8c045]/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#f8c045] mb-2">
                {t('greeting')}, {user?.name}! 👋
              </h1>
            </div>
            {user?.photo_url ? (
              <div className="w-12 h-12 rounded-full border-2 border-[#f8c045] overflow-hidden">
                <img
                  src={user.photo_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full border-4 border-[#f8c045] overflow-hidden bg-[rgb(23,23,23)] flex items-center justify-center">
                <Camera className="text-gray-400 w-6 h-6" />
              </div>
            )}
          </div>
        </div>

        <div className="content-area">
          <div className="space-y-2">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-[#f8c045]">{t('dietPlan')}</h2>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-4">
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
                  className={`flex flex-col items-center justify-center transition-all duration-300 ${
                    selectedDayOfWeek === item.day
                      ? 'scale-105'
                      : 'opacity-60 hover:opacity-100 hover:scale-100'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      selectedDayOfWeek === item.day
                        ? 'bg-[#f8c045] text-[rgb(23,23,23)] shadow-lg shadow-[#f8c045]/50'
                        : 'bg-[rgb(28,28,28)] text-gray-400 border border-gray-700'
                    }`}
                  >
                    {item.short}
                  </div>
                  <span
                    className={`text-[9px] mt-0.5 font-medium transition-colors duration-300 ${
                      selectedDayOfWeek === item.day ? 'text-[#f8c045]' : 'text-gray-500'
                    }`}
                  >
                    {item.full}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10">
              <div className="text-center">
                <UtensilsCrossed className="mx-auto h-12 w-12 text-[#f8c045] mb-4" />
                <h2 className="text-xl font-semibold text-[#f8c045] mb-2">
                  Nenhuma dieta encontrada
                </h2>
                <p className="text-gray-400">
                  {t('contactAdmin')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="tab-bar">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex justify-around -mb-2">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center py-4 px-6 transition-colors ${
                  activeTab === 'home' ? 'text-[#f8c045]' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Home size={24} className="mb-1" />
                <span className="text-xs font-medium">Home</span>
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`flex flex-col items-center py-4 px-6 transition-colors ${
                  activeTab === 'progress' ? 'text-[#f8c045]' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <ChartBar size={24} className="mb-1" />
                <span className="text-xs font-medium">Progresso</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center py-4 px-6 transition-colors ${
                  activeTab === 'settings' ? 'text-[#f8c045]' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <SettingsIcon size={24} className="mb-1" />
                <span className="text-xs font-medium">Ajustes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalMacros = calculateDietTotals();

  const targetProtein = diet.macros?.protein || Math.round((diet.calories * 0.3) / 4);
  const targetCarbs = diet.macros?.carbs || Math.round((diet.calories * 0.45) / 4);
  const targetFats = diet.macros?.fats || Math.round((diet.calories * 0.25) / 9);

  const currentProteinCals = totalMacros.protein * 4;
  const currentCarbsCals = totalMacros.carbs * 4;
  const currentFatsCals = totalMacros.fats * 9;
  const totalCals = currentProteinCals + currentCarbsCals + currentFatsCals;

  const proteinPercentage = totalCals > 0 ? Math.round((currentProteinCals / totalCals) * 100) : 0;
  const carbsPercentage = totalCals > 0 ? Math.round((currentCarbsCals / totalCals) * 100) : 0;
  const fatsPercentage = totalCals > 0 ? Math.round((currentFatsCals / totalCals) * 100) : 0;

  const renderContent = () => {
    switch (activeTab) {
      case 'progress':
        return <Progress />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="space-y-2">
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-[#f8c045]">{t('dietPlan')}</h2>
                <p className="text-gray-400 mt-1">
                  {t('createdOn')} {diet?.created_at && new Date(diet.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-4">
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
                    className={`flex flex-col items-center justify-center transition-all duration-300 ${
                      selectedDayOfWeek === item.day
                        ? 'scale-105'
                        : 'opacity-60 hover:opacity-100 hover:scale-100'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                        selectedDayOfWeek === item.day
                          ? 'bg-[#f8c045] text-[rgb(23,23,23)] shadow-lg shadow-[#f8c045]/50'
                          : 'bg-[rgb(28,28,28)] text-gray-400 border border-gray-700'
                      }`}
                    >
                      {item.short}
                    </div>
                    <span
                      className={`text-[9px] mt-0.5 font-medium transition-colors duration-300 ${
                        selectedDayOfWeek === item.day ? 'text-[#f8c045]' : 'text-gray-500'
                      }`}
                    >
                      {item.full}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-4 overflow-hidden">
              <div 
                ref={sliderRef}
                className="flex touch-pan-x select-none"
                style={{
                  transform: `translateX(-${currentCard * 100}%)`,
                  transition: 'transform 0.3s ease-out'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex-none w-full px-2">
                  <div className="bg-[rgb(28,28,28)] p-4 rounded-lg shadow-lg border border-[#f8c045]/10">
                    <div className="flex items-center mb-3">
                      <Scale className="text-[#f8c045] mr-2" />
                      <h2 className="text-xl font-semibold text-[#f8c045]">{t('calories')}</h2>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">{t('target')}</p>
                        <p className="text-2xl font-bold text-[#f8c045]">{diet.calories} kcal</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">{t('current')}</p>
                        <p className={`text-2xl font-bold ${Math.abs(totalMacros.calories - diet.calories) <= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {totalMacros.calories} kcal
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#f8c045]/10">
                        <p className="text-sm font-medium text-gray-400 mb-1">Diferença</p>
                        <p className={`text-xl font-bold ${totalMacros.calories - diet.calories > 0 ? 'text-yellow-400' : totalMacros.calories - diet.calories < 0 ? 'text-blue-400' : 'text-green-400'}`}>
                          {totalMacros.calories - diet.calories > 0 ? '+' : ''}{totalMacros.calories - diet.calories} kcal
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => setShowAutoDistributeModal(true)}
                          className="w-full flex items-center justify-center bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-3 rounded-lg hover:bg-[#e6b041] transition font-semibold text-sm"
                        >
                          <Sparkles size={16} className="mr-2" />
                          Distribuir Automaticamente
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-none w-full px-2">
                  <div className="bg-[rgb(28,28,28)] p-4 rounded-lg shadow-lg border border-[#f8c045]/10">
                    <div className="flex items-center mb-3">
                      <Apple className="text-[#f8c045] mr-2" />
                      <h2 className="text-xl font-semibold text-[#f8c045]">{t('Macros')}</h2>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Proteínas ({proteinPercentage}%)</span>
                          <div className="text-right">
                            <span className="text-[#f8c045] font-semibold">{Math.round(totalMacros.protein)}g</span>
                            <span className="text-gray-500 text-sm ml-2">/ {targetProtein}g</span>
                          </div>
                        </div>
                        <div className="h-2 bg-[rgb(23,23,23)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#f8c045] transition-all"
                            style={{ width: `${Math.min(100, (totalMacros.protein / targetProtein) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Carboidratos ({carbsPercentage}%)</span>
                          <div className="text-right">
                            <span className="text-[#f8c045] font-semibold">{Math.round(totalMacros.carbs)}g</span>
                            <span className="text-gray-500 text-sm ml-2">/ {targetCarbs}g</span>
                          </div>
                        </div>
                        <div className="h-2 bg-[rgb(23,23,23)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#f8c045] transition-all"
                            style={{ width: `${Math.min(100, (totalMacros.carbs / targetCarbs) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Gorduras ({fatsPercentage}%)</span>
                          <div className="text-right">
                            <span className="text-[#f8c045] font-semibold">{Math.round(totalMacros.fats)}g</span>
                            <span className="text-gray-500 text-sm ml-2">/ {targetFats}g</span>
                          </div>
                        </div>
                        <div className="h-2 bg-[rgb(23,23,23)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#f8c045] transition-all"
                            style={{ width: `${Math.min(100, (totalMacros.fats / targetFats) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-none w-full px-2">
                  <div className="bg-[rgb(28,28,28)] p-4 rounded-lg shadow-lg border border-[#f8c045]/10">
                    <div className="flex items-center mb-3">
                      <Droplet className="text-[#f8c045] mr-2" />
                      <h2 className="text-xl font-semibold text-[#f8c045]">{t('waterIntake')}</h2>
                    </div>
                    <WaterIntakeTracker />
                  </div>
                </div>

                <div className="flex-none w-full px-2">
                  <div className="bg-[rgb(28,28,28)] p-4 rounded-lg shadow-lg border border-[#f8c045]/10">
                    <div className="flex items-center mb-3">
                      <Clock className="text-[#f8c045] mr-2" />
                      <h2 className="text-xl font-semibold text-[#f8c045]">{t('planExpiry')}</h2>
                    </div>
                    <p className="text-2xl font-bold text-[#f8c045]">
                      {user?.plan_expiry ? (
                        new Date(user.plan_expiry).toLocaleDateString()
                      ) : (
                        t('noExpiration')
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-2 space-x-1">
                {[0, 1, 2, 3].map((index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCard(index)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      currentCard === index ? 'bg-[#f8c045]' : 'bg-[#f8c045]/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {user?.carb_cycling_enabled && (
              <div className="mb-4">
                <CarbCyclingSelector
                  value={carbDayType}
                  onChange={handleCarbDayChange}
                  calories={diet.calories}
                />
              </div>
            )}

            <div className="space-y-3">
              {diet?.meals?.map((meal, index) => {
                const mealMacros = calculateMealTotals(meal);
                
                return (
                  <DietPlanMeal
                    key={meal.id}
                    meal={meal}
                    index={index}
                    onAddFood={() => handleAddFood(meal.id)}
                    onDeleteFood={handleDeleteFood}
                    onUpdatePortion={handleUpdatePortion}
                    deleteLoading={deleteLoading}
                    mealMacros={mealMacros}
                  />
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-[rgb(28,28,28)] p-6 border-b border-[#f8c045]/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f8c045] mb-2">
              {t('greeting')}, {user?.name}! 👋
            </h1>
          </div>
          {user?.photo_url ? (
            <div className="w-12 h-12 rounded-full border-2 border-[#f8c045] overflow-hidden">
              <img 
                src={user.photo_url} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full border-4 border-[#f8c045] overflow-hidden bg-[rgb(23,23,23)] flex items-center justify-center">
              <Camera className="text-gray-400 w-6 h-6" />
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="content-area">
        {renderContent()}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-around -mb-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center py-4 px-6 transition-colors ${
                activeTab === 'home' ? 'text-[#f8c045]' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Home size={24} className="mb-1" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex flex-col items-center py-4 px-6 transition-colors ${
                activeTab === 'progress' ? 'text-[#f8c045]' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <ChartBar size={24} className="mb-1" />
              <span className="text-xs font-medium">Progresso</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center py-4 px-6 transition-colors ${
                activeTab === 'settings' ? 'text-[#f8c045]' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <SettingsIcon size={24} className="mb-1" />
              <span className="text-xs font-medium">Ajustes</span>
            </button>
          </div>
        </div>
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
        />
      )}

      {showAutoDistributeModal && diet && (
        <AutoDistributeFoodsModal
          isOpen={showAutoDistributeModal}
          onClose={() => setShowAutoDistributeModal(false)}
          dietId={diet.id}
          onDistribute={handleAutoDistribute}
        />
      )}

    </div>
  );
};

export default DietPlan;