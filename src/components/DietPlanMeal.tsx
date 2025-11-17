import React, { useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMealTranslation } from '../translations/meals';
import { useTranslation } from '../translations';
import { useLanguageStore } from '../store/languageStore';
import { FoodSubstitutionModal } from './FoodSubstitutionModal';
import type { Meal } from '../types';

interface DietPlanMealProps {
  meal: Meal;
  index: number;
  onAddFood: () => void;
  onDeleteFood: (mealFoodId: string) => void;
  onUpdatePortion: (mealFoodId: string, newGrams: number) => void;
  onSubstituteFood: () => void;
  deleteLoading: boolean;
  mealMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

export default function DietPlanMeal({
  meal,
  index,
  onAddFood,
  onDeleteFood,
  onUpdatePortion,
  onSubstituteFood,
  deleteLoading,
  mealMacros
}: DietPlanMealProps) {
  const { translateMeal } = useMealTranslation();
  const { t } = useTranslation();
  const language = useLanguageStore(state => state.language);

  const getFoodName = (food: { name: string; name_en?: string | null }) => {
    if (language === 'en' && food.name_en) {
      return food.name_en;
    }
    return food.name;
  };

  const [editingPortionId, setEditingPortionId] = useState<string | null>(null);
  const [tempPortionValue, setTempPortionValue] = useState<string>('');
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [selectedFoodForSubstitution, setSelectedFoodForSubstitution] = useState<any>(null);

  const handlePortionChange = (mealFoodId: string, currentGrams: number, increment: boolean) => {
    const step = 10; // Adjust portion by 10g increments
    const minPortion = 25; // Minimum 25g portion
    const maxPortion = 300; // Maximum 300g portion

    const newGrams = increment
      ? Math.min(maxPortion, currentGrams + step)
      : Math.max(minPortion, currentGrams - step);

    onUpdatePortion(mealFoodId, newGrams);
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

  const handlePortionInputBlur = (mealFoodId: string) => {
    const newGrams = parseInt(tempPortionValue) || 25;
    const minPortion = 25;
    const maxPortion = 300;
    const validGrams = Math.min(maxPortion, Math.max(minPortion, newGrams));

    onUpdatePortion(mealFoodId, validGrams);
    setEditingPortionId(null);
  };

  const handlePortionInputKeyDown = (e: React.KeyboardEvent, mealFoodId: string) => {
    if (e.key === 'Enter') {
      handlePortionInputBlur(mealFoodId);
    } else if (e.key === 'Escape') {
      setEditingPortionId(null);
    }
  };

  return (
    <div className="bg-[rgb(28,28,28)] rounded-lg shadow-lg border border-[#f8c045]/10">
      {/* Header */}
      <div className="p-4 border-b border-[#f8c045]/10">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-[#f8c045]">
              {translateMeal(meal.name) || `${t('meal')} ${index + 1}`}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {mealMacros.calories} {t('calories')}
            </p>
          </div>
          <button
            onClick={onAddFood}
            className="flex items-center text-[#f8c045] hover:text-[#e6b041] transition"
          >
            <Plus size={20} className="mr-1" />
            {t('addFood')}
          </button>
        </div>
      </div>

      {/* Food List */}
      <div className="divide-y divide-[#f8c045]/10">
        {meal.meal_foods?.map((mealFood) => {
          const portion = Math.round(mealFood.quantity * mealFood.food.portion_size);
          const calories = Math.round(mealFood.food.calories * mealFood.quantity);
          const protein = (mealFood.food.protein * mealFood.quantity).toFixed(1);
          const carbs = (mealFood.food.carbs * mealFood.quantity).toFixed(1);
          const fats = (mealFood.food.fats * mealFood.quantity).toFixed(1);

          return (
            <div key={mealFood.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h4
                      className="text-white font-medium cursor-pointer hover:text-[#f8c045] transition"
                      onClick={() => {
                        setSelectedFoodForSubstitution({
                          id: mealFood.food.id,
                          name: getFoodName(mealFood.food),
                          protein: mealFood.food.protein,
                          carbs: mealFood.food.carbs,
                          fats: mealFood.food.fats,
                          calories: mealFood.food.calories,
                          quantity: mealFood.quantity
                        });
                        setSubstitutionModalOpen(true);
                      }}
                      title={language === 'pt' ? 'Clique para substituir' : 'Click to substitute'}
                    >
                      {getFoodName(mealFood.food)}
                    </h4>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handlePortionChange(mealFood.id, portion, false)}
                        className="text-[#f8c045] hover:text-[#e6b041] transition p-1"
                        title={t('decreasePortion')}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {editingPortionId === mealFood.id ? (
                        <input
                          type="text"
                          value={tempPortionValue}
                          onChange={(e) => handlePortionInputChange(e.target.value)}
                          onBlur={() => handlePortionInputBlur(mealFood.id)}
                          onKeyDown={(e) => handlePortionInputKeyDown(e, mealFood.id)}
                          className="w-16 bg-[rgb(23,23,23)] text-[#f8c045] text-center rounded border border-[#f8c045] focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 px-1 py-0.5"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => handlePortionClick(mealFood.id, portion)}
                          className="text-[#f8c045] min-w-[3ch] text-center cursor-pointer hover:bg-[rgb(23,23,23)] px-2 py-0.5 rounded transition"
                        >
                          {portion}g
                        </span>
                      )}
                      <button
                        onClick={() => handlePortionChange(mealFood.id, portion, true)}
                        className="text-[#f8c045] hover:text-[#e6b041] transition p-1"
                        title={t('increasePortion')}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <span>{calories} kcal</span>
                    <span className="mx-2">•</span>
                    <span>P: {protein}g</span>
                    <span className="mx-2">•</span>
                    <span>C: {carbs}g</span>
                    <span className="mx-2">•</span>
                    <span>G: {fats}g</span>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteFood(mealFood.id)}
                  className="text-gray-400 hover:text-red-500 transition ml-4"
                  disabled={deleteLoading}
                >
                  <Trash2 size={18} className={deleteLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with Totals */}
      <div className="p-4 border-t border-[#f8c045]/10 bg-[rgb(23,23,23)]">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">{t('total')}</span>
          <div className="flex items-center space-x-4 text-[#f8c045]">
            <span>P: {Math.round(mealMacros.protein)}g</span>
            <span>C: {Math.round(mealMacros.carbs)}g</span>
            <span>G: {Math.round(mealMacros.fats)}g</span>
            <span className="font-semibold">{mealMacros.calories} kcal</span>
          </div>
        </div>
      </div>

      {selectedFoodForSubstitution && (
        <FoodSubstitutionModal
          isOpen={substitutionModalOpen}
          onClose={() => {
            setSubstitutionModalOpen(false);
            setSelectedFoodForSubstitution(null);
          }}
          currentFood={selectedFoodForSubstitution}
          mealId={meal.id}
          onSubstitute={() => {
            onSubstituteFood();
            setSubstitutionModalOpen(false);
            setSelectedFoodForSubstitution(null);
          }}
        />
      )}
    </div>
  );
}