/**
 * Dashboard Settings screen — real-data wiring (PARITY).
 *
 * The screen used to render a hardcoded profile ("John Doe" via INITIAL_SETTINGS),
 * a fake setTimeout "save" that persisted nothing, and a hardcoded "$79/month
 * Premium" billing card. It now sources the profile from the real authenticated
 * user (authStore / Supabase), the billing summary from the real Stripe-backed
 * GET /api/payment/billing (subscriptionApi.getBillingOverview), saves the profile
 * through the real authStore.updateProfile mutation, and empty-states the
 * notification section (its only mobile-reachable endpoint is an unauthenticated
 * in-memory mock — no honest per-user source).
 *
 * These tests prove: fetch-on-mount, the real profile + real billing render while
 * the removed mocks ("John Doe", "$79/month", "Premium" badge, fake toggles) never
 * show, each honest state renders (loading / error+retry / empty), no card data is
 * fabricated, Save calls the real mutation (never a fake setTimeout), and the
 * no-user profile empty-states without a Save action.
 */

import React from "react";
import { Alert } from "react-native";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { User } from "../../types";
import type { BillingOverview } from "../../services/api/user";

const mockGetBillingOverview = jest.fn();
const mockUpdateProfile = jest.fn();
let mockUser: User | null = null;

jest.mock("../../services/api/user", () => ({
  subscriptionApi: {
    getBillingOverview: (...args: unknown[]) => mockGetBillingOverview(...args),
  },
}));

jest.mock("../../store/authStore", () => ({
  useAuthStore: () => ({ user: mockUser, updateProfile: mockUpdateProfile }),
}));

// expo-router, @expo/vector-icons, and AsyncStorage are mocked globally in
// jest.setup.js.

import SettingsScreen from "../../../app/dashboard/settings";

