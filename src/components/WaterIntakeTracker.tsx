import React, { useState, useEffect } from 'react';
import { Plus, Minus, Bell, BellOff } from 'lucide-react';
import { supabase, withRetry } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../translations';
import { format } from 'date-fns';

export default function WaterIntakeTracker() {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const [currentIntake, setCurrentIntake] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Notification times (24-hour format)
  const NOTIFICATION_TIMES = [8, 12, 16, 20];

  useEffect(() => {
    // Check if notifications are already enabled
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }

    // Load today's water intake
    loadTodayIntake();

    // Set up notification schedule if enabled
    if (notificationsEnabled) {
      scheduleNotifications();
    }

    // Cleanup function
    return () => {
      // Clear any scheduled notifications
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_WATER_NOTIFICATIONS'
        });
      }
    };
  }, []);

  const loadTodayIntake = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Use withRetry to handle network issues
      const { data } = await withRetry(() =>
        supabase
          .from('water_intake_history')
          .select('amount')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()
      );

      setCurrentIntake(data?.amount || 0);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error loading water intake:', err);
      setError(t('errorLoadingWaterIntake'));
    }
  };

  const updateWaterIntake = async (amount: number) => {
    if (!user || loading) return;
    
    const newAmount = Math.max(0, amount);
    if (newAmount === currentIntake) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Use withRetry for the update operation
      const { error: updateError } = await withRetry(() =>
        supabase
          .from('water_intake_history')
          .upsert({
            user_id: user.id,
            date: today,
            amount: newAmount
          }, {
            onConflict: 'user_id,date'
          })
      );

      if (updateError) throw updateError;

      setCurrentIntake(newAmount);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error updating water intake:', err);
      setError(t('errorUpdatingWaterIntake'));
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações.');
      return;
    }

    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      // Clear scheduled notifications
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_WATER_NOTIFICATIONS'
        });
      }
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      scheduleNotifications();
    }
  };

  const scheduleNotifications = () => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      console.warn('Service Worker not available for scheduling notifications');
      return;
    }

    const now = new Date();
    const scheduledTimes = NOTIFICATION_TIMES.map(hour => {
      // Create a date object for today at the specified hour
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hour, 0, 0, 0);
      
      // If the time has already passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      return scheduledTime;
    });

    // Schedule notifications through the service worker
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_WATER_NOTIFICATIONS',
      payload: {
        times: scheduledTimes.map(time => time.getTime()),
        title: 'Lembrete de Hidratação',
        body: `Hora de beber água! Meta diária: ${user?.water_intake || 2000}ml`,
        icon: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WFlh1WFWGtO11jwoHGnd/pub/1eaqdsHJVJbwEvSURATP.png'
      }
    });
  };

  const getProgressColor = () => {
    const progress = (currentIntake / (user?.water_intake || 2000)) * 100;
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-blue-400';
    if (progress >= 25) return 'bg-blue-300';
    return 'bg-blue-200';
  };

  const getNextNotificationTime = () => {
    if (!notificationsEnabled) return null;

    const now = new Date();
    const currentHour = now.getHours();

    // Find the next notification time
    const nextTime = NOTIFICATION_TIMES.find(hour => hour > currentHour);
    
    // If no more notifications today, show first notification time for tomorrow
    return nextTime 
      ? `${nextTime}:00`
      : `${NOTIFICATION_TIMES[0]}:00 (amanhã)`;
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-2 rounded text-sm mb-2">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${getProgressColor()}`}
          style={{
            width: `${Math.min(100, (currentIntake / (user?.water_intake || 2000)) * 100)}%`
          }}
        />
      </div>

      {/* Current intake */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-[#f8c045]">
            {currentIntake}ml
            <span className="text-gray-400 text-sm ml-2">/ {user?.water_intake || 2000}ml</span>
          </p>
          <p className="text-sm text-gray-400">
            {format(new Date(), 'dd/MM/yyyy')}
          </p>
        </div>

        <div className="flex flex-col items-end">
          <button
            onClick={handleNotificationToggle}
            className={`p-2 rounded-lg transition ${
              notificationsEnabled 
                ? 'bg-[#f8c045] text-[rgb(23,23,23)]' 
                : 'bg-[rgb(23,23,23)] text-[#f8c045]'
            }`}
            title={notificationsEnabled ? 'Desativar lembretes' : 'Ativar lembretes'}
          >
            {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
          </button>
          {notificationsEnabled && (
            <p className="text-xs text-gray-400 mt-1">
              Próximo lembrete: {getNextNotificationTime()}
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => updateWaterIntake(currentIntake - 250)}
          disabled={loading || currentIntake <= 0}
          className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-2 rounded-lg hover:bg-[rgb(33,33,33)] transition disabled:opacity-50"
        >
          <Minus size={20} className="mx-auto" />
        </button>

        <button
          onClick={() => updateWaterIntake(currentIntake + 250)}
          disabled={loading}
          className="flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 rounded-lg hover:bg-[#e6b041] transition disabled:opacity-50"
        >
          <Plus size={20} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}