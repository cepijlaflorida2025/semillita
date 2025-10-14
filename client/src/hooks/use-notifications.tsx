import { useState, useCallback, useEffect } from "react";
// Import removed - will be passed via hook to avoid circular dependency

interface NotificationData {
  title: string;
  message: string;
  type?: 'reminder' | 'achievement' | 'milestone';
  timestamp: Date;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(async (data: NotificationData): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(data.title, {
        body: data.message,
        icon: '/favicon.ico', // App icon
        badge: '/favicon.ico',
        tag: `semillita-${data.type}`,
        // timestamp: data.timestamp.getTime(), // Not supported in all browsers
        requireInteraction: false,
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to appropriate page based on notification type
        if (data.type === 'achievement') {
          window.location.href = '/achievements';
        } else {
          window.location.href = '/dashboard';
        }
      };

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, [isSupported, permission]);

  const scheduleDailyReminder = useCallback((hour: number = 18, minute: number = 0) => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }

    // Clear existing reminders
    const existingReminders = JSON.parse(localStorage.getItem('semillita_reminders') || '[]');
    existingReminders.forEach((id: number) => clearTimeout(id));

    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hour, minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    const timerId = setTimeout(() => {
      sendNotification({
        title: '🌱 ¿Cómo está tu planta hoy?',
        message: 'No olvides registrar tus emociones y tomar una foto',
        type: 'reminder',
        timestamp: new Date(),
      });

      // Schedule next reminder for tomorrow
      scheduleDailyReminder(hour, minute);
    }, timeUntilReminder);

    // Save reminder ID
    localStorage.setItem('semillita_reminders', JSON.stringify([timerId]));

    return timerId;
  }, [isSupported, permission, sendNotification]);

  const sendAchievementNotification = useCallback(async (achievementName: string, points: number) => {
    return await sendNotification({
      title: '🏆 ¡Nuevo logro desbloqueado!',
      message: `Has conseguido "${achievementName}" (+${points} puntos)`,
      type: 'achievement',
      timestamp: new Date(),
    });
  }, [sendNotification]);

  const sendMilestoneNotification = useCallback(async (milestone: string) => {
    return await sendNotification({
      title: '🌟 ¡Hito alcanzado!',
      message: `Tu planta ha logrado: ${milestone}`,
      type: 'milestone',
      timestamp: new Date(),
    });
  }, [sendNotification]);

  const clearAllReminders = useCallback(() => {
    const existingReminders = JSON.parse(localStorage.getItem('semillita_reminders') || '[]');
    existingReminders.forEach((id: number) => clearTimeout(id));
    localStorage.removeItem('semillita_reminders');
  }, []);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    scheduleDailyReminder,
    sendAchievementNotification,
    sendMilestoneNotification,
    clearAllReminders,
  };
}
