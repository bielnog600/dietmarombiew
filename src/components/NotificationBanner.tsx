import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Droplet, Flame, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Diet, WaterRecord } from '../types';

interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
}

export default function NotificationBanner() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      checkNotifications();

      // Check notifications every 5 minutes
      const interval = setInterval(checkNotifications, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkNotifications = async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newNotifications: NotificationItem[] = [];

    try {
      // Check if user has a diet
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
        .eq('user_id', user.id)
        .eq('day_of_week', new Date().getDay())
        .order('created_at', { ascending: false })
        .limit(1);

      const diet = diets && diets.length > 0 ? diets[0] : null;

      if (diet) {
        // Calculate current calories consumed
        const totalCalories = diet.meals?.reduce((acc: number, meal: any) => {
          const mealCalories = meal.meal_foods?.reduce((mealAcc: number, mf: any) => {
            return mealAcc + Math.round(mf.food.calories * mf.quantity);
          }, 0) || 0;
          return acc + mealCalories;
        }, 0) || 0;

        const caloriesDiff = diet.calories - totalCalories;

        // Goal achieved notification
        if (Math.abs(caloriesDiff) <= 50) {
          newNotifications.push({
            id: 'calories-goal',
            type: 'success',
            icon: <CheckCircle className="w-5 h-5" />,
            title: '🎉 Meta Atingida!',
            message: `Parabéns! Você atingiu sua meta de ${diet.calories} kcal hoje!`
          });
        }
        // Calories remaining notification
        else if (caloriesDiff > 50) {
          newNotifications.push({
            id: 'calories-remaining',
            type: 'warning',
            icon: <Flame className="w-5 h-5" />,
            title: 'Faltam Calorias',
            message: `Ainda faltam ${caloriesDiff} kcal para atingir sua meta de hoje.`
          });
        }
        // Over calories notification
        else if (caloriesDiff < -50) {
          newNotifications.push({
            id: 'calories-over',
            type: 'warning',
            icon: <AlertCircle className="w-5 h-5" />,
            title: 'Atenção!',
            message: `Você excedeu sua meta em ${Math.abs(caloriesDiff)} kcal hoje.`
          });
        }
      }

      // Check water intake
      const { data: waterRecords } = await supabase
        .from('water_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      const totalWater = waterRecords?.reduce((sum, record) => sum + record.amount, 0) || 0;
      const waterGoal = user.water_intake || 2000;
      const waterRemaining = waterGoal - totalWater;

      if (totalWater >= waterGoal) {
        newNotifications.push({
          id: 'water-goal',
          type: 'success',
          icon: <CheckCircle className="w-5 h-5" />,
          title: '💧 Meta de Água!',
          message: `Ótimo! Você atingiu sua meta de ${waterGoal}ml de água hoje!`
        });
      } else if (waterRemaining > 500) {
        newNotifications.push({
          id: 'water-reminder',
          type: 'info',
          icon: <Droplet className="w-5 h-5" />,
          title: 'Lembre-se de Beber Água',
          message: `Ainda faltam ${waterRemaining}ml para sua meta de água de hoje.`
        });
      }

      // Morning motivation (6am - 10am)
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour < 10) {
        const motivationMessages = [
          'Bom dia! Comece o dia com um café da manhã saudável! ☀️',
          'Bom dia! Não esqueça de tomar água ao acordar! 💧',
          'Bom dia! Seu corpo agradece por seguir seu plano alimentar! 💪'
        ];

        const randomMessage = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];

        newNotifications.push({
          id: 'morning-motivation',
          type: 'info',
          icon: <Bell className="w-5 h-5" />,
          title: 'Bom Dia!',
          message: randomMessage
        });
      }

      // Evening reminder (8pm - 10pm)
      if (currentHour >= 20 && currentHour < 22) {
        newNotifications.push({
          id: 'evening-reminder',
          type: 'info',
          icon: <Bell className="w-5 h-5" />,
          title: 'Boa Noite!',
          message: 'Não se esqueça de fazer sua última refeição! 🌙'
        });
      }

      // Filter out dismissed notifications
      const filteredNotifications = newNotifications.filter(
        notif => !dismissedIds.has(notif.id)
      );

      setNotifications(filteredNotifications);

    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const dismissNotification = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Save to localStorage
    const dismissed = Array.from(dismissedIds);
    dismissed.push(id);
    localStorage.setItem('dismissedNotifications', JSON.stringify(dismissed));
  };

  // Load dismissed notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedNotifications');
    if (stored) {
      try {
        const dismissed = JSON.parse(stored);
        setDismissedIds(new Set(dismissed));
      } catch (e) {
        console.error('Error loading dismissed notifications:', e);
      }
    }

    // Clear dismissed notifications at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      localStorage.removeItem('dismissedNotifications');
      setDismissedIds(new Set());
      checkNotifications();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-lg p-4 border ${
            notification.type === 'success'
              ? 'bg-green-500/10 border-green-500/30'
              : notification.type === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-blue-500/10 border-blue-500/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 ${
                notification.type === 'success'
                  ? 'text-green-400'
                  : notification.type === 'warning'
                  ? 'text-yellow-400'
                  : 'text-blue-400'
              }`}
            >
              {notification.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-300">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
