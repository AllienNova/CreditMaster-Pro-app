/**
 * NotificationsScreen — real store wiring (PARITY-P1).
 *
 * The screen used to render a hardcoded MOCK_NOTIFICATIONS array via local
 * state. It now reads from useNotificationStore (fetch on mount, real
 * notifications, honest loading/error/empty states, store-backed actions).
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { Notification } from "../../services/api/types";

const mockFetchNotifications = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();

interface StoreState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: jest.Mock;
  markAsRead: jest.Mock;
  markAllAsRead: jest.Mock;
}

let mockStoreState: StoreState;

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../store/notificationStore", () => ({
  useNotificationStore: () => mockStoreState,
}));

// expo-router is mocked globally in jest.setup.js (see DocumentsScreen test).

import NotificationsScreen from "../../../app/notifications/index";

function notif(
  id: string,
  read: boolean,
  over: Partial<Notification> = {},
): Notification {
  return {
    id,
    userId: "u1",
    type: "system",
    title: `title-${id}`,
    body: `body-${id}`,
    read,
    createdAt: "2026-07-24T12:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    fetchNotifications: mockFetchNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
  };
});

describe("NotificationsScreen", () => {
  it("fetches notifications from the store on mount", () => {
    render(<NotificationsScreen />);
    expect(mockFetchNotifications).toHaveBeenCalled();
  });

  it("renders real notifications (title + body); never the removed mock rows", () => {
    mockStoreState.notifications = [
      notif("1", false, { title: "Real Alert", body: "Your score changed" }),
    ];
    mockStoreState.unreadCount = 1;

    render(<NotificationsScreen />);

    expect(screen.getByText("Real Alert")).toBeTruthy();
    expect(screen.getByText("Your score changed")).toBeTruthy();
    // Former MOCK_NOTIFICATIONS content must never appear.
    expect(screen.queryByText("Score Increased!")).toBeNull();
  });

  it("shows the loading state while fetching with no data yet", () => {
    mockStoreState.isLoading = true;
    render(<NotificationsScreen />);
    expect(screen.getByTestId("notifications-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the store errors and has no data", () => {
    mockStoreState.error = "Network down";
    render(<NotificationsScreen />);

    expect(screen.getByTestId("notifications-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    // mount + retry
    expect(mockFetchNotifications).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state when there are no notifications", () => {
    render(<NotificationsScreen />);
    expect(screen.getByText("All caught up!")).toBeTruthy();
  });

  it("marks all as read through the store", () => {
    mockStoreState.notifications = [notif("1", false)];
    mockStoreState.unreadCount = 1;
    render(<NotificationsScreen />);

    fireEvent.press(screen.getByText("Mark all read"));
    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });
});
