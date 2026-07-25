/**
 * DashboardNotificationsScreen — /dashboard/notifications re-export smoke test
 * (Wave-7 parity: de-mock the dashboard Notifications screen).
 *
 * The /dashboard/notifications route used to render a SECOND, mock-backed
 * Notifications screen (MOCK_NOTIFICATIONS + setTimeout). It now re-exports the
 * single real, store-backed screen (app/notifications/index.tsx). These tests
 * prove the collapse is real:
 *   - the dashboard route's default export IS the real screen (true re-export)
 *   - rendering via the dashboard entry point fetches from the store on mount
 *   - real notifications render; the former MOCK_NOTIFICATIONS rows never do
 *   - the honest loading state carries through the re-export
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
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

// expo-router is mocked globally in jest.setup.js.

import DashboardNotifications from "../../../app/dashboard/notifications";
import RealNotificationsScreen from "../../../app/notifications/index";

// The five rows the old dashboard mock array hardcoded. None may render again.
const FORMER_MOCK_ROWS = [
  "Dispute Updated",
  "Credit Score Changed",
  "Document Analyzed",
  "New Recommendation",
  "Payment Due Soon",
];

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

describe("DashboardNotificationsScreen (/dashboard/notifications)", () => {
  it("re-exports the single real, store-backed Notifications screen", () => {
    expect(DashboardNotifications).toBe(RealNotificationsScreen);
  });

  it("fetches notifications from the store on mount (not a setTimeout mock)", () => {
    render(<DashboardNotifications />);
    expect(mockFetchNotifications).toHaveBeenCalled();
  });

  it("renders real notifications and never the former MOCK_NOTIFICATIONS rows", () => {
    mockStoreState.notifications = [
      notif("1", false, {
        title: "Real Dispute Update",
        body: "Experian marked your dispute under review",
        type: "dispute_update",
      }),
    ];
    mockStoreState.unreadCount = 1;

    render(<DashboardNotifications />);

    expect(screen.getByText("Real Dispute Update")).toBeTruthy();
    expect(
      screen.getByText("Experian marked your dispute under review"),
    ).toBeTruthy();
    for (const row of FORMER_MOCK_ROWS) {
      expect(screen.queryByText(row)).toBeNull();
    }
  });

  it("shows the honest loading state while fetching with no data yet", () => {
    mockStoreState.isLoading = true;
    render(<DashboardNotifications />);
    expect(screen.getByTestId("notifications-loading")).toBeTruthy();
  });
});
