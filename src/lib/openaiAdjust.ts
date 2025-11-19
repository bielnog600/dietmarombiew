import { supabase } from './supabase';
import type { Diet } from '../types';

export async function adjustMacrosWithAI(
  diet: Diet,
  strategy: 'cutting' | 'bulking'
): Promise<void> {
  const targetProtein = diet.macros?.protein || Math.round((diet.calories * 0.4) / 4);
  const targetCarbs = diet.macros?.carbs || Math.round((diet.calories * 0.3) / 4);
  const targetFats = diet.macros?.fats || Math.round((diet.calories * 0.3) / 9);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/adjust-macros`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dietId: diet.id,
      userId: user.id,
      strategy,
      targetCalories: diet.calories,
      targetProtein,
      targetCarbs,
      targetFats,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Edge Function Error:', error);
    throw new Error(error.error || error.details || 'Failed to adjust macros');
  }

  const data = await response.json();
  console.log('✅ Diet adjusted successfully:', data);
}
