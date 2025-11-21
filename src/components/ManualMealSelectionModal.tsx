import React, { useState } from 'react';
import { X, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Food } from '../types';

interface ManualMealSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealNames: string[];
  currentStep: number;
  onStepChange: (step: number) => void;
  selectedFoods: Record<string, Array<{foodId: string, quantity: number}>>;
  onFoodSelection: (mealName: string, foods: Array<{foodId: string, quantity: number}>) => void;
  allFoods: Food[];
  onFinish: () => void;
}

export default function ManualMealSelectionModal({
  isOpen,
  onClose,
  mealNames,
  currentStep,
  onStepChange,
  selectedFoods,
  onFoodSelection,
  allFoods,
  onFinish
}: ManualMealSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelectedFoods, setTempSelectedFoods] = useState<Array<{foodId: string, quantity: number}>>(
    selectedFoods[mealNames[currentStep]] || []
  );

  if (!isOpen) return null;

  const currentMealName = mealNames[currentStep];
  const filteredFoods = allFoods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleFood = (foodId: string) => {
    const exists = tempSelectedFoods.find(f => f.foodId === foodId);
    if (exists) {
      setTempSelectedFoods(tempSelectedFoods.filter(f => f.foodId !== foodId));
    } else {
      setTempSelectedFoods([...tempSelectedFoods, { foodId, quantity: 1 }]);
    }
  };

  const handleQuantityChange = (foodId: string, quantity: number) => {
    setTempSelectedFoods(
      tempSelectedFoods.map(f =>
        f.foodId === foodId ? { ...f, quantity } : f
      )
    );
  };

  const handleNext = () => {
    onFoodSelection(currentMealName, tempSelectedFoods);

    if (currentStep < mealNames.length - 1) {
      const nextStep = currentStep + 1;
      onStepChange(nextStep);
      setTempSelectedFoods(selectedFoods[mealNames[nextStep]] || []);
      setSearchTerm('');
    } else {
      onFinish();
    }
  };

  const handleBack = () => {
    onFoodSelection(currentMealName, tempSelectedFoods);

    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      onStepChange(prevStep);
      setTempSelectedFoods(selectedFoods[mealNames[prevStep]] || []);
      setSearchTerm('');
    }
  };

  const handleClose = () => {
    setTempSelectedFoods([]);
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4">
      <div className="bg-[rgb(23,23,23)] border border-gray-700 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              {currentMealName}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Passo {currentStep + 1} de {mealNames.length}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex gap-1">
            {mealNames.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded ${
                  index <= currentStep ? 'bg-[#f8c045]' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar alimento..."
          className="w-full px-4 py-2 mb-4 bg-[rgb(28,28,28)] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#f8c045]"
        />

        {/* Selected Foods Summary */}
        {tempSelectedFoods.length > 0 && (
          <div className="mb-4 p-4 bg-[#f8c045]/10 border border-[#f8c045]/30 rounded-lg">
            <h4 className="text-sm font-semibold text-[#f8c045] mb-2">
              Alimentos Selecionados ({tempSelectedFoods.length})
            </h4>
            <div className="space-y-2">
              {tempSelectedFoods.map(({ foodId, quantity }) => {
                const food = allFoods.find(f => f.id === foodId);
                if (!food) return null;
                return (
                  <div key={foodId} className="flex items-center justify-between text-sm">
                    <span className="text-white">{food.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(foodId, parseFloat(e.target.value) || 1)}
                        step="0.1"
                        min="0.1"
                        className="w-20 px-2 py-1 bg-[rgb(28,28,28)] border border-gray-600 rounded text-white text-center"
                      />
                      <span className="text-gray-400">x 100g</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Foods List */}
        <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto">
          {filteredFoods.map(food => {
            const isSelected = tempSelectedFoods.some(f => f.foodId === food.id);
            return (
              <button
                key={food.id}
                onClick={() => handleToggleFood(food.id)}
                className={`w-full p-3 rounded-lg text-left transition ${
                  isSelected
                    ? 'bg-[#f8c045]/20 border-2 border-[#f8c045]'
                    : 'bg-[rgb(28,28,28)] border-2 border-transparent hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-white">{food.name}</div>
                    <div className="text-sm text-gray-400">
                      {food.calories}kcal • P: {food.protein}g • C: {food.carbs}g • G: {food.fats}g
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-[#f8c045] flex-shrink-0 ml-2" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition"
            >
              <ChevronLeft className="w-5 h-5" />
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={tempSelectedFoods.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#f8c045] text-black font-semibold hover:bg-[#f8c045]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === mealNames.length - 1 ? 'Gerar Dieta com IA' : 'Próxima Refeição'}
            {currentStep < mealNames.length - 1 && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
