import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Food, FoodCategory, Diet, MacroDistribution } from '../types';
import { useTranslation } from '../translations';
import { useLanguageStore } from '../store/languageStore';

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealId: string;
  onFoodAdded: (foodId: string, quantity: number) => void;
  skipInsert?: boolean;
}

export default function AddFoodModal({ isOpen, onClose, mealId, onFoodAdded, skipInsert = false }: AddFoodModalProps) {
  const { t } = useTranslation();
  const language = useLanguageStore(state => state.language);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diet, setDiet] = useState<Diet | null>(null);
  const [targetMacros, setTargetMacros] = useState<MacroDistribution | null>(null);
  const [remainingMacros, setRemainingMacros] = useState<MacroDistribution | null>(null);
  const [existingFoods, setExistingFoods] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchCategories();
    fetchFoods();
    fetchDietAndMacros();
    fetchExistingFoods();
  }, []);

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

  const fetchExistingFoods = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_foods')
        .select('food_id')
        .eq('meal_id', mealId);

      if (error) throw error;

      setExistingFoods(new Set(data?.map(mf => mf.food_id)));
    } catch (err) {
      console.error('Error fetching existing foods:', err);
    }
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

  const fetchDietAndMacros = async () => {
    try {
      // First get the meal to find the diet_id
      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .select('diet_id')
        .eq('id', mealId)
        .single();

      if (mealError) throw mealError;

      // Then get the diet with all meals and foods
      const { data: dietData, error: dietError } = await supabase
        .from('diets')
        .select(`
          *,
          meals:meals(
            *,
            meal_foods:meal_foods(
              *,
              food:foods(*)
            )
          )
        `)
        .eq('id', mealData.diet_id)
        .single();

      if (dietError) throw dietError;

      setDiet(dietData);

      // Calculate target macros based on diet calories
      const targetProtein = Math.round((dietData.calories * 0.3) / 4); // 30% from protein
      const targetCarbs = Math.round((dietData.calories * 0.45) / 4);  // 45% from carbs
      const targetFats = Math.round((dietData.calories * 0.25) / 9);   // 25% from fats

      const macros = {
        protein: targetProtein,
        carbs: targetCarbs,
        fats: targetFats
      };

      setTargetMacros(macros);

      // Calculate current macros from existing foods
      const currentMacros = dietData.meals.reduce((acc: MacroDistribution, meal) => {
        meal.meal_foods?.forEach(mf => {
          acc.protein += mf.food.protein * mf.quantity;
          acc.carbs += mf.food.carbs * mf.quantity;
          acc.fats += mf.food.fats * mf.quantity;
        });
        return acc;
      }, { protein: 0, carbs: 0, fats: 0 });

      // Calculate remaining macros
      setRemainingMacros({
        protein: Math.max(0, macros.protein - currentMacros.protein),
        carbs: Math.max(0, macros.carbs - currentMacros.carbs),
        fats: Math.max(0, macros.fats - currentMacros.fats)
      });
    } catch (err) {
      console.error('Error fetching diet data:', err);
    }
  };

  const calculateOptimalPortion = (food: Food): number => {
    if (!remainingMacros) return 100; // Default to 100g if no macro targets

    // Calculate portion sizes based on each macro
    const portions = {
      protein: food.protein > 0 ? (remainingMacros.protein / food.protein) * 100 : 0,
      carbs: food.carbs > 0 ? (remainingMacros.carbs / food.carbs) * 100 : 0,
      fats: food.fats > 0 ? (remainingMacros.fats / food.fats) * 100 : 0
    };

    // Get the smallest non-zero portion that would satisfy any macro
    let portionSize = Math.min(
      ...[portions.protein, portions.carbs, portions.fats]
        .filter(p => p > 0)
    );

    // If no portion was calculated, use default
    if (!portionSize || !isFinite(portionSize)) {
      portionSize = 100;
    }

    // Ensure portion is within reasonable bounds
    portionSize = Math.min(300, Math.max(25, portionSize));

    return Math.round(portionSize);
  };

  const handleFoodSelect = (foodId: string) => {
    const food = foods.find(f => f.id === foodId);
    setSelectedFood(food || null);
    
    if (food) {
      const optimalPortion = calculateOptimalPortion(food);
      setQuantity(optimalPortion / food.portion_size);
    }
  };

  const handleAddFood = async () => {
    if (!selectedFood || !quantity) {
      setError(t('selectFoodAndQuantity'));
      return;
    }

    // Check if food already exists in meal
    if (existingFoods.has(selectedFood.id)) {
      setError(t('foodAlreadyExists'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!skipInsert) {
        const { error } = await supabase
          .from('meal_foods')
          .insert([
            {
              meal_id: mealId,
              food_id: selectedFood.id,
              quantity: quantity
            }
          ]);

        if (error) throw error;
      }

      onFoodAdded(selectedFood.id, quantity);
      onClose();
    } catch (err: any) {
      console.error('Error adding food:', err);
      if (err.message?.includes('Food item already exists in this meal')) {
        setError(t('foodAlreadyExists'));
      } else {
        setError(t('errorAddingFood'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-md my-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#f8c045]">{t('addFood')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
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
              {t('food')}
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder={t('searchFood')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 pl-10 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
              />
            </div>
            <select
              value={selectedFood?.id || ''}
              onChange={(e) => handleFoodSelect(e.target.value)}
              className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 max-h-48 overflow-y-auto"
              size={8}
            >
              <option value="">{t('selectFood')}</option>
              {foods
                .filter(food => !selectedCategory || food.category_id === selectedCategory)
                .filter(food => !existingFoods.has(food.id))
                .filter(food => {
                  if (!searchTerm) return true;
                  const foodName = getFoodName(food).toLowerCase();
                  return foodName.includes(searchTerm.toLowerCase());
                })
                .map((food) => (
                  <option key={food.id} value={food.id}>
                    {getFoodName(food)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              {t('quantityInGrams')}
            </label>
            <input
              type="number"
              min="25"
              max="300"
              step="5"
              value={selectedFood ? Math.round(quantity * selectedFood.portion_size) : 0}
              onChange={(e) => {
                if (selectedFood) {
                  setQuantity(Number(e.target.value) / selectedFood.portion_size);
                }
              }}
              className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
            />
          </div>

          {selectedFood && (
            <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20">
              <h3 className="font-semibold text-[#f8c045] mb-2">{t('nutritionalInfo')}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">{t('calories')}:</div>
                <div className="text-gray-300">{Math.round(selectedFood.calories * quantity)} kcal</div>
                <div className="text-gray-400">{t('proteins')}:</div>
                <div className="text-gray-300">{(selectedFood.protein * quantity).toFixed(1)}g</div>
                <div className="text-gray-400">{t('carbohydrates')}:</div>
                <div className="text-gray-300">{(selectedFood.carbs * quantity).toFixed(1)}g</div>
                <div className="text-gray-400">{t('fats')}:</div>
                <div className="text-gray-300">{(selectedFood.fats * quantity).toFixed(1)}g</div>
              </div>
            </div>
          )}

          {remainingMacros && (
            <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20">
              <h3 className="font-semibold text-[#f8c045] mb-2">{t('remainingMacros')}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">{t('proteins')}:</div>
                <div className="text-gray-300">{Math.round(remainingMacros.protein)}g</div>
                <div className="text-gray-400">{t('carbohydrates')}:</div>
                <div className="text-gray-300">{Math.round(remainingMacros.carbs)}g</div>
                <div className="text-gray-400">{t('fats')}:</div>
                <div className="text-gray-300">{Math.round(remainingMacros.fats)}g</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-2 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045]"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleAddFood}
            disabled={loading || !selectedFood}
            className={`flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg transition font-semibold ${
              loading || !selectedFood
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[#e6b041]'
            }`}
          >
            {loading ? t('adding') : t('add')}
          </button>
        </div>
      </div>
    </div>
  );
}