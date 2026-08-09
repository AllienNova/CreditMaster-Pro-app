/**
 * Fynvita Notification Store Unit Tests
 * Tests notification management, preferences, and push token registration
 */

import { act } from "@testing-library/react-native";
import {
  useNotificationStore,
  selectNotifications,
  selectUnreadNotifications,
  selectUnreadCount,
  selectNotificationsByType,
  selectPushEnabled,
} from "../notificationStore";

// Mock notification API
const mockGetAll = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockDeleteNotification = jest.fn();
const mockGetPreferences = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockRegisterPushToken = jest.fn();

jest.mock("../../services/api", () => ({
  notificationApi: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
    markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
    markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
    delete: (...args: unknown[]) => mockDeleteNotification(...args),
    getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
    updatePreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
    registerPushToken: (...args: unknown[]) => mockRegisterPushToken(...args),
  },
}));

const mockNotifications = [
  {
    id: "n1",
    userId: "user-1",
    type: "score_change" as const,
    title: "Score Update",
    body: "Your score increased by 15 points",
    read: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "n2",
    userId: "user-1",
    type: "dispute_update" as const,
    title: "Dispute Resolved",
    body: "Your dispute has been resolved",
    read: true,
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "n3",
    userId: "user-1",
    type: "alert" as const,
    title: "New Inquiry",
    body: "A new hard inquiry was detected",
    read: false,
    createdAt: "2024-01-03T00:00:00Z",
  },
];

const mockPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  categories: {
    disputes: true,
    scoreChanges: true,
    alerts: true,
    recommendations: false,
    payments: true,
    marketing: false,
  },
};

