import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { supabase } from '../lib/supabase';
import type { Meal } from '../types';

interface TransferFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMeal: Meal;
  mealFoodId: string;
  foodName: string;
  dietId: string;
  onTransfer: () => void;
}

export function TransferFoodModal({
  isOpen,
  onClose,
  currentMeal,
  mealFoodId,
  foodName,
  dietId,
  onTransfer
}: TransferFoodModalProps) {
  const language = useLanguageStore(state => state.language);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMeals();
    }
  }, [isOpen, dietId]);

  async function loadMeals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('id, name, name_en')
        .eq('diet_id', dietId)
        .neq('id', currentMeal.id)
        .order('name');

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer() {
    if (!selectedMealId) return;

    setTransferring(true);
    try {
      const { error } = await supabase
        .from('meal_foods')
        .update({ meal_id: selectedMealId })
        .eq('id', mealFoodId);

      if (error) throw error;

      onTransfer();
      onClose();
    } catch (error) {
      console.error('Error transferring food:', error);
    } finally {
      setTransferring(false);
    }
  }

  const getMealName = (meal: { name: string; name_en?: string | null }) => {
    if (language === 'en' && meal.name_en) {
      return meal.name_en;
    }
    return meal.name;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(28,28,28)] rounded-lg shadow-xl max-w-md w-full border border-[#f8c045]/20">
        <div className="flex items-center justify-between p-6 border-b border-[#f8c045]/10">
          <h2 className="text-2xl font-bold text-[#f8c045]">
            {language === 'pt' ? 'Transferir Alimento' : 'Transfer Food'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="bg-[rgb(23,23,23)] rounded-lg p-4 border border-[#f8c045]/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">
                    {language === 'pt' ? 'Alimento' : 'Food'}
                  </p>
                  <p className="text-white font-semibold">{foodName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">
                    {language === 'pt' ? 'De' : 'From'}
                  </p>
                  <p className="text-[#f8c045] font-semibold">
                    {getMealName(currentMeal)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">
              {language === 'pt' ? 'Transferir para' : 'Transfer to'}
            </label>
            {loading ? (
              <div className="text-center py-8 text-gray-400">
                {language === 'pt' ? 'Carregando refeições...' : 'Loading meals...'}
              </div>
            ) : meals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {language === 'pt' ? 'Nenhuma outra refeição disponível' : 'No other meals available'}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {meals.map((meal) => (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedMealId(meal.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedMealId === meal.id
                        ? 'border-[#f8c045] bg-[rgb(23,23,23)] text-[#f8c045]'
                        : 'border-[#f8c045]/20 hover:border-[#f8c045]/50 text-white hover:bg-[rgb(23,23,23)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{getMealName(meal)}</span>
                      {selectedMealId === meal.id && (
                        <ArrowRight size={20} className="text-[#f8c045]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[rgb(23,23,23)] text-gray-400 rounded-lg hover:bg-[rgb(33,33,33)] transition"
              disabled={transferring}
            >
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleTransfer}
              disabled={!selectedMealId || transferring}
              className="flex-1 px-6 py-3 bg-[#f8c045] text-[rgb(18,18,18)] rounded-lg hover:bg-[#e6b041] transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {transferring
                ? language === 'pt' ? 'Transferindo...' : 'Transferring...'
                : language === 'pt' ? 'Transferir' : 'Transfer'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
