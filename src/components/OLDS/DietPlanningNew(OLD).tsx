import React, { useState, useEffect } from 'react';
import { Calculator, Apple, Scale } from 'lucide-react';
import { useTranslation } from '../translations';
import type { User, MacroDistribution } from '../types';
import { ACTIVITY_LEVELS, calculateRecommendedCalories } from '../lib/calories';
import MealCategorySelector from './MealCategorySelector';
import { supabase } from '../lib/supabase';

interface DietPlanningNewProps {
  user: User;
  onSubmit: (calories: number, macros: MacroDistribution) => Promise<void>;
}

export default function DietPlanningNew({ user, onSubmit }: DietPlanningNewProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calorieAdjustment, setCalorieAdjustment] = useState<string>('0');
  const [mealConfigs, setMealConfigs] = useState<Array<{name: string; percentage: number; categories: string[]}>>([]);
  const [calculationMethod, setCalculationMethod] = useState(user.calculation_method || 'harris');
  
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

  // Calculate base values when user data or adjustment changes
  useEffect(() => {
    const calculations = calculateRecommendedCalories({
      weight: user.weight,
      height: user.height,
      age: user.age,
      gender: user.gender,
      activity_level: user.activity_level,
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
        case 'tinsley':
          baseCalories = calculations.tinsley?.tdee || 0;
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
  }, [user, calorieAdjustment, calculationMethod]);

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

  const handleGenerateDiet = async () => {
    if (loading || !mealConfigs.length) return;
    
    try {
      setLoading(true);
      setError('');
      
      await onSubmit(
        calculatedValues.adjustedCalories,
        calculatedValues.macros
      );
    } catch (err) {
      console.error('Error generating diet:', err);
      setError('Erro ao gerar dieta. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Calculation Method */}
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
              <option value="tinsley">Tinsley</option>
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
        <h3 className="text-xl font-semibold text-[#f8c045] mb-4">
          Configurar Refeições
        </h3>
        <MealCategorySelector onConfigChange={setMealConfigs} />
      </div>

      {/* Generate Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleGenerateDiet}
          disabled={loading || !mealConfigs.length}
          className={`bg-[#f8c045] text-[rgb(23,23,23)] px-8 py-3 rounded-lg transition font-semibold ${
            loading || !mealConfigs.length ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e6b041]'
          }`}
        >
          {loading ? 'Gerando Dieta...' : 'Gerar Dieta'}
        </button>
      </div>
    </div>
  );
}