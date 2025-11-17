import React, { useState } from 'react';
import { useTranslation } from '../translations';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MacroDistribution } from '../types';

interface CarbCyclingSelectorProps {
  value: 'high' | 'moderate' | 'low' | null;
  onChange: (type: 'high' | 'moderate' | 'low', macros: MacroDistribution) => void;
  calories: number;
}

// Macro distribution constants for carb cycling
const CARB_DAY_MACROS = {
  high: {
    protein: 0.20,  // 20%
    carbs: 0.65,    // 65%
    fats: 0.15      // 15%
  },
  moderate: {
    protein: 0.40,  // 40%
    carbs: 0.35,    // 35%
    fats: 0.25      // 25%
  },
  low: {
    protein: 0.60,  // 60%
    carbs: 0.125,   // 12.5%
    fats: 0.275     // 27.5%
  }
};

export default function CarbCyclingSelector({ value, onChange, calories }: CarbCyclingSelectorProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeLabel = (type: 'high' | 'moderate' | 'low' | null) => {
    switch (type) {
      case 'high':
        return t('highCarbDay');
      case 'moderate':
        return t('moderateCarbDay');
      case 'low':
        return t('lowCarbDay');
      default:
        return t('selectCarbDay');
    }
  };

  const calculateMacros = (type: 'high' | 'moderate' | 'low'): MacroDistribution => {
    const distribution = CARB_DAY_MACROS[type];
    const proteinCals = calories * distribution.protein;
    const carbsCals = calories * distribution.carbs;
    const fatsCals = calories * distribution.fats;

    return {
      protein: Math.round(proteinCals / 4), // 4 kcal/g por proteína
      carbs: Math.round(carbsCals / 4),     // 4 kcal/g por carboidrato
      fats: Math.round(fatsCals / 9)        // 9 kcal/g por gordura
    };
  };

  const handleTypeSelect = (type: 'high' | 'moderate' | 'low') => {
    const newMacros = calculateMacros(type);
    onChange(type, newMacros);
    setIsExpanded(false);
  };

  return (
    <div className="bg-[rgb(28,28,28)] rounded-lg border border-[#f8c045]/10">
      {/* Header/Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-[#f8c045] hover:bg-[#f8c045]/5 transition rounded-lg"
      >
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">{t('carbCycling')}</h3>
          <span className="ml-4 text-sm text-gray-400">
            {getTypeLabel(value)}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[600px] border-t border-[#f8c045]/10' : 'max-h-0'
        }`}
      >
        <div className="p-4 space-y-4">
          <button
            onClick={() => handleTypeSelect('high')}
            className={`w-full p-4 rounded-lg border transition ${
              value === 'high'
                ? 'bg-[#f8c045]/10 border-[#f8c045] text-[#f8c045]'
                : 'bg-[rgb(23,23,23)] border-[#f8c045]/10 text-gray-400 hover:bg-[#f8c045]/5'
            }`}
          >
            <div className="text-left">
              <h4 className="font-medium mb-2">{t('highCarbDay')}</h4>
              <ul className="space-y-1 text-sm">
                <li>{t('carbsPercentage', ['65'])}</li>
                <li>{t('proteinPercentage', ['20'])}</li>
                <li>{t('fatsPercentage', ['15'])}</li>
              </ul>
              {value === 'high' && (
                <div className="mt-3 pt-3 border-t border-[#f8c045]/20">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">{t('proteins')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('high').protein}g
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('carbs')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('high').carbs}g
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('fats')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('high').fats}g
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('moderate')}
            className={`w-full p-4 rounded-lg border transition ${
              value === 'moderate'
                ? 'bg-[#f8c045]/10 border-[#f8c045] text-[#f8c045]'
                : 'bg-[rgb(23,23,23)] border-[#f8c045]/10 text-gray-400 hover:bg-[#f8c045]/5'
            }`}
          >
            <div className="text-left">
              <h4 className="font-medium mb-2">{t('moderateCarbDay')}</h4>
              <ul className="space-y-1 text-sm">
                <li>{t('carbsPercentage', ['35'])}</li>
                <li>{t('proteinPercentage', ['40'])}</li>
                <li>{t('fatsPercentage', ['25'])}</li>
              </ul>
              {value === 'moderate' && (
                <div className="mt-3 pt-3 border-t border-[#f8c045]/20">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">{t('proteins')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('moderate').protein}g
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('carbs')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('moderate').carbs}g
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('fats')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('moderate').fats}g
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('low')}
            className={`w-full p-4 rounded-lg border transition ${
              value === 'low'
                ? 'bg-[#f8c045]/10 border-[#f8c045] text-[#f8c045]'
                : 'bg-[rgb(23,23,23)] border-[#f8c045]/10 text-gray-400 hover:bg-[#f8c045]/5'
            }`}
          >
            <div className="text-left">
              <h4 className="font-medium mb-2">{t('lowCarbDay')}</h4>
              <ul className="space-y-1 text-sm">
                <li>{t('carbsPercentage', ['12.5'])}</li>
                <li>{t('proteinPercentage', ['60'])}</li>
                <li>{t('fatsPercentage', ['27.5'])}</li>
              </ul>
              {value === 'low' && (
                <div className="mt-3 pt-3 border-t border-[#f8c045]/20">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">{t('proteins')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('low').protein}g
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('carbs')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('low').carbs}g
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('fats')}:</span>
                      <div className="text-[#f8c045] font-medium">
                        {calculateMacros('low').fats}g
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}