import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNotifications } from './use-notifications';

interface User {
  id: string;
  alias: string;
  avatar?: string;
  colorTheme: string;
  points: number;
  daysSincePlanting: number;
  
  // Age validation
  age: number;
  
  // Context and role
  context: 'workshop' | 'home';
  role: 'child' | 'caregiver' | 'professional' | 'facilitator';
  
  // Enhanced parental consent system
  parentalConsent: boolean;
  parentEmail?: string;
  parentalConsentDate?: string;
  consentVerified: boolean;
  
  // Legacy workshop mode (maintaining backward compatibility)
  isWorkshopMode: boolean;
  
  createdAt: string;
  updatedAt: string;
}

interface StorageState {
  currentUser: User | null;
  onboardingCompleted: boolean;
  notificationSettings: {
    enabled: boolean;
    time: string; // HH:MM format
    types: string[]; // ['reminder', 'achievement', 'milestone']
  };
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  completeOnboarding: () => void;
  updateNotificationSettings: (settings: Partial<StorageState['notificationSettings']>) => void;
  addPoints: (points: number) => void;
  clearStorage: () => void;
}

export const useStorage = create<StorageState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      onboardingCompleted: false,
      notificationSettings: {
        enabled: true,
        time: '18:00',
        types: ['reminder', 'achievement', 'milestone'],
      },

      setCurrentUser: (user) => {
        set({ currentUser: user });
      },

      updateUser: (updates) => {
        const { currentUser } = get();
        if (currentUser) {
          set({
            currentUser: {
              ...currentUser,
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          });
        }
      },

      completeOnboarding: () => {
        set({ onboardingCompleted: true });
      },

      updateNotificationSettings: (settings) => {
        const currentSettings = get().notificationSettings;
        set({
          notificationSettings: {
            ...currentSettings,
            ...settings,
          },
        });
      },

      addPoints: (points) => {
        const { currentUser } = get();
        if (currentUser) {
          set({
            currentUser: {
              ...currentUser,
              points: currentUser.points + points,
              updatedAt: new Date().toISOString(),
            },
          });
        }
      },

      clearStorage: () => {
        set({
          currentUser: null,
          onboardingCompleted: false,
          notificationSettings: {
            enabled: true,
            time: '18:00',
            types: ['reminder', 'achievement', 'milestone'],
          },
        });
      },
    }),
    {
      name: 'semillita-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        onboardingCompleted: state.onboardingCompleted,
        notificationSettings: state.notificationSettings,
      }),
    }
  )
);

// Hook with notification integration
export function useStorageWithNotifications() {
  const storage = useStorage();
  const { requestPermission, scheduleDailyReminder, sendAchievementNotification } = useNotifications();

  const requestNotificationPermission = async () => {
    if (storage.notificationSettings.enabled) {
      const granted = await requestPermission();
      if (granted) {
        const [hour, minute] = storage.notificationSettings.time.split(':').map(Number);
        scheduleDailyReminder(hour, minute);
      }
    }
  };

  const addPointsWithNotification = async (points: number, reason?: string) => {
    const oldPoints = storage.currentUser?.points || 0;
    storage.addPoints(points);
    
    // Check for achievement milestones
    const newPoints = oldPoints + points;
    
    // Example achievement thresholds
    const achievements = [
      { threshold: 50, name: 'Primer cultivador', id: '50-points' },
      { threshold: 100, name: 'Cuidador dedicado', id: '100-points' },
      { threshold: 250, name: 'Experto en plantas', id: '250-points' },
      { threshold: 500, name: 'Maestro jardinero', id: '500-points' },
    ];

    for (const achievement of achievements) {
      if (oldPoints < achievement.threshold && newPoints >= achievement.threshold) {
        await sendAchievementNotification(achievement.name, achievement.threshold);
        break;
      }
    }
  };

  return {
    ...storage,
    requestNotificationPermission,
    addPointsWithNotification,
  };
}

// For backward compatibility
export { useStorageWithNotifications as useStorageHook };
