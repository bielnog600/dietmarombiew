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
        .neq('id', currentFood.id)
        .order('name');

      if (error) {
        console.error('Error fetching foods:', error);
        throw error;
      }

      if (!allFoods || allFoods.length === 0) {
        console.log('No foods found in database');
        setSimilarFoods([]);
        setLoading(false);
        return;
      }

      const currentProtein = currentFood.protein * currentFood.quantity;
      const currentCarbs = currentFood.carbs * currentFood.quantity;
      const currentFats = currentFood.fats * currentFood.quantity;
      const currentCalories = currentFood.calories * currentFood.quantity;

      console.log('Current food totals:', { currentProtein, currentCarbs, currentFats, currentCalories });
      console.log('Total foods to analyze:', allFoods?.length || 0);

      const scored = allFoods.map(food => {
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

        const proteinMatch = Math.abs(food.protein * bestQuantity - currentProtein) / (currentProtein || 1);
        const carbsMatch = Math.abs(food.carbs * bestQuantity - currentCarbs) / (currentCarbs || 1);
        const fatsMatch = Math.abs(food.fats * bestQuantity - currentFats) / (currentFats || 1);

        const totalError = proteinMatch + carbsMatch + fatsMatch;

        return {
          ...food,
          score: bestScore,
          quantity: bestQuantity,
          proteinMatch,
          carbsMatch,
          fatsMatch,
          totalError
        };
      });

      scored.sort((a, b) => a.totalError - b.totalError);

      const withPositiveSimilarity = scored.filter(f => {
        const similarity = 100 - (f.totalError * 100);
        return similarity > 0;
      });

      console.log('Top 5 foods by similarity:');
      withPositiveSimilarity.slice(0, 5).forEach((food: any, i) => {
        const similarity = 100 - (food.totalError * 100);
        console.log(`${i + 1}. ${food.name}:`, {
          quantity: food.quantity.toFixed(2),
          similarity: similarity.toFixed(1) + '%',
          proteinMatch: (food.proteinMatch * 100).toFixed(1) + '%',
          carbsMatch: (food.carbsMatch * 100).toFixed(1) + '%',
          fatsMatch: (food.fatsMatch * 100).toFixed(1) + '%'
        });
      });

      const filtered = withPositiveSimilarity.slice(0, 20);

      console.log('Showing', filtered.length, 'similar foods with positive similarity');

      setSimilarFoods(filtered);
    } catch (error) {
      console.error('Error loading similar foods:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubstitute() {
    if (!selectedFoodId || !mealId) {
      console.error('Missing selectedFoodId or mealId', { selectedFoodId, mealId });
      alert(language === 'pt' ? 'Erro: informações faltando' : 'Error: missing information');
      return;
    }

    setLoading(true);
    try {
      const selectedFood = similarFoods.find(f => f.id === selectedFoodId);
      if (!selectedFood) {
        console.error('Selected food not found');
        return;
      }

      console.log('Deleting old food:', { mealId, foodId: currentFood.id });
      const { error: deleteError } = await supabase
        .from('meal_foods')
        .delete()
        .eq('meal_id', mealId)
        .eq('food_id', currentFood.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      console.log('Inserting new food:', { mealId, foodId: selectedFood.id, quantity: (selectedFood as any).quantity });
      const { error: insertError } = await supabase
        .from('meal_foods')
        .insert({
          meal_id: mealId,
          food_id: selectedFood.id,
          quantity: (selectedFood as any).quantity
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

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
      <div className="bg-[rgb(28,28,28)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#f8c045]/10 flex justify-between items-center sticky top-0 bg-[rgb(28,28,28)]">
          <div>
            <h2 className="text-2xl font-bold text-[#f8c045]">
              {language === 'pt' ? 'Substituir Alimento' : 'Substitute Food'}
            </h2>
            <p className="text-gray-400 mt-1">
              {language === 'pt' ? 'Alimentos similares a ' : 'Foods similar to '}
              <span className="font-semibold">{currentFood.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#f8c045]">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-[rgb(23,23,23)] border border-[#f8c045]/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-[#f8c045] mb-2">
              {language === 'pt' ? 'Alimento Atual' : 'Current Food'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-gray-400">{language === 'pt' ? 'Nome' : 'Name'}:</span>
                <p className="font-semibold text-white">{currentFood.name}</p>
              </div>
              <div>
                <span className="text-gray-400">{language === 'pt' ? 'Proteína' : 'Protein'}:</span>
                <p className="font-semibold text-white">{currentTotalProtein.toFixed(1)}g</p>
              </div>
              <div>
                <span className="text-gray-400">{language === 'pt' ? 'Carboidratos' : 'Carbs'}:</span>
                <p className="font-semibold text-white">{currentTotalCarbs.toFixed(1)}g</p>
              </div>
              <div>
                <span className="text-gray-400">{language === 'pt' ? 'Gorduras' : 'Fats'}:</span>
                <p className="font-semibold text-white">{currentTotalFats.toFixed(1)}g</p>
              </div>
              <div>
                <span className="text-gray-400">{language === 'pt' ? 'Calorias' : 'Calories'}:</span>
                <p className="font-semibold text-white">{currentTotalCalories.toFixed(0)} kcal</p>
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
              <h3 className="font-semibold text-[#f8c045] mb-3">
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
                        ? 'border-[#f8c045] bg-[rgb(23,23,23)]'
                        : 'border-[#f8c045]/20 hover:border-[#f8c045]/50 hover:bg-[rgb(23,23,23)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{food.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span>{language === 'pt' ? 'Quantidade' : 'Quantity'}: {(food as any).quantity.toFixed(2)}</span>
                          <span className="text-[#f8c045]">
                            {language === 'pt' ? 'Similaridade' : 'Similarity'}: {(100 - (food as any).totalError * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#f8c045]" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">{language === 'pt' ? 'Proteína' : 'Protein'}:</span>
                        <p className="font-semibold">
                          {totalProtein.toFixed(1)}g
                          <span className={proteinDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({proteinDiff >= 0 ? '+' : ''}{proteinDiff.toFixed(1)}g)
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">{language === 'pt' ? 'Carboidratos' : 'Carbs'}:</span>
                        <p className="font-semibold">
                          {totalCarbs.toFixed(1)}g
                          <span className={carbsDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({carbsDiff >= 0 ? '+' : ''}{carbsDiff.toFixed(1)}g)
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">{language === 'pt' ? 'Gorduras' : 'Fats'}:</span>
                        <p className="font-semibold">
                          {totalFats.toFixed(1)}g
                          <span className={fatsDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({fatsDiff >= 0 ? '+' : ''}{fatsDiff.toFixed(1)}g)
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">{language === 'pt' ? 'Calorias' : 'Calories'}:</span>
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

        <div className="p-6 border-t border-[#f8c045]/10 flex justify-end gap-3 sticky bottom-0 bg-[rgb(28,28,28)]">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-[#f8c045]/20 rounded-lg text-gray-400 hover:bg-[rgb(23,23,23)]"
          >
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={handleSubstitute}
            disabled={!selectedFoodId || loading}
            className="px-6 py-2 bg-[#f8c045] text-black rounded-lg hover:bg-[#e6b041] disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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
