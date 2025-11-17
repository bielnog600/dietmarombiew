import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

interface Food {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
}

interface FoodSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFood: {
    id: string;
    name: string;
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    quantity: number;
  };
  mealId: string;
  onSubstitute: () => void;
}

export function FoodSubstitutionModal({
  isOpen,
  onClose,
  currentFood,
  mealId,
  onSubstitute
}: FoodSubstitutionModalProps) {
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const t = translations[language];

  const [similarFoods, setSimilarFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadSimilarFoods();
    }
  }, [isOpen, currentFood.id]);

  async function loadSimilarFoods() {
    setLoading(true);
    try {
      const { data: allFoods, error } = await supabase
        .from('foods')
        .select('id, name, protein, carbs, fats, calories')
        .eq('user_id', user!.id)
        .neq('id', currentFood.id);

      if (error) throw error;

      const currentProtein = currentFood.protein * currentFood.quantity;
      const currentCarbs = currentFood.carbs * currentFood.quantity;
      const currentFats = currentFood.fats * currentFood.quantity;
      const currentCalories = currentFood.calories * currentFood.quantity;

      const scored = allFoods.map(food => {
        const tolerance = 0.3;

        let bestScore = Infinity;
        let bestQuantity = 1;

        for (let q = 0.1; q <= 10; q += 0.1) {
          const proteinDiff = Math.abs(food.protein * q - currentProtein);
          const carbsDiff = Math.abs(food.carbs * q - currentCarbs);
          const fatsDiff = Math.abs(food.fats * q - currentFats);
          const caloriesDiff = Math.abs(food.calories * q - currentCalories);

          const score = proteinDiff + carbsDiff + fatsDiff + (caloriesDiff * 0.1);

          if (score < bestScore) {
            bestScore = score;
            bestQuantity = q;
          }
        }

        const proteinMatch = Math.abs(food.protein * bestQuantity - currentProtein) / currentProtein;
        const carbsMatch = Math.abs(food.carbs * bestQuantity - currentCarbs) / (currentCarbs || 1);
        const fatsMatch = Math.abs(food.fats * bestQuantity - currentFats) / (currentFats || 1);

        const isGoodMatch = proteinMatch <= tolerance && carbsMatch <= tolerance && fatsMatch <= tolerance;

        return {
          ...food,
          score: bestScore,
          quantity: bestQuantity,
          isGoodMatch
        };
      });

      const filtered = scored
        .filter(f => f.isGoodMatch)
        .sort((a, b) => a.score - b.score)
        .slice(0, 10);

      setSimilarFoods(filtered);
    } catch (error) {
      console.error('Error loading similar foods:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubstitute() {
    if (!selectedFoodId) return;

    setLoading(true);
    try {
      const selectedFood = similarFoods.find(f => f.id === selectedFoodId);
      if (!selectedFood) return;

      await supabase
        .from('meal_foods')
        .delete()
        .eq('meal_id', mealId)
        .eq('food_id', currentFood.id);

      await supabase
        .from('meal_foods')
        .insert({
          meal_id: mealId,
          food_id: selectedFood.id,
          quantity: (selectedFood as any).quantity
        });

      onSubstitute();
      onClose();
    } catch (error) {
      console.error('Error substituting food:', error);
      alert(language === 'pt' ? 'Erro ao substituir alimento' : 'Error substituting food');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const currentTotalProtein = currentFood.protein * currentFood.quantity;
  const currentTotalCarbs = currentFood.carbs * currentFood.quantity;
  const currentTotalFats = currentFood.fats * currentFood.quantity;
  const currentTotalCalories = currentFood.calories * currentFood.quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'pt' ? 'Substituir Alimento' : 'Substitute Food'}
            </h2>
            <p className="text-gray-600 mt-1">
              {language === 'pt' ? 'Alimentos similares a ' : 'Foods similar to '}
              <span className="font-semibold">{currentFood.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              {language === 'pt' ? 'Alimento Atual' : 'Current Food'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{language === 'pt' ? 'Nome' : 'Name'}:</span>
                <p className="font-semibold">{currentFood.name}</p>
              </div>
              <div>
                <span className="text-gray-600">{language === 'pt' ? 'Proteína' : 'Protein'}:</span>
                <p className="font-semibold">{currentTotalProtein.toFixed(1)}g</p>
              </div>
              <div>
                <span className="text-gray-600">{language === 'pt' ? 'Carboidratos' : 'Carbs'}:</span>
                <p className="font-semibold">{currentTotalCarbs.toFixed(1)}g</p>
              </div>
              <div>
                <span className="text-gray-600">{language === 'pt' ? 'Gorduras' : 'Fats'}:</span>
                <p className="font-semibold">{currentTotalFats.toFixed(1)}g</p>
              </div>
              <div>
                <span className="text-gray-600">{language === 'pt' ? 'Calorias' : 'Calories'}:</span>
                <p className="font-semibold">{currentTotalCalories.toFixed(0)} kcal</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : similarFoods.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {language === 'pt'
                  ? 'Nenhum alimento similar encontrado'
                  : 'No similar foods found'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">
                {language === 'pt' ? 'Alimentos Similares' : 'Similar Foods'} ({similarFoods.length})
              </h3>
              {similarFoods.map((food: any) => {
                const totalProtein = food.protein * food.quantity;
                const totalCarbs = food.carbs * food.quantity;
                const totalFats = food.fats * food.quantity;
                const totalCalories = food.calories * food.quantity;

                const proteinDiff = totalProtein - currentTotalProtein;
                const carbsDiff = totalCarbs - currentTotalCarbs;
                const fatsDiff = totalFats - currentTotalFats;
                const caloriesDiff = totalCalories - currentTotalCalories;

                return (
                  <div
                    key={food.id}
                    onClick={() => setSelectedFoodId(food.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedFoodId === food.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{food.name}</h4>
                        <p className="text-sm text-gray-600">
                          {language === 'pt' ? 'Quantidade' : 'Quantity'}: {food.quantity.toFixed(2)}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">{language === 'pt' ? 'Proteína' : 'Protein'}:</span>
                        <p className="font-semibold">
                          {totalProtein.toFixed(1)}g
                          <span className={proteinDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({proteinDiff >= 0 ? '+' : ''}{proteinDiff.toFixed(1)}g)
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">{language === 'pt' ? 'Carboidratos' : 'Carbs'}:</span>
                        <p className="font-semibold">
                          {totalCarbs.toFixed(1)}g
                          <span className={carbsDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({carbsDiff >= 0 ? '+' : ''}{carbsDiff.toFixed(1)}g)
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">{language === 'pt' ? 'Gorduras' : 'Fats'}:</span>
                        <p className="font-semibold">
                          {totalFats.toFixed(1)}g
                          <span className={fatsDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({fatsDiff >= 0 ? '+' : ''}{fatsDiff.toFixed(1)}g)
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">{language === 'pt' ? 'Calorias' : 'Calories'}:</span>
                        <p className="font-semibold">
                          {totalCalories.toFixed(0)} kcal
                          <span className={caloriesDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({caloriesDiff >= 0 ? '+' : ''}{caloriesDiff.toFixed(0)})
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={handleSubstitute}
            disabled={!selectedFoodId || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? language === 'pt'
                ? 'Substituindo...'
                : 'Substituting...'
              : language === 'pt'
              ? 'Substituir'
              : 'Substitute'}
          </button>
        </div>
      </div>
    </div>
  );
}