function makeUser(over: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "marcus@example.com",
    name: "Marcus Chen",
    phone: "+1 (555) 000-1111",
    subscription_tier: "free",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function billingOverview(over: Partial<BillingOverview> = {}): BillingOverview {
  return {
    planName: "Pro",
    price: 99.99,
    interval: "month",
    status: "active",
    nextBilling: "2027-02-15",
    cancelAtPeriodEnd: false,
    paymentMethod: null,
    recentInvoices: [],
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = makeUser();
  mockGetBillingOverview.mockResolvedValue({
    success: true,
    data: billingOverview(),
  });
  mockUpdateProfile.mockResolvedValue(undefined);
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  (Alert.alert as jest.Mock).mockRestore();
});

describe("Dashboard Settings screen", () => {
  it("fetches the billing overview from the API on mount", async () => {
    render(<SettingsScreen />);
    await waitFor(() =>
      expect(mockGetBillingOverview).toHaveBeenCalledTimes(1),
    );
  });

  it("renders the real user profile and never the removed 'John Doe' mock", async () => {
    render(<SettingsScreen />);

    // Real name + phone are editable (seeded from authStore); real email is
    // account identity, shown read-only.
    expect(await screen.findByDisplayValue("Marcus Chen")).toBeTruthy();
    expect(screen.getByDisplayValue("+1 (555) 000-1111")).toBeTruthy();
    expect(screen.getByText("marcus@example.com")).toBeTruthy();

    // The removed hardcoded profile must not render.
    expect(screen.queryByDisplayValue("John Doe")).toBeNull();
    expect(screen.queryByText("John Doe")).toBeNull();
    expect(screen.queryByDisplayValue("john@example.com")).toBeNull();

    // Flush the mount billing fetch.
    await waitFor(() => expect(mockGetBillingOverview).toHaveBeenCalled());
  });

  it("renders the real billing summary — never the hardcoded $79/Premium mock", async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(mockGetBillingOverview).toHaveBeenCalled());

    fireEvent.press(screen.getByText("Billing"));

    // Real plan name, price, status, and renewal from getBillingOverview.
    expect(await screen.findByText("Pro")).toBeTruthy();
    expect(screen.getByText("$99.99/mo")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText(/Renews 2027-02-15/)).toBeTruthy();

    // The removed hardcoded billing card must not render.
    expect(screen.queryByText("$79/month")).toBeNull();
    expect(screen.queryByText(/\$79/)).toBeNull();
    expect(screen.queryByText("Premium")).toBeNull();
    expect(screen.queryByText(/Renews Dec 15, 2024/)).toBeNull();

    // No card data is fabricated on this screen.
    expect(screen.queryByText(/4242/)).toBeNull();
    expect(screen.queryByText(/••••/)).toBeNull();
  });

  it("shows 'Free' with no renewal for a free-tier billing overview", async () => {
    mockGetBillingOverview.mockResolvedValue({
      success: true,
      data: billingOverview({
        planName: "Free",
        price: 0,
        status: "active",
        nextBilling: null,
      }),
    });
    render(<SettingsScreen />);
    await waitFor(() => expect(mockGetBillingOverview).toHaveBeenCalled());

    fireEvent.press(screen.getByText("Billing"));

    // "Free" renders as both the plan name and the price ($0 → "Free"), so match all.
    expect((await screen.findAllByText("Free")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Renews/)).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it("shows the billing loading state while the fetch is in flight", async () => {
    mockGetBillingOverview.mockReturnValue(new Promise<never>(() => undefined));
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Billing"));
    expect(
      await screen.findByTestId("dashboard-settings-loading"),
    ).toBeTruthy();
  });

  it("shows an honest billing error state with retry — never the mock", async () => {
    mockGetBillingOverview.mockResolvedValueOnce({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Billing"));

    expect(await screen.findByTestId("dashboard-settings-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();
    expect(screen.queryByText("$79/month")).toBeNull();

    // Retry re-fetches (default beforeEach mock resolves the second call).
    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetBillingOverview).toHaveBeenCalledTimes(2),
    );
    expect(await screen.findByText("Pro")).toBeTruthy();
  });

  it("empty-states the notifications tab (no honest per-user source, no fake toggles)", async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(mockGetBillingOverview).toHaveBeenCalled());

    fireEvent.press(screen.getByText("Alerts"));

    expect(screen.getByTestId("dashboard-settings-empty")).toBeTruthy();
    expect(
      screen.getByText(/Notification preferences aren't available/),
    ).toBeTruthy();

    // The removed fake toggles must not render.
    expect(screen.queryByText("Marketing Emails")).toBeNull();
    expect(screen.queryByText("SMS Notifications")).toBeNull();
    expect(screen.queryByText("Weekly Report")).toBeNull();
  });

  it("saves the profile through the real updateProfile mutation (not a fake setTimeout)", async () => {
    render(<SettingsScreen />);

    const nameInput = await screen.findByDisplayValue("Marcus Chen");
    fireEvent.changeText(nameInput, "Marcus C. Chen");

    fireEvent.press(screen.getByTestId("dashboard-settings-save"));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: "Marcus C. Chen",
        phone: "+1 (555) 000-1111",
      }),
    );
    expect(await screen.findByText("Changes saved")).toBeTruthy();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("surfaces an alert and no success badge when the save fails", async () => {
    mockUpdateProfile.mockRejectedValue(new Error("Supabase down"));
    render(<SettingsScreen />);

    const nameInput = await screen.findByDisplayValue("Marcus Chen");
    fireEvent.changeText(nameInput, "New Name");
    fireEvent.press(screen.getByTestId("dashboard-settings-save"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Couldn't save changes",
        "Supabase down",
      ),
    );
    expect(screen.queryByText("Changes saved")).toBeNull();
  });

  it("empty-states the profile and hides Save when there is no authenticated user", async () => {
    mockUser = null;
    render(<SettingsScreen />);

    expect(screen.getByTestId("dashboard-settings-empty")).toBeTruthy();
    expect(
      screen.getByText("Sign in to view and manage your profile."),
    ).toBeTruthy();
    expect(screen.queryByTestId("dashboard-settings-save")).toBeNull();
    expect(screen.queryByDisplayValue("John Doe")).toBeNull();

    // Billing still fetches on mount regardless of auth state on this screen.
    await waitFor(() => expect(mockGetBillingOverview).toHaveBeenCalled());
  });
});
