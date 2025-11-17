import React from 'react';
import type { MacroDistribution } from '../types';

interface MacroDistributionSettingsProps {
  calories: number;
  onMacrosChange: (macros: MacroDistribution) => void;
}

export default function MacroDistributionSettings({ calories, onMacrosChange }: MacroDistributionSettingsProps) {
  const [proteinPercentage, setProteinPercentage] = React.useState(30);
  const [carbsPercentage, setCarbsPercentage] = React.useState(45);
  const [fatsPercentage, setFatsPercentage] = React.useState(25);

  const calculateMacros = (protein: number, carbs: number, fats: number) => {
    return {
      protein: Math.round((calories * (protein / 100)) / 4), // 4 kcal/g for protein
      carbs: Math.round((calories * (carbs / 100)) / 4),    // 4 kcal/g for carbs
      fats: Math.round((calories * (fats / 100)) / 9),      // 9 kcal/g for fats
    };
  };

  const handleProteinChange = (value: number) => {
    const newProtein = Math.min(Math.max(value, 10), 60);
    const remaining = 100 - newProtein;
    const newCarbs = Math.round((remaining * (carbsPercentage / (carbsPercentage + fatsPercentage))) * 10) / 10;
    const newFats = Math.round((remaining * (fatsPercentage / (carbsPercentage + fatsPercentage))) * 10) / 10;
    
    setProteinPercentage(newProtein);
    setCarbsPercentage(newCarbs);
    setFatsPercentage(newFats);
    
    onMacrosChange(calculateMacros(newProtein, newCarbs, newFats));
  };

  const handleCarbsChange = (value: number) => {
    const newCarbs = Math.min(Math.max(value, 10), 70);
    const remaining = 100 - proteinPercentage;
    const newFats = remaining - newCarbs;
    
    if (newFats >= 15 && newFats <= 35) {
      setCarbsPercentage(newCarbs);
      setFatsPercentage(newFats);
      onMacrosChange(calculateMacros(proteinPercentage, newCarbs, newFats));
    }
  };

  const handleFatsChange = (value: number) => {
    const newFats = Math.min(Math.max(value, 15), 35);
    const remaining = 100 - proteinPercentage;
    const newCarbs = remaining - newFats;
    
    if (newCarbs >= 10 && newCarbs <= 70) {
      setFatsPercentage(newFats);
      setCarbsPercentage(newCarbs);
      onMacrosChange(calculateMacros(proteinPercentage, newCarbs, newFats));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-gray-300 font-semibold mb-4">Distribuição de Macronutrientes</h3>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-400">Proteínas ({proteinPercentage}%)</label>
            <span className="text-[#f8c045]">
              {calculateMacros(proteinPercentage, carbsPercentage, fatsPercentage).protein}g
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            value={proteinPercentage}
            onChange={(e) => handleProteinChange(Number(e.target.value))}
            className="w-full h-2 bg-[rgb(23,23,23)] rounded-lg appearance-none cursor-pointer accent-[#f8c045]"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-400">Carboidratos ({carbsPercentage}%)</label>
            <span className="text-[#f8c045]">
              {calculateMacros(proteinPercentage, carbsPercentage, fatsPercentage).carbs}g
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="70"
            value={carbsPercentage}
            onChange={(e) => handleCarbsChange(Number(e.target.value))}
            className="w-full h-2 bg-[rgb(23,23,23)] rounded-lg appearance-none cursor-pointer accent-[#f8c045]"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-400">Gorduras ({fatsPercentage}%)</label>
            <span className="text-[#f8c045]">
              {calculateMacros(proteinPercentage, carbsPercentage, fatsPercentage).fats}g
            </span>
          </div>
          <input
            type="range"
            min="15"
            max="35"
            value={fatsPercentage}
            onChange={(e) => handleFatsChange(Number(e.target.value))}
            className="w-full h-2 bg-[rgb(23,23,23)] rounded-lg appearance-none cursor-pointer accent-[#f8c045]"
          />
        </div>
      </div>

      <div className="mt-4 p-4 bg-[rgb(23,23,23)] rounded-lg border border-[#f8c045]/20">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total</span>
          <span className="text-[#f8c045]">{proteinPercentage + carbsPercentage + fatsPercentage}%</span>
        </div>
      </div>
    </div>
  );
}