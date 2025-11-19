import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Food, Meal } from '../types';

interface PasteDietModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  dietId: string;
  meals: Meal[];
  onDietGenerated: () => void;
}

export default function PasteDietModal({
  isOpen,
  onClose,
  userId,
  dietId,
  meals,
  onDietGenerated
}: PasteDietModalProps) {
  const [dietText, setDietText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const parseDietText = async (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsedMeals: Array<{ mealName: string; foods: Array<{ quantity: number; food: string }> }> = [];
    let currentMeal: { mealName: string; foods: Array<{ quantity: number; food: string }> } | null = null;

    const mealNames: Record<string, string> = {
      'café da manhã': 'Café da Manhã',
      'cafe da manha': 'Café da Manhã',
      'breakfast': 'Café da Manhã',
      'almoço': 'Almoço',
      'almoco': 'Almoço',
      'lunch': 'Almoço',
      'lanche da tarde': 'Lanche',
      'lanche': 'Lanche',
      'snack': 'Lanche',
      'jantar': 'Jantar',
      'dinner': 'Jantar',
      'ceia': 'Ceia',
      'supper': 'Ceia',
      'pré-treino': 'Pré-treino',
      'pre-treino': 'Pré-treino',
      'pre workout': 'Pré-treino',
      'pós-treino': 'Pós-treino',
      'pos-treino': 'Pós-treino',
      'post workout': 'Pós-treino'
    };

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();

      if (trimmed.includes(':') && !trimmed.match(/^\d/)) {
        const mealKey = trimmed.split(':')[0].trim();
        const standardMeal = mealNames[mealKey];

        if (standardMeal) {
          if (currentMeal) {
            parsedMeals.push(currentMeal);
          }
          currentMeal = { mealName: standardMeal, foods: [] };
        }
      } else if (currentMeal) {
        const match = trimmed.match(/^(\d+)g?\s+(?:de\s+)?(.+)/);
        if (match) {
          const quantity = parseInt(match[1]);
          const foodName = match[2].trim();
          currentMeal.foods.push({ quantity, food: foodName });
        }
      }
    }

    if (currentMeal) {
      parsedMeals.push(currentMeal);
    }

    return parsedMeals;
  };

  const findFoodInDatabase = async (foodName: string): Promise<Food | null> => {
    const cleanName = foodName
      .replace(/\(.*?\)/g, '')
      .trim();

    try {
      const { data: allFoods, error } = await supabase
        .from('foods')
        .select('*');

      if (error) {
        console.error('Error fetching foods:', error);
        return null;
      }

      if (!allFoods || allFoods.length === 0) return null;

      const lowerCleanName = cleanName.toLowerCase();

      const exactMatch = allFoods.find(f =>
        f.name.toLowerCase() === lowerCleanName
      );

      if (exactMatch) return exactMatch;

      const partialMatch = allFoods.find(f =>
        f.name.toLowerCase().includes(lowerCleanName) ||
        lowerCleanName.includes(f.name.toLowerCase())
      );

      return partialMatch || null;
    } catch (err) {
      console.error('Error in findFoodInDatabase:', err);
      return null;
    }
  };

  const handleProcess = async () => {
    if (!dietText.trim()) {
      setError('Por favor, cole o texto da dieta');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const parsedMeals = await parseDietText(dietText);

      if (parsedMeals.length === 0) {
        throw new Error('Não foi possível reconhecer nenhuma refeição no texto');
      }

      for (const parsedMeal of parsedMeals) {
        const meal = meals.find(m => m.name === parsedMeal.mealName);

        if (!meal) {
          console.warn(`Refeição ${parsedMeal.mealName} não encontrada nas refeições disponíveis:`, meals.map(m => m.name));
          continue;
        }

        await supabase
          .from('meal_foods')
          .delete()
          .eq('meal_id', meal.id);

        for (const item of parsedMeal.foods) {
          const food = await findFoodInDatabase(item.food);

          if (food) {
            const calculatedQuantity = item.quantity / food.portion_size;

            await supabase
              .from('meal_foods')
              .insert({
                meal_id: meal.id,
                food_id: food.id,
                quantity: calculatedQuantity
              });
          } else {
            console.warn(`Alimento não encontrado: ${item.food}`);
          }
        }
      }

      onDietGenerated();
      onClose();
    } catch (err: any) {
      console.error('Error processing diet:', err);
      setError(err.message || 'Erro ao processar a dieta');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-[rgb(30,30,30)] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[rgb(30,30,30)] border-b border-[#f8c045]/20 p-6 flex items-center justify-between z-10">
          <h3 className="text-xl font-bold text-[#f8c045] flex items-center">
            <Upload className="mr-2" size={24} />
            Colar Modelo de Dieta
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Cole o texto da dieta abaixo:
            </label>
            <textarea
              value={dietText}
              onChange={(e) => setDietText(e.target.value)}
              className="w-full bg-[rgb(23,23,23)] text-gray-300 p-3 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 font-mono text-sm"
              rows={15}
              placeholder={`Exemplo:

Café da Manhã:
150g de Ovos mexidos
150g de Mamão
20g de Aveia em flocos

Almoço:
150g de Peito de peru assado
100g de Arroz integral
100g de Feijão carioca cozido
100g de Brócolis cozido
5g de Azeite de oliva

Lanche da Tarde:
150g de Iogurte grego natural
15g de Nozes

Jantar:
150g de Filé de peixe grelhado
200g de Salada
5g de Azeite de oliva`}
            />
            <p className="text-gray-400 text-xs mt-2">
              O sistema irá reconhecer os alimentos cadastrados e distribuir nas refeições correspondentes.
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleProcess}
              disabled={processing || !dietText.trim()}
              className="flex-1 bg-[#f8c045] hover:bg-[#e6b041] text-black font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processando...' : 'Processar e Gerar Dieta'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
