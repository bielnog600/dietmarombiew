import React, { useState, useEffect } from 'react';
import { X, Sparkles, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Food, FoodCategory } from '../types';
import { useTranslation } from '../translations';
import { useLanguageStore } from '../store/languageStore';

interface AutoDistributeFoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dietId: string;
  onDistribute: (selectedFoodIds: string[]) => void;
}

export default function AutoDistributeFoodsModal({
  isOpen,
  onClose,
  dietId,
  onDistribute
}: AutoDistributeFoodsModalProps) {
  const { t } = useTranslation();
  const language = useLanguageStore(state => state.language);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFoodIds, setSelectedFoodIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchFoods();
    }
  }, [isOpen]);

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
    setSelectedFoodIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(foodId)) {
        newSet.delete(foodId);
      } else {
        newSet.add(foodId);
      }
      return newSet;
    });
  };

  const handleDistribute = async () => {
    if (selectedFoodIds.size === 0) {
      return;
    }

    setLoading(true);
    try {
      await onDistribute(Array.from(selectedFoodIds));
      onClose();
    } catch (err) {
      console.error('Error distributing foods:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

        <p className="text-gray-400 mb-4 text-sm">
          {language === 'en'
            ? 'Select the foods you like and we will distribute them across your meals to match your calorie and macro targets.'
            : 'Selecione os alimentos que você gosta e vamos distribuí-los entre suas refeições para bater suas calorias e macros.'}
        </p>

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
                {language === 'en' ? 'Select Foods' : 'Selecionar Alimentos'} ({selectedFoodIds.size})
              </label>
              {selectedFoodIds.size > 0 && (
                <button
                  onClick={() => setSelectedFoodIds(new Set())}
                  className="text-sm text-[#f8c045] hover:text-[#e6b041]"
                >
                  {language === 'en' ? 'Clear All' : 'Limpar Tudo'}
                </button>
              )}
            </div>
            <div className="bg-[rgb(23,23,23)] rounded-lg border border-[#f8c045]/20 max-h-96 overflow-y-auto">
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
                        checked={selectedFoodIds.has(food.id)}
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
          <button
            onClick={onClose}
            className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-2 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045]"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleDistribute}
            disabled={loading || selectedFoodIds.size === 0}
            className={`flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg transition font-semibold flex items-center justify-center ${
              loading || selectedFoodIds.size === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[#e6b041]'
            }`}
          >
            <Sparkles size={18} className="mr-2" />
            {loading
              ? (language === 'en' ? 'Distributing...' : 'Distribuindo...')
              : (language === 'en' ? 'Auto Distribute' : 'Distribuir Automaticamente')}
          </button>
        </div>
      </div>
    </div>
  );
}
