export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  daily_calories: number;
  water_intake: number;
  created_at: string;
}

export interface MacroDistribution {
  protein: number;
  carbs: number;
  fats: number;
}

export interface Diet {
  id: string;
  user_id: string;
  calories: number;
  macros: MacroDistribution;
  meals: Meal[];
  created_at: string;
}

export interface Meal {
  id: string;
  name: string;
  foods: Food[];
  total_calories: number;
  macros: MacroDistribution;
}

export interface Food {
  id: string;
  category_id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion: string;
  portion_size: number;
  created_at: string;
}

export interface FoodCategory {
  id: string;
  name: string;
  created_at: string;
}