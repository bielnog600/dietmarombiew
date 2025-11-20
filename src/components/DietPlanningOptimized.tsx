import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Calculator } from 'lucide-react';
import type { User, MacroDistribution, FoodCategory } from '../types';
import { ACTIVITY_LEVELS, calculateRecommendedCalories } from '../lib/calories';
import { supabase } from '../lib/supabase';
import { generateDiet } from '../lib/diet';

interface DietPlanningOptimizedProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onComplete: () => void;
  dayOfWeek?: number;
}

interface MealConfig {
  name: string;
  enabled: boolean;
  categories: string[];
  percentage: number;
}

interface DayCalories {
  dayOfWeek: number;
  dayName: string;
  calories: number;
}

type Step = 'calculation' | 'calories' | 'meals';

export default function DietPlanningOptimized({ isOpen, onClose, user, onComplete, dayOfWeek }: DietPlanningOptimizedProps) {
  const [currentStep, setCurrentStep] = useState<Step>('calculation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [calorieAdjustment, setCalorieAdjustment] = useState<string>('0');
  const [calculationMethod, setCalculationMethod] = useState(user.calculation_method || 'harris');
  const [activityLevel, setActivityLevel] = useState(user.activity_level || 'sedentary');

  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [mealConfigs, setMealConfigs] = useState<MealConfig[]>([]);

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const [applyToAllDays, setApplyToAllDays] = useState(true);
  const [daysCalories, setDaysCalories] = useState<DayCalories[]>([]);

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
    if (isOpen) {
      fetchCategories();
      calculateValues();
    }
  }, [isOpen]);

  useEffect(() => {
    calculateValues();
  }, [user, calorieAdjustment, calculationMethod, activityLevel]);

  const calculateValues = () => {
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
        const adjustmentPercent = parseFloat(calorieAdjustment) / 100;
        const adjustedCalories = Math.round(baseCalories * (1 + adjustmentPercent));

        const macros: MacroDistribution = {
          protein: Math.round(adjustedCalories * 0.3 / 4),
          carbs: Math.round(adjustedCalories * 0.45 / 4),
          fats: Math.round(adjustedCalories * 0.25 / 9)
        };

        setCalculatedValues({
          baseCalories,
          adjustedCalories,
          macros
        });

        if (daysCalories.length === 0) {
          setDaysCalories(
            dayNames.map((name, index) => ({
              dayOfWeek: index,
              dayName: name,
              calories: adjustedCalories
            }))
          );
        }
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('food_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);

      if (data && mealConfigs.length === 0) {
        const allCategories = data.map(c => c.id);

        setMealConfigs([
          { name: 'Café da Manhã', enabled: true, categories: allCategories, percentage: 25 },
          { name: 'Pré-treino', enabled: false, categories: allCategories, percentage: 15 },
          { name: 'Pós-treino', enabled: false, categories: allCategories, percentage: 15 },
          { name: 'Almoço', enabled: true, categories: allCategories, percentage: 35 },
          { name: 'Lanche', enabled: true, categories: allCategories, percentage: 15 },
          { name: 'Jantar', enabled: true, categories: allCategories, percentage: 25 }
        ]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Erro ao carregar categorias de alimentos');
    }
  };

  const handleMethodChange = async (method: string) => {
    setCalculationMethod(method);
    await supabase.from('users').update({ calculation_method: method }).eq('id', user.id);
  };

  const handleActivityLevelChange = async (level: string) => {
    setActivityLevel(level);
    await supabase.from('users').update({ activity_level: level }).eq('id', user.id);
  };

  const updateDayCalories = (dayOfWeek: number, calories: number) => {
    setDaysCalories(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek ? { ...day, calories } : day
    ));
  };

  const applyCaloriesToAll = () => {
    const firstDayCalories = daysCalories[0]?.calories || calculatedValues.adjustedCalories;
    setDaysCalories(prev => prev.map(day => ({ ...day, calories: firstDayCalories })));
  };

  const toggleMeal = (index: number) => {
    setMealConfigs(prev => prev.map((meal, i) =>
      i === index ? { ...meal, enabled: !meal.enabled } : meal
    ));
  };

  const toggleCategory = (mealIndex: number, categoryId: string) => {
    setMealConfigs(prev => prev.map((meal, i) => {
      if (i === mealIndex) {
        const hasCategory = meal.categories.includes(categoryId);
        return {
          ...meal,
          categories: hasCategory
            ? meal.categories.filter(id => id !== categoryId)
            : [...meal.categories, categoryId]
        };
      }
      return meal;
    }));
  };

  const updateMealPercentage = (index: number, percentage: number) => {
    setMealConfigs(prev => prev.map((meal, i) =>
      i === index ? { ...meal, percentage } : meal
    ));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const enabledMeals = mealConfigs.filter(m => m.enabled);
      const daysToCreate = applyToAllDays ? daysCalories : daysCalories.filter(d => d.dayOfWeek === (dayOfWeek ?? new Date().getDay()));

      for (const dayData of daysToCreate) {
        const macros: MacroDistribution = {
          protein: Math.round(dayData.calories * 0.3 / 4),
          carbs: Math.round(dayData.calories * 0.45 / 4),
          fats: Math.round(dayData.calories * 0.25 / 9)
        };

        const { data: existingDiet } = await supabase
          .from('diets')
          .select('id')
          .eq('user_id', user.id)
          .eq('day_of_week', dayData.dayOfWeek)
          .maybeSingle();

        if (existingDiet) {
          await supabase.from('diets').update({ calories: dayData.calories }).eq('id', existingDiet.id);

          const { data: existingMacros } = await supabase
            .from('diet_macros')
            .select('id')
            .eq('diet_id', existingDiet.id)
            .maybeSingle();

          if (existingMacros) {
            await supabase.from('diet_macros').update(macros).eq('id', existingMacros.id);
          } else {
            await supabase.from('diet_macros').insert([{ diet_id: existingDiet.id, ...macros }]);
          }

          await supabase.from('meals').delete().eq('diet_id', existingDiet.id);

          const mealsToInsert = enabledMeals.map((meal, index) => ({
            diet_id: existingDiet.id,
            name: meal.name,
            order: index
          }));

          const { data: insertedMeals } = await supabase.from('meals').insert(mealsToInsert).select();

          if (insertedMeals) {
            for (let i = 0; i < insertedMeals.length; i++) {
              const meal = insertedMeals[i];
              const config = enabledMeals[i];

              const mealCalories = Math.round(dayData.calories * (config.percentage / 100));
              const mealMacros: MacroDistribution = {
                protein: Math.round(mealCalories * 0.3 / 4),
                carbs: Math.round(mealCalories * 0.45 / 4),
                fats: Math.round(mealCalories * 0.25 / 9)
              };

              await generateDiet(meal.id, mealCalories, mealMacros, config.categories);
            }
          }
        } else {
          const { data: newDiet } = await supabase
            .from('diets')
            .insert([{ user_id: user.id, calories: dayData.calories, day_of_week: dayData.dayOfWeek }])
            .select()
            .single();

          if (newDiet) {
            await supabase.from('diet_macros').insert([{ diet_id: newDiet.id, ...macros }]);

            const mealsToInsert = enabledMeals.map((meal, index) => ({
              diet_id: newDiet.id,
              name: meal.name,
              order: index
            }));

            const { data: insertedMeals } = await supabase.from('meals').insert(mealsToInsert).select();

            if (insertedMeals) {
              for (let i = 0; i < insertedMeals.length; i++) {
                const meal = insertedMeals[i];
                const config = enabledMeals[i];

                const mealCalories = Math.round(dayData.calories * (config.percentage / 100));
                const mealMacros: MacroDistribution = {
                  protein: Math.round(mealCalories * 0.3 / 4),
                  carbs: Math.round(mealCalories * 0.45 / 4),
                  fats: Math.round(mealCalories * 0.25 / 9)
                };

                await generateDiet(meal.id, mealCalories, mealMacros, config.categories);
              }
            }
          }
        }
      }

      onComplete();
      onClose();
    } catch (err: any) {
      console.error('Error creating diet:', err);
      setError(err.message || 'Erro ao criar dieta');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'calculation', label: 'Cálculo', icon: '🧮' },
    { id: 'calories', label: 'Calorias', icon: '🔥' },
    { id: 'meals', label: 'Refeições', icon: '🍽️' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id as Step);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id as Step);
    }
  };

  if (!isOpen) return null;

  const totalPercentage = mealConfigs.filter(m => m.enabled).reduce((sum, m) => sum + m.percentage, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(28,28,28)] rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-[#f8c045]/10">
          <div className="flex items-center">
            <Calculator className="text-[#f8c045] mr-3" size={24} />
            <div>
              <h3 className="text-xl font-semibold text-[#f8c045]">Planejar Dieta</h3>
              <p className="text-gray-400 text-sm">Usuário: {user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300 transition">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-[#f8c045]/10">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                    index <= currentStepIndex ? 'bg-[#f8c045] text-[rgb(23,23,23)]' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    index <= currentStepIndex ? 'text-[#f8c045]' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded transition-all ${
                    index < currentStepIndex ? 'bg-[#f8c045]' : 'bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {currentStep === 'calculation' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Método de Cálculo</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['harris', 'mifflin', 'cunningham'].map((method) => (
                    <button
                      key={method}
                      onClick={() => handleMethodChange(method)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        calculationMethod === method
                          ? 'bg-[#f8c045]/10 border-[#f8c045] text-white'
                          : 'bg-[rgb(23,23,23)] border-gray-700 text-gray-400'
                      }`}
                    >
                      <div className="font-semibold capitalize">{method === 'harris' ? 'Harris-Benedict' : method === 'mifflin' ? 'Mifflin-St Jeor' : 'Cunningham'}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Nível de Atividade</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(ACTIVITY_LEVELS).map(([key, data]) => (
                    <button
                      key={key}
                      onClick={() => handleActivityLevelChange(key)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        activityLevel === key
                          ? 'bg-[#f8c045]/10 border-[#f8c045] text-white'
                          : 'bg-[rgb(23,23,23)] border-gray-700 text-gray-400'
                      }`}
                    >
                      <div className="font-semibold">{data.label}</div>
                      <div className="text-xs mt-1 opacity-80">{data.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Ajuste Calórico</h4>
                <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/10">
                  <div className="flex items-center gap-4 mb-3">
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="5"
                      value={calorieAdjustment}
                      onChange={(e) => setCalorieAdjustment(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-[#f8c045] font-bold w-20 text-right">{calorieAdjustment}%</span>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">Calorias Base: <span className="text-white font-semibold">{calculatedValues.baseCalories} kcal</span></div>
                    <div className="text-[#f8c045] text-xl font-bold mt-2">{calculatedValues.adjustedCalories} kcal</div>
                    <div className="text-gray-500 text-xs mt-1">P: {calculatedValues.macros.protein}g | C: {calculatedValues.macros.carbs}g | G: {calculatedValues.macros.fats}g</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'calories' && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Ajuste as calorias por dia (opcional)</h4>
              <p className="text-gray-400 text-sm mb-6">
                Calorias calculadas: <span className="text-[#f8c045] font-bold">{calculatedValues.adjustedCalories} kcal</span>
              </p>

              <div className="mb-4">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToAllDays}
                    onChange={(e) => setApplyToAllDays(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-[#f8c045] focus:ring-[#f8c045] bg-[rgb(23,23,23)]"
                  />
                  <span className="text-sm">Aplicar mesmas calorias em todos os dias</span>
                </label>
              </div>

              {applyToAllDays ? (
                <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/10">
                  <div className="flex items-center gap-4">
                    <span className="text-white font-semibold flex-1">Todos os dias</span>
                    <input
                      type="number"
                      value={daysCalories[0]?.calories || calculatedValues.adjustedCalories}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDaysCalories(prev => prev.map(day => ({ ...day, calories: val })));
                      }}
                      className="w-32 bg-[rgb(28,28,28)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                      min="800"
                      max="5000"
                      step="50"
                    />
                    <span className="text-gray-400 text-sm">kcal</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {daysCalories.map((day) => (
                    <div key={day.dayOfWeek} className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/10 flex items-center justify-between">
                      <span className="text-[#f8c045] font-semibold w-24">{day.dayName}</span>
                      <input
                        type="number"
                        value={day.calories}
                        onChange={(e) => updateDayCalories(day.dayOfWeek, Number(e.target.value))}
                        className="w-32 bg-[rgb(28,28,28)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                        min="800"
                        max="5000"
                        step="50"
                      />
                      <span className="text-gray-400 text-sm">kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 'meals' && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Configuração das Refeições</h4>
              <p className="text-gray-400 text-sm mb-6">
                Selecione as refeições e categorias de alimentos. Total: <span className={`font-bold ${totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}`}>{totalPercentage}%</span> {totalPercentage !== 100 && '(deve somar 100%)'}
              </p>

              <div className="space-y-4">
                {mealConfigs.map((meal, index) => (
                  <div key={index} className={`border-2 rounded-lg transition-all ${
                    meal.enabled ? 'bg-[rgb(23,23,23)] border-[#f8c045]/30' : 'bg-gray-800/50 border-gray-700'
                  }`}>
                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleMeal(index)}>
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={meal.enabled}
                          onChange={() => toggleMeal(index)}
                          className="w-5 h-5 rounded border-gray-500 text-[#f8c045] focus:ring-[#f8c045] bg-[rgb(23,23,23)]"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`font-semibold ${meal.enabled ? 'text-white' : 'text-gray-500'}`}>{meal.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={meal.percentage}
                          onChange={(e) => updateMealPercentage(index, Number(e.target.value))}
                          disabled={!meal.enabled}
                          className="w-16 bg-[rgb(28,28,28)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 disabled:opacity-50"
                          min="0"
                          max="100"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={meal.enabled ? 'text-gray-400' : 'text-gray-600'}>% das calorias</span>
                      </div>
                    </div>

                    {meal.enabled && (
                      <div className="px-4 pb-4 border-t border-[#f8c045]/10 pt-3">
                        <p className="text-sm text-gray-400 mb-3">Selecione as categorias de alimentos:</p>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => toggleCategory(index, category.id)}
                              className={`px-3 py-1 rounded-full text-sm transition-all ${
                                meal.categories.includes(category.id)
                                  ? 'bg-[#f8c045] text-[rgb(23,23,23)] font-semibold'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {totalPercentage !== 100 && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">
                    ⚠️ A soma das porcentagens deve ser 100%. Ajuste os valores para continuar.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-[#f8c045]/10">
          <button
            onClick={currentStepIndex > 0 ? goBack : onClose}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-700 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-600 transition font-semibold disabled:opacity-50"
          >
            {currentStepIndex > 0 ? (
              <>
                <ChevronLeft size={20} />
                Voltar
              </>
            ) : (
              'Cancelar'
            )}
          </button>

          {currentStepIndex < steps.length - 1 ? (
            <button
              onClick={goNext}
              disabled={loading}
              className="flex items-center gap-2 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold disabled:opacity-50"
            >
              Próximo
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || totalPercentage !== 100}
              className="flex items-center gap-2 bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Finalizar e Criar Dieta
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
