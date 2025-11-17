import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import type { User, MacroDistribution } from '../types';
import { calculateRecommendedCalories } from '../lib/calories';

interface DayConfig {
  dayOfWeek: number;
  dayName: string;
  calories: number;
  macros: MacroDistribution;
}

interface WeeklyDietConfigProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSubmit: (configs: DayConfig[]) => Promise<void>;
}

export default function WeeklyDietConfig({ isOpen, onClose, user, onSubmit }: WeeklyDietConfigProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSubmit(configs);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao configurar dieta semanal');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(28,28,28)] rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.dayOfWeek}
                className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/10"
              >
                <h4 className="text-[#f8c045] font-semibold mb-3">{config.dayName}</h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Calorias (kcal)
                    </label>
                    <input
                      type="number"
                      value={config.calories}
                      onChange={(e) => updateDayCalories(config.dayOfWeek, Number(e.target.value))}
                      className="w-full bg-[rgb(28,28,28)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                      min="0"
                      step="50"
                    />
                  </div>

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
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-3 mt-6 pt-6 border-t border-[#f8c045]/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-700 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-600 transition font-semibold disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Dieta Semanal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
