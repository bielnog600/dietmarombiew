import { useLanguageStore } from '../store/languageStore';

interface MealTranslations {
  [key: string]: {
    [key: string]: string;
  };
}

export const mealTranslations: MealTranslations = {
  en: {
    'Café da Manhã': 'Breakfast',
    'Almoço': 'Lunch',
    'Lanche': 'Snack',
    'Jantar': 'Dinner',
    'Pré-treino': 'Pre-workout',
    'Pós-treino': 'Post-workout',
    'Ceia': 'Late Night Snack',
    'Suplementos': 'Supplements'
  },
  pt: {
    'Café da Manhã': 'Café da Manhã',
    'Almoço': 'Almoço',
    'Lanche': 'Lanche',
    'Jantar': 'Jantar',
    'Pré-treino': 'Pré-treino',
    'Pós-treino': 'Pós-treino',
    'Ceia': 'Ceia',
    'Suplementos': 'Suplementos'
  }
};

export function useMealTranslation() {
  const language = useLanguageStore(state => state.language);
  
  return {
    translateMeal: (mealName: string) => {
      return mealTranslations[language]?.[mealName] || mealName;
    }
  };
}