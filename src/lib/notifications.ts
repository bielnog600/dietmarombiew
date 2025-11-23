import { supabase } from './supabase';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function registerPushNotifications() {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return;
    }

    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker registered for push notifications');

      // Store that notifications are enabled
      localStorage.setItem('notificationsEnabled', 'true');
    }
  } catch (error) {
    console.error('Error registering push notifications:', error);
  }
}

export function showNotification(title: string, body: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200],
          tag: 'diet-notification',
          requireInteraction: false,
          ...options,
        });
      });
    } else {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });
    }
  }
}

export async function scheduleNotifications(userId: string) {
  // This function will be called periodically to check and send notifications

  const now = new Date();
  const currentHour = now.getHours();

  // Morning notification (8am)
  if (currentHour === 8) {
    showNotification(
      '☀️ Bom dia!',
      'Comece o dia com um café da manhã saudável!',
      {
        tag: 'morning-reminder',
      }
    );
  }

  // Lunch reminder (12pm)
  if (currentHour === 12) {
    showNotification(
      '🍽️ Hora do Almoço!',
      'Não se esqueça de seguir seu plano alimentar.',
      {
        tag: 'lunch-reminder',
      }
    );
  }

  // Water reminder (every 2 hours from 9am to 7pm)
  if (currentHour >= 9 && currentHour <= 19 && currentHour % 2 === 1) {
    const { data: waterRecords } = await supabase
      .from('water_records')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());

    const totalWater = waterRecords?.reduce((sum, r) => sum + r.amount, 0) || 0;

    if (totalWater < 2000) {
      showNotification(
        '💧 Hora de Beber Água!',
        'Mantenha-se hidratado. Beba um copo de água agora!',
        {
          tag: 'water-reminder',
        }
      );
    }
  }

  // Dinner reminder (7pm)
  if (currentHour === 19) {
    showNotification(
      '🌙 Hora do Jantar!',
      'Prepare seu jantar seguindo seu plano alimentar.',
      {
        tag: 'dinner-reminder',
      }
    );
  }

  // End of day check (10pm)
  if (currentHour === 22) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('daily_calories, water_intake')
        .eq('id', userId)
        .single();

      if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check calories
        const { data: diets } = await supabase
          .from('diets')
          .select(`
            *,
            meals:meals(
              *,
              meal_foods:meal_foods(
                *,
                food:foods(*)
              )
            )
          `)
          .eq('user_id', userId)
          .eq('day_of_week', new Date().getDay())
          .order('created_at', { ascending: false })
          .limit(1);

        if (diets && diets.length > 0) {
          const diet = diets[0];
          const totalCalories = diet.meals?.reduce((acc: number, meal: any) => {
            const mealCalories = meal.meal_foods?.reduce((mealAcc: number, mf: any) => {
              return mealAcc + Math.round(mf.food.calories * mf.quantity);
            }, 0) || 0;
            return acc + mealCalories;
          }, 0) || 0;

          const caloriesDiff = diet.calories - totalCalories;

          if (Math.abs(caloriesDiff) <= 50) {
            showNotification(
              '🎉 Parabéns!',
              'Você atingiu sua meta de calorias hoje!',
              {
                tag: 'daily-goal-achieved',
              }
            );
          }
        }

        // Check water
        const { data: waterRecords } = await supabase
          .from('water_records')
          .select('amount')
          .eq('user_id', userId)
          .gte('created_at', today.toISOString());

        const totalWater = waterRecords?.reduce((sum, r) => sum + r.amount, 0) || 0;

        if (totalWater >= user.water_intake) {
          showNotification(
            '💧 Meta de Água Atingida!',
            `Parabéns! Você bebeu ${totalWater}ml de água hoje!`,
            {
              tag: 'water-goal-achieved',
            }
          );
        }
      }
    } catch (error) {
      console.error('Error checking daily goals:', error);
    }
  }
}

// Start notification scheduler
export function startNotificationScheduler(userId: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Check every hour
  const interval = setInterval(() => {
    scheduleNotifications(userId);
  }, 60 * 60 * 1000); // 1 hour

  // Initial check
  scheduleNotifications(userId);

  return interval;
}
