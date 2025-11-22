import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { Food } from '../types';

interface BaseFoodSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  meals: string[];
  allFoods: Food[];
  onComplete: (selectedFoods: Record<string, string[]>) => void;
}

export default function BaseFoodSelectionModal({
  isOpen,
  onClose,
  meals,
  allFoods,
  onComplete
}: BaseFoodSelectionModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFoods, setSelectedFoods] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const currentMeal = meals[currentStep];
  const currentMealFoods = selectedFoods[currentMeal] || [];

  const filteredFoods = allFoods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFood = (foodId: string) => {
    setSelectedFoods(prev => {
      const current = prev[currentMeal] || [];
      const isSelected = current.includes(foodId);

      return {
        ...prev,
        [currentMeal]: isSelected
          ? current.filter(id => id !== foodId)
          : [...current, foodId]
      };
    });
  };

  const handleNext = () => {
    if (currentStep < meals.length - 1) {
      setCurrentStep(currentStep + 1);
      setSearchTerm('');
    } else {
      onComplete(selectedFoods);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setSearchTerm('');
    }
  };

  const handleSkip = () => {
    if (currentStep < meals.length - 1) {
      setCurrentStep(currentStep + 1);
      setSearchTerm('');
    } else {
      onComplete(selectedFoods);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80] p-4">
      <div className="bg-[rgb(23,23,23)] border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">
              Selecione Alimentos Base
            </h3>
            <p className="text-gray-400 text-sm">
              Etapa {currentStep + 1} de {meals.length}: {currentMeal}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <p className="text-gray-300 text-sm mb-3">
              Escolha os alimentos que você quer nesta refeição. A IA vai adicionar outros alimentos para completar as macros.
            </p>
            <p className="text-[#f8c045] text-xs">
              💡 Você pode pular esta etapa se quiser deixar a IA escolher tudo
            </p>
          </div>

          <input
            type="text"
            placeholder="Buscar alimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-[rgb(30,30,30)] border border-gray-700 text-white placeholder-gray-500 focus:border-[#f8c045] focus:outline-none mb-4"
          />

          {currentMealFoods.length > 0 && (
            <div className="mb-4 p-3 bg-[#f8c045]/10 border border-[#f8c045]/30 rounded-lg">
              <div className="text-sm font-semibold text-[#f8c045] mb-2">
                Alimentos selecionados: {currentMealFoods.length}
              </div>
              <div className="flex flex-wrap gap-2">
                {currentMealFoods.map(foodId => {
                  const food = allFoods.find(f => f.id === foodId);
                  return (
                    <div
                      key={foodId}
                      className="px-2 py-1 bg-[#f8c045] text-black text-xs rounded-full font-medium"
                    >
                      {food?.name}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredFoods.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum alimento encontrado
              </div>
            ) : (
              filteredFoods.map(food => {
                const isSelected = currentMealFoods.includes(food.id);
                return (
                  <button
                    key={food.id}
                    onClick={() => toggleFood(food.id)}
                    className={`w-full p-3 rounded-lg border transition text-left ${
                      isSelected
                        ? 'bg-[#f8c045]/20 border-[#f8c045] text-white'
                        : 'bg-[rgb(30,30,30)] border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{food.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {food.calories}kcal | P: {food.protein}g | C: {food.carbs}g | G: {food.fats}g
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-[#f8c045] ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition"
              >
                Pular
              </button>

              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#f8c045] to-orange-500 hover:from-orange-500 hover:to-[#f8c045] text-white font-semibold transition flex items-center gap-2"
              >
                {currentStep === meals.length - 1 ? (
                  <>
                    <Check className="w-4 h-4" />
                    Finalizar
                  </>
                ) : (
                  <>
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
