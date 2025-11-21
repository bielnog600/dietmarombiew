import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Apple, UtensilsCrossed, Scale, Clock, User, Camera, Droplet, Lock, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import type { Diet, Food, MacroDistribution } from '../types';
import AddFoodModal from './AddFoodModal';
import QuickImportModal from './QuickImportModal';
import UserProfileModal from './UserProfileModal';
import ProgressTrackingModal from './ProgressTrackingModal';
import DietPlanMeal from './DietPlanMeal';
import CarbCyclingSelector from './CarbCyclingSelector';
import { useTranslation } from '../translations';
import { useAuthStore } from '../store/authStore';
import { calculateRecommendedCalories } from '../lib/calories';

export default function DietPlan() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showQuickImportModal, setShowQuickImportModal] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'progress' | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [targetCalories, setTargetCalories] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchLatestDiet();
    }
  }, [user]);

  useEffect(() => {
    if (user && diet) {
      const calculations = calculateRecommendedCalories({
        weight: user.weight,
        height: user.height,
        age: user.age,
        gender: user.gender,
        activity_level: user.activity_level,
        lean_mass: user.lean_mass
      });

      if (calculations) {
        let calories;
        if (calculations.cunningham) {
          calories = calculations.cunningham.tdee;
        } else if (calculations.harrisBenedict) {
          calories = calculations.harrisBenedict.tdee;
        } else if (calculations.mifflinStJeor) {
          calories = calculations.mifflinStJeor.tdee;
        }
        setTargetCalories(calories || null);
      }
    }
  }, [user, diet]);

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

    if (distance > 0 && currentCard < 2) {
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

    if (distance > 0 && currentCard < 2) {
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

  const calculateMealTotals = (meal: Meal) => {
    return meal.meal_foods?.reduce(
      (acc, mf) => ({
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
      (acc, meal) => {
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

  const handleFoodAdded = async () => {
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
          <button
            onClick={() => setActiveTab('profile')}
            className="bg-[#f8c045] text-[rgb(23,23,23)] px-6 py-3 rounded-lg hover:bg-[#e6b041] transition font-semibold"
          >
            Ver Detalhes do Plano
          </button>
        </div>

        <UserProfileModal
          isOpen={activeTab === 'profile'}
          onClose={() => setActiveTab(null)}
        />
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
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10">
          <div className="text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-[#f8c045] mb-4" />
            <h2 className="text-xl font-semibold text-[#f8c045] mb-2">
              {t('noDietFound')}
            </h2>
            <p className="text-gray-400">
              {t('contactAdmin')}
            </p>
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

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-4xl font-bold text-[#f8c045]">
          {t('greeting')}, {user?.name}!
        </h1>
        <div className="flex items-center space-x-4">
          <div className="bg-[rgb(28,28,28)] rounded-lg border border-[#f8c045]/10 p-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center px-4 py-2 rounded-lg transition ${
                activeTab === 'profile'
                  ? 'bg-[#f8c045] text-[rgb(23,23,23)]'
                  : 'text-[#f8c045] hover:bg-[rgb(33,33,33)]'
              }`}
            >
              <User size={20} className="mr-2" />
              {t('profile')}
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center px-4 py-2 rounded-lg transition ${
                activeTab === 'progress'
                  ? 'bg-[#f8c045] text-[rgb(23,23,23)]'
                  : 'text-[#f8c045] hover:bg-[rgb(33,33,33)]'
              }`}
            >
              <Camera size={20} className="mr-2" />
              {t('progress')}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-[#f8c045]">{t('dietPlan')}</h2>
        <p className="text-gray-400 mt-1">
          {t('createdOn')} {diet?.created_at && new Date(diet.created_at).toLocaleDateString()}
        </p>
        <div className="mt-3">
          <button
            onClick={() => setShowQuickImportModal(true)}
            className="flex items-center text-[#f8c045] hover:text-[#e6b041] transition text-sm"
          >
            <Upload size={16} className="mr-1" />
            Importação Rápida
          </button>
        </div>
      </div>

      <div className="relative mb-6 overflow-hidden">
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
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-1">{t('target')}</p>
                  <p className="text-2xl font-bold text-[#f8c045]">{targetCalories || diet.calories} kcal</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-1">{t('current')}</p>
                  <p className={`text-2xl font-bold ${Math.abs(totalMacros.calories - diet.calories) <= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalMacros.calories} kcal
                  </p>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-sm font-medium text-gray-400 mb-1">{t('difference')}</p>
                  <p className={`text-xl font-bold ${
                    totalMacros.calories > (targetCalories || diet.calories)
                      ? 'text-red-400'
                      : totalMacros.calories < (targetCalories || diet.calories)
                      ? 'text-blue-400'
                      : 'text-green-400'
                  }`}>
                    {totalMacros.calories - (targetCalories || diet.calories) > 0 ? '+' : ''}
                    {totalMacros.calories - (targetCalories || diet.calories)} kcal
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-none w-full px-2">
            <div className="bg-[rgb(28,28,28)] p-4 rounded-lg shadow-lg border border-[#f8c045]/10">
              <div className="flex items-center mb-3">
                <Apple className="text-[#f8c045] mr-2" />
                <h2 className="text-xl font-semibold text-[#f8c045]">{t('macros')}</h2>
              </div>
              <div className="space-y-3">
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
              <p className="text-2xl font-bold text-[#f8c045] mb-2">
                {user?.water_intake}ml
              </p>
              <div className="mt-3 pt-3 border-t border-[#f8c045]/10">
                <div className="flex items-center">
                  <Clock className="text-[#f8c045] mr-2" />
                  <h3 className="text-lg font-semibold text-[#f8c045]">{t('planExpiry')}</h3>
                </div>
                <p className="text-gray-400 mt-1">
                  {user?.plan_expiry ? (
                    new Date(user.plan_expiry).toLocaleDateString()
                  ) : (
                    t('noExpiration')
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-2 space-x-1">
          {[0, 1, 2].map((index) => (
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
        <div className="mb-6">
          <CarbCyclingSelector
            value={carbDayType}
            onChange={handleCarbDayChange}
            calories={diet.calories}
          />
        </div>
      )}

      <div className="space-y-4">
        {diet.meals?.map((meal, index) => {
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

      <UserProfileModal
        isOpen={activeTab === 'profile'}
        onClose={() => setActiveTab(null)}
      />

      <ProgressTrackingModal
        isOpen={activeTab === 'progress'}
        onClose={() => setActiveTab(null)}
      />

      {showQuickImportModal && diet && (
        <QuickImportModal
          isOpen={showQuickImportModal}
          onClose={() => setShowQuickImportModal(false)}
          dietId={diet.id}
          onImportComplete={async () => {
            setShowQuickImportModal(false);
            await fetchLatestDiet();
          }}
        />
      )}
    </div>
  );
}