describe("Notification Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      totalNotifications: 0,
      preferences: null,
      pushToken: null,
      pushPermissionGranted: false,
      isLoading: false,
      isLoadingPreferences: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.totalNotifications).toBe(0);
      expect(state.preferences).toBeNull();
      expect(state.pushToken).toBeNull();
      expect(state.pushPermissionGranted).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isLoadingPreferences).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchNotifications", () => {
    it("should fetch and store notifications successfully", async () => {
      mockGetAll.mockResolvedValue({
        success: true,
        data: { notifications: mockNotifications, unreadCount: 2 },
      });

      await act(async () => {
        await useNotificationStore.getState().fetchNotifications();
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual(mockNotifications);
      expect(state.unreadCount).toBe(2); // n1 and n3 are unread
      expect(state.totalNotifications).toBe(3);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set isLoading while fetching", async () => {
      let resolvePromise: (value: unknown) => void;
      mockGetAll.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const fetchPromise = useNotificationStore.getState().fetchNotifications();
      expect(useNotificationStore.getState().isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          success: true,
          data: { notifications: [], unreadCount: 0 },
        });
        await fetchPromise;
      });

      expect(useNotificationStore.getState().isLoading).toBe(false);
    });

    it("should pass params to API call", async () => {
      mockGetAll.mockResolvedValue({
        success: true,
        data: { notifications: [], unreadCount: 0 },
      });

      await act(async () => {
        await useNotificationStore
          .getState()
          .fetchNotifications({ page: 2, unreadOnly: true });
      });

      expect(mockGetAll).toHaveBeenCalledWith({ page: 2, unreadOnly: true });
    });

    it("should handle API error response", async () => {
      mockGetAll.mockResolvedValue({
        success: false,
        error: { message: "Server error", code: "HTTP_500" },
      });

      await act(async () => {
        await useNotificationStore.getState().fetchNotifications();
      });

      const state = useNotificationStore.getState();
      expect(state.error).toBe("Server error");
      expect(state.isLoading).toBe(false);
    });

    it("should handle thrown exception", async () => {
      mockGetAll.mockRejectedValue(new Error("Network failure"));

      await act(async () => {
        await useNotificationStore.getState().fetchNotifications();
      });

      const state = useNotificationStore.getState();
      expect(state.error).toBe("Network failure");
      expect(state.isLoading).toBe(false);
    });

    it("should handle non-Error exception", async () => {
      mockGetAll.mockRejectedValue("string error");

      await act(async () => {
        await useNotificationStore.getState().fetchNotifications();
      });

      expect(useNotificationStore.getState().error).toBe(
        "Failed to fetch notifications",
      );
    });
  });

  describe("markAsRead", () => {
    beforeEach(() => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 2,
      });
    });

    it("should mark a notification as read", async () => {
      mockMarkAsRead.mockResolvedValue({ success: true });

      await act(async () => {
        await useNotificationStore.getState().markAsRead("n1");
      });

      const state = useNotificationStore.getState();
      const n1 = state.notifications.find((n) => n.id === "n1");
      expect(n1?.read).toBe(true);
      expect(state.unreadCount).toBe(1);
    });

    it("should not modify state when API returns failure", async () => {
      mockMarkAsRead.mockResolvedValue({ success: false });

      await act(async () => {
        await useNotificationStore.getState().markAsRead("n1");
      });

      const state = useNotificationStore.getState();
      const n1 = state.notifications.find((n) => n.id === "n1");
      expect(n1?.read).toBe(false);
      expect(state.unreadCount).toBe(2);
    });

    it("should not go below 0 for unreadCount", async () => {
      useNotificationStore.setState({ unreadCount: 0 });
      mockMarkAsRead.mockResolvedValue({ success: true });

      await act(async () => {
        await useNotificationStore.getState().markAsRead("n1");
      });

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it("should handle API exception silently", async () => {
      mockMarkAsRead.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useNotificationStore.getState().markAsRead("n1");
      });

      // Should not throw, notification stays unread
      expect(
        useNotificationStore.getState().notifications.find((n) => n.id === "n1")
          ?.read,
      ).toBe(false);
    });
  });

  describe("markAllAsRead", () => {
    beforeEach(() => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 2,
      });
    });

    it("should mark all notifications as read", async () => {
      mockMarkAllAsRead.mockResolvedValue({ success: true });

      await act(async () => {
        await useNotificationStore.getState().markAllAsRead();
      });

      const state = useNotificationStore.getState();
      expect(state.notifications.every((n) => n.read)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it("should not modify state when API returns failure", async () => {
      mockMarkAllAsRead.mockResolvedValue({ success: false });

      await act(async () => {
        await useNotificationStore.getState().markAllAsRead();
      });

      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });

    it("should handle exception silently", async () => {
      mockMarkAllAsRead.mockRejectedValue(new Error("Failure"));

      await act(async () => {
        await useNotificationStore.getState().markAllAsRead();
      });

      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });
  });

  describe("deleteNotification", () => {
    beforeEach(() => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 2,
        totalNotifications: 3,
      });
    });

    it("should delete a notification and update counts", async () => {
      mockDeleteNotification.mockResolvedValue({ success: true });

      await act(async () => {
        await useNotificationStore.getState().deleteNotification("n1");
      });

      const state = useNotificationStore.getState();
      expect(state.notifications.find((n) => n.id === "n1")).toBeUndefined();
      expect(state.notifications.length).toBe(2);
      expect(state.unreadCount).toBe(1); // n1 was unread, so decrement
      expect(state.totalNotifications).toBe(2);
    });

    it("should not decrement unreadCount when deleting a read notification", async () => {
      mockDeleteNotification.mockResolvedValue({ success: true });

      await act(async () => {
        await useNotificationStore.getState().deleteNotification("n2"); // n2 is read
      });

      const state = useNotificationStore.getState();
      expect(state.notifications.length).toBe(2);
      expect(state.unreadCount).toBe(2); // unchanged since n2 was already read
    });

    it("should not modify state when API returns failure", async () => {
      mockDeleteNotification.mockResolvedValue({ success: false });

      await act(async () => {
        await useNotificationStore.getState().deleteNotification("n1");
      });

      expect(useNotificationStore.getState().notifications.length).toBe(3);
    });

    it("should handle exception silently", async () => {
      mockDeleteNotification.mockRejectedValue(new Error("Failure"));

      await act(async () => {
        await useNotificationStore.getState().deleteNotification("n1");
      });

      expect(useNotificationStore.getState().notifications.length).toBe(3);
    });
  });

  describe("fetchPreferences", () => {
    it("should fetch and store preferences", async () => {
      mockGetPreferences.mockResolvedValue({
        success: true,
        data: mockPreferences,
      });

      await act(async () => {
        await useNotificationStore.getState().fetchPreferences();
      });

      const state = useNotificationStore.getState();
      expect(state.preferences).toEqual(mockPreferences);
      expect(state.isLoadingPreferences).toBe(false);
    });

    it("should set isLoadingPreferences while loading", async () => {
      let resolvePromise: (value: unknown) => void;
      mockGetPreferences.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const fetchPromise = useNotificationStore.getState().fetchPreferences();
      expect(useNotificationStore.getState().isLoadingPreferences).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true, data: mockPreferences });
        await fetchPromise;
      });

      expect(useNotificationStore.getState().isLoadingPreferences).toBe(false);
    });

    it("should handle failure response", async () => {
      mockGetPreferences.mockResolvedValue({ success: false });

      await act(async () => {
        await useNotificationStore.getState().fetchPreferences();
      });

      expect(useNotificationStore.getState().preferences).toBeNull();
      expect(useNotificationStore.getState().isLoadingPreferences).toBe(false);
    });

    it("should handle exception", async () => {
      mockGetPreferences.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useNotificationStore.getState().fetchPreferences();
      });

      expect(useNotificationStore.getState().isLoadingPreferences).toBe(false);
    });
  });

  describe("updatePreferences", () => {
    it("should update preferences successfully", async () => {
      const updated = { ...mockPreferences, smsEnabled: true };
      mockUpdatePreferences.mockResolvedValue({
        success: true,
        data: updated,
      });

      let result: boolean = false;
      await act(async () => {
        result = await useNotificationStore
          .getState()
          .updatePreferences({ smsEnabled: true });
      });

      expect(result).toBe(true);
      expect(useNotificationStore.getState().preferences).toEqual(updated);
    });

    it("should return false on failure", async () => {
      mockUpdatePreferences.mockResolvedValue({ success: false });

      let result: boolean = false;
      await act(async () => {
        result = await useNotificationStore
          .getState()
          .updatePreferences({ smsEnabled: true });
      });

      expect(result).toBe(false);
    });

    it("should return false on exception", async () => {
      mockUpdatePreferences.mockRejectedValue(new Error("Failure"));

      let result: boolean = false;
      await act(async () => {
        result = await useNotificationStore
          .getState()
          .updatePreferences({ smsEnabled: true });
      });

      expect(result).toBe(false);
    });
  });

  describe("setPushToken", () => {
    it("should set push token", () => {
      act(() => {
        useNotificationStore.getState().setPushToken("ExponentPushToken[xxx]");
      });

      expect(useNotificationStore.getState().pushToken).toBe(
        "ExponentPushToken[xxx]",
      );
    });
  });

  describe("registerPushToken", () => {
    it("should register push token with backend", async () => {
      useNotificationStore.setState({ pushToken: "ExponentPushToken[xxx]" });
      mockRegisterPushToken.mockResolvedValue({ success: true });

      let result: boolean = false;
      await act(async () => {
        result = await useNotificationStore.getState().registerPushToken("ios");
      });

      expect(result).toBe(true);
      expect(mockRegisterPushToken).toHaveBeenCalledWith(
        "ExponentPushToken[xxx]",
        "ios",
      );
    });

    it("should return false when no push token exists", async () => {
      useNotificationStore.setState({ pushToken: null });

      let result: boolean = false;
      await act(async () => {
        result = await useNotificationStore
          .getState()
          .registerPushToken("android");
      });

      expect(result).toBe(false);
      expect(mockRegisterPushToken).not.toHaveBeenCalled();
    });

    it("should return false on API failure", async () => {
      useNotificationStore.setState({ pushToken: "token" });
      mockRegisterPushToken.mockResolvedValue({ success: false });

      let result: boolean = false;
      await act(async () => {
        result = await useNotificationStore.getState().registerPushToken("ios");
      });

      expect(result).toBe(false);
    });

    it("should return false on exception", async () => {
      useNotificationStore.setState({ pushToken: "token" });
      mockRegisterPushToken.mockRejectedValue(new Error("Network error"));

      let result: boolean = false;
      await act(async () => {
        result = await useNotificationStore.getState().registerPushToken("ios");
      });

      expect(result).toBe(false);
    });
  });

  describe("setPushPermissionGranted", () => {
    it("should set push permission granted", () => {
      act(() => {
        useNotificationStore.getState().setPushPermissionGranted(true);
      });

      expect(useNotificationStore.getState().pushPermissionGranted).toBe(true);
    });

    it("should set push permission denied", () => {
      useNotificationStore.setState({ pushPermissionGranted: true });

      act(() => {
        useNotificationStore.getState().setPushPermissionGranted(false);
      });

      expect(useNotificationStore.getState().pushPermissionGranted).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useNotificationStore.setState({ error: "Some error" });

      act(() => {
        useNotificationStore.getState().clearError();
      });

      expect(useNotificationStore.getState().error).toBeNull();
    });
  });

  describe("resetStore", () => {
    it("should reset all state to initial values", () => {
      useNotificationStore.setState({
        notifications: mockNotifications,
        unreadCount: 5,
        totalNotifications: 10,
        preferences: mockPreferences,
        pushToken: "token",
        pushPermissionGranted: true,
        isLoading: true,
        isLoadingPreferences: true,
        error: "error",
      });

      act(() => {
        useNotificationStore.getState().resetStore();
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.totalNotifications).toBe(0);
      expect(state.preferences).toBeNull();
      expect(state.pushToken).toBeNull();
      expect(state.pushPermissionGranted).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isLoadingPreferences).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("Selectors", () => {
    beforeEach(() => {
      useNotificationStore.setState({
        notifications: mockNotifications,
        unreadCount: 2,
        pushToken: "token",
        pushPermissionGranted: true,
      });
    });

    it("selectNotifications returns all notifications", () => {
      expect(selectNotifications(useNotificationStore.getState())).toEqual(
        mockNotifications,
      );
    });

    it("selectUnreadNotifications returns only unread", () => {
      const unread = selectUnreadNotifications(useNotificationStore.getState());
      expect(unread.length).toBe(2);
      expect(unread.every((n) => !n.read)).toBe(true);
    });

    it("selectUnreadCount returns unread count", () => {
      expect(selectUnreadCount(useNotificationStore.getState())).toBe(2);
    });

    it("selectNotificationsByType filters by type", () => {
      const scoreChanges = selectNotificationsByType("score_change")(
        useNotificationStore.getState(),
      );
      expect(scoreChanges.length).toBe(1);
      expect(scoreChanges[0].id).toBe("n1");
    });

    it("selectNotificationsByType returns empty for unknown type", () => {
      const payment = selectNotificationsByType("payment")(
        useNotificationStore.getState(),
      );
      expect(payment.length).toBe(0);
    });

    it("selectPushEnabled returns true when token and permission are set", () => {
      expect(selectPushEnabled(useNotificationStore.getState())).toBe(true);
    });

    it("selectPushEnabled returns false when permission not granted", () => {
      useNotificationStore.setState({ pushPermissionGranted: false });
      expect(selectPushEnabled(useNotificationStore.getState())).toBe(false);
    });

    it("selectPushEnabled returns false when no token", () => {
      useNotificationStore.setState({ pushToken: null });
      expect(selectPushEnabled(useNotificationStore.getState())).toBe(false);
    });
  });
});
