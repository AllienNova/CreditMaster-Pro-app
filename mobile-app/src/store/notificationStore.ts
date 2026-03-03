/**
 * Fynvita Notification Store
 * Manages push notifications, in-app notifications, and preferences
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notificationApi } from "../services/api";
import type {
  Notification,
  NotificationPreferences,
} from "../services/api/types";
import { seedNotifications, seedNotificationPreferences } from "../data/dev-seed";

interface NotificationState {
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  totalNotifications: number;

  // Preferences
  preferences: NotificationPreferences | null;

  // Push token
  pushToken: string | null;
  pushPermissionGranted: boolean;

  // Loading states
  isLoading: boolean;
  isLoadingPreferences: boolean;

  // Error
  error: string | null;

  // Actions - Notifications
  fetchNotifications: (params?: {
    page?: number;
    unreadOnly?: boolean;
  }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;

  // Actions - Preferences
  fetchPreferences: () => Promise<void>;
  updatePreferences: (
    preferences: Partial<NotificationPreferences>,
  ) => Promise<boolean>;

  // Actions - Push
  setPushToken: (token: string) => void;
  registerPushToken: (platform: "ios" | "android") => Promise<boolean>;
  setPushPermissionGranted: (granted: boolean) => void;

  // Actions - Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  notifications: [],
  unreadCount: 0,
  totalNotifications: 0,
  preferences: null,
  pushToken: null,
  pushPermissionGranted: false,
  isLoading: false,
  isLoadingPreferences: false,
  error: null,
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchNotifications: async (params) => {
        set({ isLoading: true, error: null });
        if (__DEV__) {
          set({
            notifications: seedNotifications,
            unreadCount: seedNotifications.filter((n) => !n.read).length,
            totalNotifications: seedNotifications.length,
            isLoading: false,
          });
          return;
        }
        try {
          const response = await notificationApi.getAll(params);
          if (response.success && response.data) {
            const notifications = response.data.items;
            set({
              notifications,
              unreadCount: notifications.filter((n) => !n.read).length,
              totalNotifications: response.data.total,
              isLoading: false,
            });
          } else {
            set({ error: response.error?.message, isLoading: false });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch notifications",
            isLoading: false,
          });
        }
      },

      markAsRead: async (notificationId) => {
        try {
          const response = await notificationApi.markAsRead(notificationId);
          if (response.success) {
            set((state) => ({
              notifications: state.notifications.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n,
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            }));
          }
        } catch (error) {
          if (__DEV__)
            console.error("Failed to mark notification as read:", error);
        }
      },

      markAllAsRead: async () => {
        try {
          const response = await notificationApi.markAllAsRead();
          if (response.success) {
            set((state) => ({
              notifications: state.notifications.map((n) => ({
                ...n,
                read: true,
              })),
              unreadCount: 0,
            }));
          }
        } catch (error) {
          if (__DEV__)
            console.error("Failed to mark all notifications as read:", error);
        }
      },

      deleteNotification: async (notificationId) => {
        try {
          const response = await notificationApi.delete(notificationId);
          if (response.success) {
            set((state) => {
              const notification = state.notifications.find(
                (n) => n.id === notificationId,
              );
              return {
                notifications: state.notifications.filter(
                  (n) => n.id !== notificationId,
                ),
                unreadCount:
                  notification && !notification.read
                    ? Math.max(0, state.unreadCount - 1)
                    : state.unreadCount,
                totalNotifications: state.totalNotifications - 1,
              };
            });
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to delete notification:", error);
        }
      },

      fetchPreferences: async () => {
        set({ isLoadingPreferences: true });
        if (__DEV__) {
          set({ preferences: seedNotificationPreferences, isLoadingPreferences: false });
          return;
        }
        try {
          const response = await notificationApi.getPreferences();
          if (response.success && response.data) {
            set({ preferences: response.data, isLoadingPreferences: false });
          } else {
            set({ isLoadingPreferences: false });
          }
        } catch {
          set({ isLoadingPreferences: false });
        }
      },

      updatePreferences: async (preferences) => {
        try {
          const response = await notificationApi.updatePreferences(preferences);
          if (response.success && response.data) {
            set({ preferences: response.data });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      setPushToken: (token) => set({ pushToken: token }),

      registerPushToken: async (platform) => {
        const { pushToken } = get();
        if (!pushToken) return false;

        try {
          const response = await notificationApi.registerPushToken(
            pushToken,
            platform,
          );
          return response.success;
        } catch {
          return false;
        }
      },

      setPushPermissionGranted: (granted) =>
        set({ pushPermissionGranted: granted }),

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),
    }),
    {
      name: "cpfi-notification-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        pushToken: state.pushToken,
        pushPermissionGranted: state.pushPermissionGranted,
      }),
    },
  ),
);

// Selectors
export const selectNotifications = (state: NotificationState) =>
  state.notifications;
export const selectUnreadNotifications = (state: NotificationState) =>
  state.notifications.filter((n) => !n.read);
export const selectUnreadCount = (state: NotificationState) =>
  state.unreadCount;
export const selectNotificationsByType =
  (type: Notification["type"]) => (state: NotificationState) =>
    state.notifications.filter((n) => n.type === type);
export const selectPushEnabled = (state: NotificationState) =>
  state.pushPermissionGranted && !!state.pushToken;
