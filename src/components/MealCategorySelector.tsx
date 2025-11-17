import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface FoodCategory {
  id: string;
  name: string;
}

interface MealConfig {
  name: string;
  percentage: number;
  categories: string[];
}

interface MealCategorySelectorProps {
  onConfigChange: (config: MealConfig[]) => void;
}

export default function MealCategorySelector({ onConfigChange }: MealCategorySelectorProps) {
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const user = useAuthStore(state => state.user);
  const [mealConfigs, setMealConfigs] = useState<MealConfig[]>([
    {
      name: 'Café da Manhã',
      percentage: 0.25,
      categories: []
    },
    {
      name: 'Almoço',
      percentage: 0.35,
      categories: []
    },
    {
      name: 'Lanche',
      percentage: 0.15,
      categories: []
    },
    {
      name: 'Jantar',
      percentage: 0.25,
      categories: []
    }
  ]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Call onConfigChange whenever mealConfigs changes
  useEffect(() => {
    // Only emit configs that have at least one category selected
    const validConfigs = mealConfigs.filter(config => config.categories.length > 0);
    if (validConfigs.length === mealConfigs.length) {
      onConfigChange(validConfigs);
    } else {
      onConfigChange([]);
    }
  }, [mealConfigs, onConfigChange]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('food_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);

    // Pre-select appropriate categories for each meal
    const updatedConfigs = mealConfigs.map(meal => {
      const mealCategories = [];
      
      switch (meal.name) {
        case 'Café da Manhã':
          mealCategories.push(
            'Café da Manhã - Proteínas',
            'Café da Manhã - Carboidratos',
            'Gorduras Saudáveis',
            'Frutas'
          );
          break;
        case 'Almoço':
        case 'Jantar':
          mealCategories.push(
            'Almoço/Jantar - Proteínas',
            'Almoço/Jantar - Carboidratos',
            'Legumes e Verduras',
            'Gorduras Saudáveis'
          );
          break;
        case 'Lanche':
          mealCategories.push(
            'Lanches - Proteínas',
            'Lanches - Carboidratos',
            'Frutas',
            'Gorduras Saudáveis'
          );
          break;
      }

      return {
        ...meal,
        categories: mealCategories
      };
    });

    setMealConfigs(updatedConfigs);
  };

  const handleCategoryToggle = (mealIndex: number, categoryName: string) => {
    setMealConfigs(prev => {
      const newConfigs = [...prev];
      const meal = { ...newConfigs[mealIndex] };
      
      if (meal.categories.includes(categoryName)) {
        meal.categories = meal.categories.filter(c => c !== categoryName);
      } else {
        meal.categories = [...meal.categories, categoryName];
      }
      
      newConfigs[mealIndex] = meal;
      return newConfigs;
    });
  };

  return (
    <div className="space-y-6">
      {mealConfigs.map((meal, mealIndex) => (
        <div 
          key={meal.name}
          className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20"
        >
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-[#f8c045]">{meal.name}</h4>
            <span className="text-gray-400">{meal.percentage * 100}%</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {categories.map(category => (
              <label
                key={category.id}
                className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-[#f8c045]/5"
              >
                <input
                  type="checkbox"
                  checked={meal.categories.includes(category.name)}
                  onChange={() => handleCategoryToggle(mealIndex, category.name)}
                  className="form-checkbox h-4 w-4 text-[#f8c045] rounded border-[#f8c045]/20 bg-[rgb(28,28,28)]"
                />
                <span className="text-gray-300 text-sm">{category.name}</span>
              </label>
            ))}
          </div>

          {meal.categories.length === 0 && (
            <p className="text-red-400 text-sm mt-2">
              Selecione pelo menos uma categoria para esta refeição
            </p>
          )}
        </div>
      ))}
    </div>
  );
}