// Activity level multipliers
export const ACTIVITY_LEVELS = {
  sedentary: {
    value: 1.0,
    label: 'Sedentário',
    label_en: 'Sedentary',
    description: 'Pouca ou nenhuma atividade física',
    description_en: 'Little or no physical activity'
  },
  lightly_active: {
    value: 1.4,
    label: 'Levemente ativo',
    label_en: 'Lightly Active',
    description: 'Exercício leve 1-3 dias/semana',
    description_en: 'Light exercise 1-3 days/week'
  },
  moderately_active: {
    value: 1.6,
    label: 'Moderadamente ativo',
    label_en: 'Moderately Active',
    description: 'Exercício moderado 3-5 dias/semana',
    description_en: 'Moderate exercise 3-5 days/week'
  },
  very_active: {
    value: 1.8,
    label: 'Muito ativo',
    label_en: 'Very Active',
    description: 'Exercício intenso 6-7 dias/semana',
    description_en: 'Intense exercise 6-7 days/week'
  },
  extra_active: {
    value: 2.0,
    label: 'Extremamente ativo',
    label_en: 'Extremely Active',
    description: 'Atleta ou trabalho físico pesado',
    description_en: 'Athlete or heavy physical work'
  }
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

interface BMRParams {
  weight: number;   // in kg
  height: number;   // in cm
  age: number;      // in years
  isFemale: boolean;
}

interface CunninghamBMRParams {
  leanMass: number; // in kg
}

interface TDEEParams {
  activityLevel: ActivityLevel;
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Harris-Benedict equation
 */
export function calculateHarrisBenedictBMR({ weight, height, age, isFemale }: BMRParams): number {
  if (isFemale) {
    return 655.1 + (9.563 * weight) + (1.85 * height) - (4.676 * age);
  } else {
    return 66.5 + (13.75 * weight) + (5.003 * height) - (6.755 * age);
  }
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation
 */
export function calculateMifflinStJeorBMR({ weight, height, age, isFemale }: BMRParams): number {
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return base + (isFemale ? -161 : 5);
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Cunningham equation
 * Formula: BMR = 500 + (22 × Lean Mass)
 */
export function calculateCunninghamBMR({ leanMass }: CunninghamBMRParams): number {
  return 500 + (22 * leanMass);
}

/**
 * Calculate recommended calories using all available methods
 */
export function calculateRecommendedCalories(user: {
  weight?: number;
  height?: number;
  age?: number;
  gender?: 'male' | 'female';
  activity_level?: ActivityLevel;
  lean_mass?: number;
}): null | {
  harrisBenedict?: { bmr: number; tdee: number };
  mifflinStJeor?: { bmr: number; tdee: number };
  cunningham?: { bmr: number; tdee: number };
} {
  if (!user.activity_level) {
    return null;
  }

  const activityMultiplier = ACTIVITY_LEVELS[user.activity_level].value;
  const result: any = {};

  // Calculate Cunningham if we have lean mass (no gender required)
  if (user.lean_mass) {
    const cunninghamBMR = calculateCunninghamBMR({
      leanMass: user.lean_mass
    });
    const cunninghamTDEE = Math.round(cunninghamBMR * activityMultiplier);

    result.cunningham = {
      bmr: Math.round(cunninghamBMR),
      tdee: cunninghamTDEE
    };
  }

  // Calculate Harris-Benedict and Mifflin-St Jeor if we have the required parameters
  if (user.weight && user.height && user.age && user.gender) {
    const isFemale = user.gender === 'female';
    
    // Harris-Benedict
    const harrisBenedictBMR = calculateHarrisBenedictBMR({
      weight: user.weight,
      height: user.height,
      age: user.age,
      isFemale
    });
    const harrisBenedictTDEE = Math.round(harrisBenedictBMR * activityMultiplier);
    
    result.harrisBenedict = {
      bmr: Math.round(harrisBenedictBMR),
      tdee: harrisBenedictTDEE
    };

    // Mifflin-St Jeor
    const mifflinStJeorBMR = calculateMifflinStJeorBMR({
      weight: user.weight,
      height: user.height,
      age: user.age,
      isFemale
    });
    const mifflinStJeorTDEE = Math.round(mifflinStJeorBMR * activityMultiplier);

    result.mifflinStJeor = {
      bmr: Math.round(mifflinStJeorBMR),
      tdee: mifflinStJeorTDEE
    };
  }

  return Object.keys(result).length > 0 ? result : null;
}