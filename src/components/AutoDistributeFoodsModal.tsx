import React, { useState, useEffect } from 'react';
import { X, Sparkles, Search, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Food, FoodCategory, Meal } from '../types';
import { useTranslation } from '../translations';
import { useLanguageStore } from '../store/languageStore';

interface AutoDistributeFoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dietId: string;
  meals: Meal[];
  onDistribute: (mealSelections: { mealId: string; foodIds: string[] }[]) => void;
}

export default function AutoDistributeFoodsModal({
  isOpen,
  onClose,
  dietId,
  meals,
  onDistribute
}: AutoDistributeFoodsModalProps) {
  const { t } = useTranslation();
  const language = useLanguageStore(state => state.language);
  const [currentStep, setCurrentStep] = useState(0);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mealSelections, setMealSelections] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(false);

  const currentMeal = meals[currentStep];
  const isLastStep = currentStep === meals.length - 1;

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchFoods();
      setCurrentStep(0);
      setMealSelections(new Map());
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedCategory('');
    setSearchTerm('');
  }, [currentStep]);

  const getFoodName = (food: { name: string; name_en?: string | null }) => {
    if (language === 'en' && food.name_en) {
      return food.name_en;
    }
    return food.name;
  };

  const getCategoryName = (category: { name: string; name_en?: string | null }) => {
    if (language === 'en' && category.name_en) {
      return category.name_en;
    }
    return category.name;
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('food_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const fetchFoods = async () => {
    const { data, error } = await supabase
      .from('foods')
      .select('*, food_categories(*)')
      .order('name');

    if (error) {
      console.error('Error fetching foods:', error);
      return;
    }

    setFoods(data || []);
  };

  const toggleFoodSelection = (foodId: string) => {
    if (!currentMeal) return;

    setMealSelections(prev => {
      const newMap = new Map(prev);
      const currentSet = new Set(newMap.get(currentMeal.id) || []);

      if (currentSet.has(foodId)) {
        currentSet.delete(foodId);
      } else {
        currentSet.add(foodId);
      }

      newMap.set(currentMeal.id, currentSet);
      return newMap;
    });
  };

  const handleNext = () => {
    if (currentStep < meals.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDistribute = async () => {
    const selections = Array.from(mealSelections.entries()).map(([mealId, foodIds]) => ({
      mealId,
      foodIds: Array.from(foodIds)
    }));

    const totalSelectedFoods = selections.reduce((sum, sel) => sum + sel.foodIds.length, 0);

    if (totalSelectedFoods === 0) {
      alert(language === 'en' ? 'Please select at least one food' : 'Selecione pelo menos um alimento');
      return;
    }

    setLoading(true);
    try {
      await onDistribute(selections);
      onClose();
    } catch (err) {
      console.error('Error distributing foods:', err);
      alert('Erro ao distribuir alimentos: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !currentMeal) return null;

  const currentSelectedFoodIds = mealSelections.get(currentMeal.id) || new Set();

  const filteredFoods = foods
    .filter(food => !selectedCategory || food.category_id === selectedCategory)
    .filter(food => {
      if (!searchTerm) return true;
      const foodName = getFoodName(food).toLowerCase();
      return foodName.includes(searchTerm.toLowerCase());
    })
    .reduce((uniqueFoods: Food[], food) => {
      const isDuplicate = uniqueFoods.some(
        f => getFoodName(f).toLowerCase() === getFoodName(food).toLowerCase()
      );
      if (!isDuplicate) {
        uniqueFoods.push(food);
      }
      return uniqueFoods;
    }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-2xl my-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Sparkles className="text-[#f8c045] mr-2" size={24} />
            <h2 className="text-xl font-semibold text-[#f8c045]">
              {language === 'en' ? 'Auto Distribute Foods' : 'Distribuir Alimentos Automaticamente'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {meals.map((meal, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const hasSelection = (mealSelections.get(meal.id)?.size || 0) > 0;

              return (
                <React.Fragment key={meal.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                        isCompleted
                          ? 'bg-green-600 text-white'
                          : isCurrent
                          ? 'bg-[#f8c045] text-[rgb(23,23,23)]'
                          : hasSelection
                          ? 'bg-[#f8c045]/30 text-[#f8c045]'
                          : 'bg-[rgb(23,23,23)] text-gray-500'
                      }`}
                    >
                      {isCompleted ? <Check size={20} /> : index + 1}
                    </div>
                    <span className={`text-xs mt-1 ${isCurrent ? 'text-[#f8c045]' : 'text-gray-500'}`}>
                      {meal.name}
                    </span>
                  </div>
                  {index < meals.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-[rgb(23,23,23)]'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20">
            <h3 className="text-white font-semibold mb-2">{currentMeal.name}</h3>
            <p className="text-sm text-gray-400">
              {language === 'en'
                ? `Select foods for this meal (${currentSelectedFoodIds.size} selected)`
                : `Selecione os alimentos para esta refeição (${currentSelectedFoodIds.size} selecionados)`}
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              {t('category')}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
            >
              <option value="">{t('allCategories')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryName(category)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              {t('searchFood')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder={t('searchFood')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 pl-10 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-300 text-sm font-bold">
                {language === 'en' ? 'Select Foods' : 'Selecionar Alimentos'}
              </label>
              {currentSelectedFoodIds.size > 0 && (
                <button
                  onClick={() => {
                    setMealSelections(prev => {
                      const newMap = new Map(prev);
                      newMap.set(currentMeal.id, new Set());
                      return newMap;
                    });
                  }}
                  className="text-sm text-[#f8c045] hover:text-[#e6b041]"
                >
                  {language === 'en' ? 'Clear' : 'Limpar'}
                </button>
              )}
            </div>
            <div className="bg-[rgb(23,23,23)] rounded-lg border border-[#f8c045]/20 max-h-80 overflow-y-auto">
              {filteredFoods.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {language === 'en' ? 'No foods found' : 'Nenhum alimento encontrado'}
                </div>
              ) : (
                <div className="divide-y divide-[#f8c045]/10">
                  {filteredFoods.map((food) => (
                    <label
                      key={food.id}
                      className="flex items-center p-3 hover:bg-[rgb(28,28,28)] cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={currentSelectedFoodIds.has(food.id)}
                        onChange={() => toggleFoodSelection(food.id)}
                        className="w-5 h-5 rounded border-[#f8c045]/20 bg-[rgb(28,28,28)] text-[#f8c045] focus:ring-2 focus:ring-[#f8c045]/50"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-white font-medium">{getFoodName(food)}</p>
                        <p className="text-sm text-gray-400">
                          {Math.round(food.calories)} kcal • P: {food.protein.toFixed(1)}g • C: {food.carbs.toFixed(1)}g • G: {food.fats.toFixed(1)}g
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-2 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045] flex items-center justify-center"
            >
              <ChevronLeft size={18} className="mr-2" />
              {language === 'en' ? 'Back' : 'Voltar'}
            </button>
          )}

          {!isLastStep ? (
            <button
              onClick={handleNext}
              className="flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold flex items-center justify-center"
            >
              {language === 'en' ? 'Next' : 'Próxima'}
              <ChevronRight size={18} className="ml-2" />
            </button>
          ) : (
            <button
              onClick={handleDistribute}
              disabled={loading}
              className={`flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg transition font-semibold flex items-center justify-center ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e6b041]'
              }`}
            >
              <Sparkles size={18} className="mr-2" />
              {loading
                ? (language === 'en' ? 'Distributing...' : 'Distribuindo...')
                : (language === 'en' ? 'Distribute' : 'Distribuir')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
