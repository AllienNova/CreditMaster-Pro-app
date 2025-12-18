import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscription: 'free' | 'basic' | 'premium' | 'enterprise';
  createdAt: string;
}

interface CreditScore {
  bureau: 'experian' | 'equifax' | 'transunion';
  score: number;
  change: number;
  lastUpdated: string;
}

interface Dispute {
  id: string;
  status: 'draft' | 'pending' | 'in_progress' | 'resolved' | 'rejected';
  bureau: string;
  type: string;
  creditor: string;
  createdAt: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Credit Scores
  creditScores: CreditScore[];
  setCreditScores: (scores: CreditScore[]) => void;
  updateScore: (bureau: string, score: number, change: number) => void;

  // Disputes
  disputes: Dispute[];
  setDisputes: (disputes: Dispute[]) => void;
  addDispute: (dispute: Dispute) => void;
  updateDispute: (id: string, updates: Partial<Dispute>) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;

  // UI State
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Settings
  biometricEnabled: boolean;
  pushNotificationsEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  setPushNotificationsEnabled: (enabled: boolean) => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false, creditScores: [], disputes: [], notifications: [] }),

      // Credit Scores
      creditScores: [],
      setCreditScores: (creditScores) => set({ creditScores }),
      updateScore: (bureau, score, change) =>
        set((state) => ({
          creditScores: state.creditScores.map((s) =>
            s.bureau === bureau ? { ...s, score, change, lastUpdated: new Date().toISOString() } : s
          ),
        })),

      // Disputes
      disputes: [],
      setDisputes: (disputes) => set({ disputes }),
      addDispute: (dispute) => set((state) => ({ disputes: [dispute, ...state.disputes] })),
      updateDispute: (id, updates) =>
        set((state) => ({
          disputes: state.disputes.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      // Notifications
      notifications: [],
      unreadCount: 0,
      setNotifications: (notifications) =>
        set({ notifications, unreadCount: notifications.filter((n) => !n.read).length }),
      markAsRead: (id) =>
        set((state) => {
          const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length };
        }),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      // UI State
      isLoading: false,
      setLoading: (isLoading) => set({ isLoading }),
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      // Settings
      biometricEnabled: false,
      pushNotificationsEnabled: true,
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setPushNotificationsEnabled: (pushNotificationsEnabled) => set({ pushNotificationsEnabled }),

      // Onboarding
      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
    }),
    {
      name: 'CPFI-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        biometricEnabled: state.biometricEnabled,
        pushNotificationsEnabled: state.pushNotificationsEnabled,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);

// Selectors
export const selectUser = (state: AppState) => state.user;
export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated;
export const selectCreditScores = (state: AppState) => state.creditScores;
export const selectDisputes = (state: AppState) => state.disputes;
export const selectNotifications = (state: AppState) => state.notifications;
export const selectUnreadCount = (state: AppState) => state.unreadCount;

