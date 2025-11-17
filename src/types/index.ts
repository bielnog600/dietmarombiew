export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  daily_calories: number;
  water_intake: number;
  created_at: string;
  plan_expiry?: string;
  weight?: number;
  height?: number;
  age?: number;
  supplements_enabled?: boolean;
  carb_cycling_enabled?: boolean;
  activity_level?: ActivityLevel;
  gender?: 'male' | 'female';
  lean_mass?: number;
  fat_mass?: number;
  calculation_method?: 'harris' | 'mifflin' | 'cunningham';
  photo_url?: string;
}

export interface MacroDistribution {
  protein: number;
  carbs: number;
  fats: number;
}

export interface DietMacros {
  id: string;
  diet_id: string;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
}

export interface Diet {
  id: string;
  user_id: string;
  calories: number;
  created_at: string;
  meals?: Meal[];
  macros?: DietMacros;
  carb_day_type?: 'high' | 'moderate' | 'low';
}

export interface Meal {
  id: string;
  diet_id: string;
  name: string;
  created_at: string;
  meal_foods?: MealFood[];
  day_of_week?: number;
}

export interface MealFood {
  id: string;
  meal_id: string;
  food: Food;
  quantity: number;
  created_at: string;
}

export interface Food {
  id: string;
  category_id: string;
  name: string;
  name_en?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion: string;
  portion_size: number;
  created_at: string;
  food_categories?: FoodCategory;
}

export interface FoodCategory {
  id: string;
  name: string;
  name_en?: string;
  created_at: string;
}

export interface ProgressPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  photo_type: 'front' | 'side' | 'back';
  created_at: string;
}

export interface WeightRecord {
  id: string;
  user_id: string;
  weight: number;
  created_at: string;
}

export interface WaterRecord {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';