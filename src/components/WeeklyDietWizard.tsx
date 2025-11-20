import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import type { User, MacroDistribution } from '../types';
import { calculateRecommendedCalories } from '../lib/calories';
import { supabase } from '../lib/supabase';

interface DayConfig {
  dayOfWeek: number;
  dayName: string;
  calories: number;
  macros: MacroDistribution;
}

interface MealConfig {
  name: string;
  enabled: boolean;
}

interface WeeklyDietWizardProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onComplete: () => void;
}

type Step = 'calories' | 'macros' | 'meals' | 'review';

export default function WeeklyDietWizard({ isOpen, onClose, user, onComplete }: WeeklyDietWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('calories');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const baseCalories = calculateRecommendedCalories(
    user.weight,
    user.height,
    user.age,
    user.gender,
    user.activity_level || 'sedentary',
    user.calculation_method || 'harris'
  );

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const [configs, setConfigs] = useState<DayConfig[]>(
    dayNames.map((name, index) => ({
      dayOfWeek: index,
      dayName: name,
      calories: baseCalories,
      macros: {
        protein: Math.round((baseCalories * 0.3) / 4),
        carbs: Math.round((baseCalories * 0.45) / 4),
        fats: Math.round((baseCalories * 0.25) / 9)
      }
    }))
  );

  const [meals, setMeals] = useState<MealConfig[]>([
    { name: 'Café da Manhã', enabled: true },
    { name: 'Lanche da Manhã', enabled: false },
    { name: 'Almoço', enabled: true },
    { name: 'Lanche da Tarde', enabled: false },
    { name: 'Jantar', enabled: true },
    { name: 'Ceia', enabled: false }
  ]);

  const updateDayCalories = (dayOfWeek: number, calories: number) => {
    setConfigs(prev => prev.map(config => {
      if (config.dayOfWeek === dayOfWeek) {
        return {
          ...config,
          calories,
          macros: {
            protein: Math.round((calories * 0.3) / 4),
            carbs: Math.round((calories * 0.45) / 4),
            fats: Math.round((calories * 0.25) / 9)
          }
        };
      }
      return config;
    }));
  };

  const updateDayMacros = (dayOfWeek: number, field: 'protein' | 'carbs' | 'fats', value: number) => {
    setConfigs(prev => prev.map(config => {
      if (config.dayOfWeek === dayOfWeek) {
        return {
          ...config,
          macros: {
            ...config.macros,
            [field]: value
          }
        };
      }
      return config;
    }));
  };

  const toggleMeal = (index: number) => {
    setMeals(prev => prev.map((meal, i) =>
      i === index ? { ...meal, enabled: !meal.enabled } : meal
    ));
  };

  const applyToAllDays = (sourceDay: number) => {
    const source = configs.find(c => c.dayOfWeek === sourceDay);
    if (!source) return;

    setConfigs(prev => prev.map(config => ({
      ...config,
      calories: source.calories,
      macros: { ...source.macros }
    })));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const enabledMeals = meals.filter(m => m.enabled);

      // Create or update diets for each day
      for (const config of configs) {
        // Check if diet already exists
        const { data: existingDiet } = await supabase
          .from('diets')
          .select('id')
          .eq('user_id', user.id)
          .eq('day_of_week', config.dayOfWeek)
          .maybeSingle();

        if (existingDiet) {
          // Update existing diet
          const { error: updateError } = await supabase
            .from('diets')
            .update({ calories: config.calories })
            .eq('id', existingDiet.id);

          if (updateError) throw updateError;

          // Update macros
          const { data: existingMacros } = await supabase
            .from('diet_macros')
            .select('id')
            .eq('diet_id', existingDiet.id)
            .maybeSingle();

          if (existingMacros) {
            await supabase
              .from('diet_macros')
              .update({
                protein: config.macros.protein,
                carbs: config.macros.carbs,
                fats: config.macros.fats
              })
              .eq('id', existingMacros.id);
          } else {
            await supabase
              .from('diet_macros')
              .insert([{
                diet_id: existingDiet.id,
                protein: config.macros.protein,
                carbs: config.macros.carbs,
                fats: config.macros.fats
              }]);
          }

          // Delete existing meals
          await supabase
            .from('meals')
            .delete()
            .eq('diet_id', existingDiet.id);

          // Create new meals
          const mealsToInsert = enabledMeals.map((meal, index) => ({
            diet_id: existingDiet.id,
            name: meal.name,
            order: index
          }));

          await supabase
            .from('meals')
            .insert(mealsToInsert);

        } else {
          // Create new diet
          const { data: newDiet, error: dietError } = await supabase
            .from('diets')
            .insert([{
              user_id: user.id,
              calories: config.calories,
              day_of_week: config.dayOfWeek
            }])
            .select()
            .single();

          if (dietError) throw dietError;

          // Create macros
          await supabase
            .from('diet_macros')
            .insert([{
              diet_id: newDiet.id,
              protein: config.macros.protein,
              carbs: config.macros.carbs,
              fats: config.macros.fats
            }]);

          // Create meals
          const mealsToInsert = enabledMeals.map((meal, index) => ({
            diet_id: newDiet.id,
            name: meal.name,
            order: index
          }));

          await supabase
            .from('meals')
            .insert(mealsToInsert);
        }
      }

      onComplete();
      onClose();
    } catch (err: any) {
      console.error('Error creating weekly diet:', err);
      setError(err.message || 'Erro ao configurar dieta semanal');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'calories', label: 'Calorias', icon: '🔥' },
    { id: 'macros', label: 'Macros', icon: '⚖️' },
    { id: 'meals', label: 'Refeições', icon: '🍽️' },
    { id: 'review', label: 'Revisão', icon: '✓' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id as Step);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id as Step);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(28,28,28)] rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#f8c045]/10">
          <div className="flex items-center">
            <Calendar className="text-[#f8c045] mr-3" size={24} />
            <div>
              <h3 className="text-xl font-semibold text-[#f8c045]">Configurar Dieta Semanal</h3>
              <p className="text-gray-400 text-sm">Usuário: {user.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-[#f8c045]/10">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                    index <= currentStepIndex
                      ? 'bg-[#f8c045] text-[rgb(23,23,23)]'
                      : 'bg-gray-700 text-gray-400'
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Calories */}
          {currentStep === 'calories' && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Ajuste as calorias para cada dia da semana
              </h4>
              <p className="text-gray-400 text-sm mb-6">
                Calorias recomendadas: <span className="text-[#f8c045] font-bold">{baseCalories} kcal</span>
              </p>

              <div className="space-y-3">
                {configs.map((config) => (
                  <div
                    key={config.dayOfWeek}
                    className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-[#f8c045] font-semibold w-24">{config.dayName}</span>
                      <input
                        type="number"
                        value={config.calories}
                        onChange={(e) => updateDayCalories(config.dayOfWeek, Number(e.target.value))}
                        className="w-32 bg-[rgb(28,28,28)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                        min="800"
                        max="5000"
                        step="50"
                      />
                      <span className="text-gray-400 text-sm">kcal</span>
                    </div>
                    <button
                      onClick={() => applyToAllDays(config.dayOfWeek)}
                      className="text-xs bg-[#f8c045]/20 hover:bg-[#f8c045]/30 text-[#f8c045] px-3 py-1 rounded transition"
                    >
                      Aplicar em todos
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Macros */}
          {currentStep === 'macros' && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Ajuste os macronutrientes para cada dia
              </h4>
              <p className="text-gray-400 text-sm mb-6">
                Configure a distribuição de proteínas, carboidratos e gorduras
              </p>

              <div className="space-y-4">
                {configs.map((config) => (
                  <div
                    key={config.dayOfWeek}
                    className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/10"
                  >
                    <h5 className="text-[#f8c045] font-semibold mb-3">{config.dayName} - {config.calories} kcal</h5>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-gray-300 text-sm font-bold mb-2">
                          Proteína (g)
                        </label>
                        <input
                          type="number"
                          value={config.macros.protein}
                          onChange={(e) => updateDayMacros(config.dayOfWeek, 'protein', Number(e.target.value))}
                          className="w-full bg-[rgb(28,28,28)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">{Math.round(config.macros.protein * 4)} kcal</p>
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm font-bold mb-2">
                          Carboidratos (g)
                        </label>
                        <input
                          type="number"
                          value={config.macros.carbs}
                          onChange={(e) => updateDayMacros(config.dayOfWeek, 'carbs', Number(e.target.value))}
                          className="w-full bg-[rgb(28,28,28)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">{Math.round(config.macros.carbs * 4)} kcal</p>
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm font-bold mb-2">
                          Gorduras (g)
                        </label>
                        <input
                          type="number"
                          value={config.macros.fats}
                          onChange={(e) => updateDayMacros(config.dayOfWeek, 'fats', Number(e.target.value))}
                          className="w-full bg-[rgb(28,28,28)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">{Math.round(config.macros.fats * 9)} kcal</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Meals */}
          {currentStep === 'meals' && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Selecione as refeições que deseja incluir
              </h4>
              <p className="text-gray-400 text-sm mb-6">
                As refeições selecionadas serão criadas para todos os dias da semana
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {meals.map((meal, index) => (
                  <div
                    key={index}
                    onClick={() => toggleMeal(index)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      meal.enabled
                        ? 'bg-[#f8c045]/10 border-[#f8c045] text-white'
                        : 'bg-[rgb(23,23,23)] border-gray-700 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{meal.name}</span>
                      {meal.enabled && (
                        <Check size={20} className="text-[#f8c045]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  💡 <strong>Dica:</strong> Selecione as refeições que melhor se adequam à rotina do seu cliente.
                  Você poderá adicionar alimentos depois.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Revise a configuração antes de finalizar
              </h4>

              <div className="space-y-6">
                <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/10">
                  <h5 className="text-[#f8c045] font-semibold mb-3">Refeições Selecionadas</h5>
                  <div className="flex flex-wrap gap-2">
                    {meals.filter(m => m.enabled).map((meal, index) => (
                      <span
                        key={index}
                        className="bg-[#f8c045]/20 text-[#f8c045] px-3 py-1 rounded-full text-sm"
                      >
                        {meal.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/10">
                  <h5 className="text-[#f8c045] font-semibold mb-3">Resumo Semanal</h5>
                  <div className="space-y-2">
                    {configs.map((config) => (
                      <div key={config.dayOfWeek} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300 font-medium">{config.dayName}</span>
                        <div className="text-gray-400">
                          <span className="text-[#f8c045] font-bold">{config.calories} kcal</span>
                          {' • '}
                          P: {config.macros.protein}g
                          {' • '}
                          C: {config.macros.carbs}g
                          {' • '}
                          G: {config.macros.fats}g
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-300 text-sm">
                    ✓ Ao confirmar, as dietas serão criadas para todos os 7 dias da semana com as refeições selecionadas.
                    Você poderá adicionar alimentos e fazer ajustes posteriormente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
              disabled={loading}
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
                  Finalizar e Criar Dietas
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
