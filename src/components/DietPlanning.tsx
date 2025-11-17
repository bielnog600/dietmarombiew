import React, { useState, useEffect } from 'react';
import { Calculator, Apple, Scale, Activity } from 'lucide-react';
import { useTranslation } from '../translations';
import type { User, MacroDistribution, FoodCategory } from '../types';
import { ACTIVITY_LEVELS, calculateRecommendedCalories } from '../lib/calories';
import { supabase } from '../lib/supabase';
import { generateDiet } from '../lib/diet';

interface DietPlanningProps {
  user: User;
  onSubmit: (calories: number, macros: MacroDistribution, dayOfWeek?: number) => Promise<void>;
  dayOfWeek?: number;
}

interface MealConfig {
  name: string;
  enabled: boolean;
  categories: string[];
  percentage: number;
}

export default function DietPlanning({ user, onSubmit, dayOfWeek }: DietPlanningProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calorieAdjustment, setCalorieAdjustment] = useState<string>('0');
  const [calculationMethod, setCalculationMethod] = useState(user.calculation_method || 'harris');
  const [activityLevel, setActivityLevel] = useState(user.activity_level || 'sedentary');
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [mealConfigs, setMealConfigs] = useState<MealConfig[]>([]);
  const [initialCategoriesSet, setInitialCategoriesSet] = useState(false);
  
  // Calculated values
  const [calculatedValues, setCalculatedValues] = useState<{
    baseCalories: number;
    adjustedCalories: number;
    macros: MacroDistribution;
  }>({
    baseCalories: 0,
    adjustedCalories: 0,
    macros: {
      protein: 0,
      carbs: 0,
      fats: 0
    }
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('food_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);

      console.log('fetchCategories - data:', data?.length, 'initialCategoriesSet:', initialCategoriesSet);

      if (data && !initialCategoriesSet) {
        console.log('Setting up meal configs...');
        console.log('All categories:', data.map(c => ({ id: c.id, name: c.name })));

        const getCategoryIdsByNames = (names: string[]) => {
          const found = data
            .filter(cat => names.some(name => cat.name.toLowerCase().includes(name.toLowerCase())))
            .map(cat => cat.id);
          console.log(`Looking for categories with names:`, names, 'Found:', found);
          return found;
        };

        const allCategories = data.map(c => c.id);

        setMealConfigs([
          {
            name: 'Café da Manhã',
            enabled: true,
            categories: allCategories,
            percentage: 0.25
          },
          {
            name: 'Pré-treino',
            enabled: false,
            categories: allCategories,
            percentage: 0.15
          },
          {
            name: 'Pós-treino',
            enabled: false,
            categories: allCategories,
            percentage: 0.15
          },
          {
            name: 'Almoço',
            enabled: true,
            categories: allCategories,
            percentage: 0.35
          },
          {
            name: 'Lanche',
            enabled: true,
            categories: allCategories,
            percentage: 0.15
          },
          {
            name: 'Jantar',
            enabled: true,
            categories: allCategories,
            percentage: 0.25
          }
        ]);
        setInitialCategoriesSet(true);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Erro ao carregar categorias de alimentos');
    }
  };

  // Calculate base values when user data or adjustment changes
  useEffect(() => {
    const calculations = calculateRecommendedCalories({
      weight: user.weight,
      height: user.height,
      age: user.age,
      gender: user.gender,
      activity_level: activityLevel,
      lean_mass: user.lean_mass
    });

    if (calculations) {
      let baseCalories = 0;

      // Use the selected calculation method
      switch (calculationMethod) {
        case 'harris':
          baseCalories = calculations.harrisBenedict?.tdee || 0;
          break;
        case 'mifflin':
          baseCalories = calculations.mifflinStJeor?.tdee || 0;
          break;
        case 'cunningham':
          baseCalories = calculations.cunningham?.tdee || 0;
          break;
      }

      if (baseCalories > 0) {
        // Apply caloric adjustment
        const adjustmentPercent = parseFloat(calorieAdjustment) / 100;
        const adjustedCalories = Math.round(baseCalories * (1 + adjustmentPercent));
        
        // Calculate macros based on adjusted calories
        const macros: MacroDistribution = {
          protein: Math.round(adjustedCalories * 0.3 / 4), // 30% from protein
          carbs: Math.round(adjustedCalories * 0.45 / 4),  // 45% from carbs
          fats: Math.round(adjustedCalories * 0.25 / 9)    // 25% from fats
        };

        setCalculatedValues({
          baseCalories,
          adjustedCalories,
          macros
        });
      }
    }
  }, [user, calorieAdjustment, calculationMethod, activityLevel]);

  const handleMethodChange = async (method: string) => {
    try {
      setCalculationMethod(method);
      
      // Update user's calculation method in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ calculation_method: method })
        .eq('id', user.id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error updating calculation method:', err);
      setError('Erro ao atualizar método de cálculo');
    }
  };

  const handleActivityLevelChange = async (level: string) => {
    try {
      setActivityLevel(level);
      
      // Update user's activity level in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ activity_level: level })
        .eq('id', user.id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error updating activity level:', err);
      setError('Erro ao atualizar nível de atividade');
    }
  };

  const handleMealToggle = (mealName: string) => {
    setMealConfigs(prev => prev.map(meal => 
      meal.name === mealName 
        ? { ...meal, enabled: !meal.enabled }
        : meal
    ));
  };

  const handleCategoryToggle = (mealName: string, categoryId: string) => {
    setMealConfigs(prev => prev.map(meal => {
      if (meal.name === mealName) {
        const categories = meal.categories.includes(categoryId)
          ? meal.categories.filter(id => id !== categoryId)
          : [...meal.categories, categoryId];
        return { ...meal, categories };
      }
      return meal;
    }));
  };

  const handleGenerateDiet = async () => {
    const enabledMeals = mealConfigs.filter(meal => meal.enabled);
    if (loading || enabledMeals.length === 0) return;
    
    try {
      setLoading(true);
      setError('');

      // Generate diet plan with foods
      const dietPlan = await generateDiet(
        calculatedValues.adjustedCalories,
        calculatedValues.macros,
        enabledMeals
      );

      // Create new diet
      const { data: dietData, error: dietError } = await supabase
        .from('diets')
        .insert([{
          user_id: user.id,
          calories: calculatedValues.adjustedCalories,
          day_of_week: dayOfWeek
        }])
        .select()
        .single();

      if (dietError) throw dietError;

      // Store diet macros
      const { error: macrosError } = await supabase
        .from('diet_macros')
        .insert([{
          diet_id: dietData.id,
          protein: calculatedValues.macros.protein,
          carbs: calculatedValues.macros.carbs,
          fats: calculatedValues.macros.fats
        }]);

      if (macrosError) throw macrosError;

      // Create meals and add foods
      let foodIndex = 0;
      for (const meal of enabledMeals) {
        // Create meal
        const { data: mealData, error: mealError } = await supabase
          .from('meals')
          .insert([{
            diet_id: dietData.id,
            name: meal.name
          }])
          .select()
          .single();

        if (mealError) throw mealError;

        // Get foods for this meal from the diet plan
        const startIndex = Math.floor(foodIndex);
        const endIndex = Math.floor(foodIndex + (dietPlan.length / enabledMeals.length));
        const mealFoods = dietPlan.slice(startIndex, endIndex);
        foodIndex = endIndex;

        // Add foods to meal
        if (mealFoods.length > 0) {
          const { error: foodsError } = await supabase
            .from('meal_foods')
            .insert(
              mealFoods.map(food => ({
                meal_id: mealData.id,
                food_id: food.id,
                quantity: food.portion_size / 100 // Convert portion size to quantity multiplier
              }))
            );

          if (foodsError) throw foodsError;
        }
      }

      // Call onSubmit with the calculated values
      await onSubmit(
        calculatedValues.adjustedCalories,
        calculatedValues.macros,
        dayOfWeek
      );
    } catch (err) {
      console.error('Error generating diet:', err);
      setError('Erro ao gerar dieta. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getEnabledMealsCount = () => mealConfigs.filter(meal => meal.enabled).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Calculation Method and Activity Level */}
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/10">
        <div className="flex items-center mb-4">
          <Calculator className="text-[#f8c045] mr-2" />
          <h3 className="text-xl font-semibold text-[#f8c045]">
            Método de Cálculo
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Selecione o Método
            </label>
            <select
              value={calculationMethod}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="w-full bg-[rgb(23,23,23)] text-gray-300 p-3 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
            >
              <option value="harris">Harris-Benedict</option>
              <option value="mifflin">Mifflin-St Jeor</option>
              <option value="cunningham">Cunningham</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Nível de Atividade
            </label>
            <select
              value={activityLevel}
              onChange={(e) => handleActivityLevelChange(e.target.value)}
              className="w-full bg-[rgb(23,23,23)] text-gray-300 p-3 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
            >
              {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                <option key={key} value={key}>
                  {level.label} - {level.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Ajuste Calórico
            </label>
            <select
              value={calorieAdjustment}
              onChange={(e) => setCalorieAdjustment(e.target.value)}
              className="w-full bg-[rgb(23,23,23)] text-gray-300 p-3 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
            >
              <optgroup label="Manutenção">
                <option value="0">Manutenção (0%)</option>
              </optgroup>
              <optgroup label="Déficit Calórico">
                <option value="-5">Déficit Leve (-5%)</option>
                <option value="-10">Déficit Moderado (-10%)</option>
                <option value="-15">Déficit Médio (-15%)</option>
                <option value="-20">Déficit Alto (-20%)</option>
                <option value="-25">Déficit Muito Alto (-25%)</option>
                <option value="-30">Déficit Extremo (-30%)</option>
              </optgroup>
              <optgroup label="Superávit Calórico">
                <option value="5">Superávit Leve (+5%)</option>
                <option value="10">Superávit Moderado (+10%)</option>
                <option value="15">Superávit Médio (+15%)</option>
                <option value="20">Superávit Alto (+20%)</option>
                <option value="25">Superávit Muito Alto (+25%)</option>
                <option value="30">Superávit Extremo (+30%)</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Calories and Macros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/10">
          <div className="flex items-center mb-4">
            <Scale className="text-[#f8c045] mr-2" />
            <h3 className="text-xl font-semibold text-[#f8c045]">
              Calorias
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Base (TDEE)</p>
              <p className="text-2xl font-bold text-[#f8c045]">
                {calculatedValues.baseCalories} kcal
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">
                {calorieAdjustment === '0' 
                  ? 'Manutenção'
                  : parseFloat(calorieAdjustment) > 0 
                    ? `Com Superávit (+${calorieAdjustment}%)`
                    : `Com Déficit (${calorieAdjustment}%)`
                }
              </p>
              <p className="text-2xl font-bold text-[#f8c045]">
                {calculatedValues.adjustedCalories} kcal
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/10">
          <div className="flex items-center mb-4">
            <Apple className="text-[#f8c045] mr-2" />
            <h3 className="text-xl font-semibold text-[#f8c045]">
              Macronutrientes
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">
                Proteínas (30%)
              </p>
              <p className="text-2xl font-bold text-[#f8c045]">
                {calculatedValues.macros.protein}g
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">
                Carboidratos (45%)
              </p>
              <p className="text-2xl font-bold text-[#f8c045]">
                {calculatedValues.macros.carbs}g
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">
                Gorduras (25%)
              </p>
              <p className="text-2xl font-bold text-[#f8c045]">
                {calculatedValues.macros.fats}g
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Configuration */}
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/10">
        <h3 className="text-xl font-semibold text-[#f8c045] mb-6">
          Configuração das Refeições
        </h3>
        
        <div className="space-y-6">
          {mealConfigs.map((meal) => (
            <div key={meal.name} className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={meal.enabled}
                    onChange={() => handleMealToggle(meal.name)}
                    className="form-checkbox h-5 w-5 text-[#f8c045] rounded border-[#f8c045]/20 bg-[rgb(28,28,28)]"
                  />
                  <span className="text-lg font-medium text-[#f8c045]">{meal.name}</span>
                </label>
                <span className="text-gray-400 text-sm">
                  {Math.round(meal.percentage * 100)}% das calorias
                </span>
              </div>

              {meal.enabled && (
                <div className="mt-4 pl-8">
                  <p className="text-gray-400 mb-2">Selecione as categorias de alimentos:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-[#f8c045]/5"
                      >
                        <input
                          type="checkbox"
                          checked={meal.categories.includes(category.id)}
                          onChange={() => handleCategoryToggle(meal.name, category.id)}
                          className="form-checkbox h-4 w-4 text-[#f8c045] rounded border-[#f8c045]/20 bg-[rgb(28,28,28)]"
                        />
                        <span className="text-gray-300 text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleGenerateDiet}
          disabled={loading || getEnabledMealsCount() === 0}
          className={`bg-[#f8c045] text-[rgb(23,23,23)] px-8 py-3 rounded-lg transition font-semibold ${
            loading || getEnabledMealsCount() === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e6b041]'
          }`}
        >
          {loading ? 'Gerando Dieta...' : 'Gerar Dieta'}
        </button>
      </div>
    </div>
  );
}