/**
 * admin/index and admin/subscriptions — real-data wiring.
 *
 * The admin home showed "Total Users 12,458 +12%" and "Monthly Revenue
 * $245,890 +15%" to every operator, with pull-to-refresh implemented as
 * `await new Promise((r) => setTimeout(r, 1000))`. The subscriptions screen
 * showed john@example.com on a "pro" plan at $29.99 behind the same fake
 * 800ms spinner, and summed those invented rows into an MRR figure.
 *
 * Two claims these tests hold, both of the same kind — refusing to state a
 * number nobody computed:
 *
 *  1. Only ONE of the six old change percentages had a source. /admin/stats
 *     returns userGrowth and nothing else trend-shaped, so the other metrics
 *     carry no green arrow at all rather than a plausible one.
 *  2. A subscription with no recorded amount is EXCLUDED from MRR and counted
 *     aloud, not folded in as $0. A price we do not have is not a price of
 *     nothing.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type {
  AdminPlatformStats,
  AdminSubscription,
} from "../../services/api/admin";

const mockGetStats = jest.fn();
const mockGetSubscriptions = jest.fn();

jest.mock("../../services/api/admin", () => ({
  adminStatsApi: { getStats: (...a: unknown[]) => mockGetStats(...a) },
  adminSubscriptionsApi: {
    getSubscriptions: (...a: unknown[]) => mockGetSubscriptions(...a),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import AdminHomeScreen from "../../../app/admin/index";
import AdminSubscriptionsScreen from "../../../app/admin/subscriptions";

function stats(over: Partial<AdminPlatformStats> = {}): AdminPlatformStats {
  return {
    totalUsers: 1240,
    activeSubscriptions: 310,
    totalDisputes: 200,
    resolvedDisputes: 150,
    monthlyRevenue: 9300,
    userGrowth: 12.5,
    ...over,
  };
}

function sub(over: Partial<AdminSubscription> = {}): AdminSubscription {
  return {
    id: "s1",
    user: "real@fynvita.test",
    plan: "pro",
    status: "active",
    amount: 99.99,
    nextBilling: "2026-09-15T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetStats.mockResolvedValue({ success: true, data: stats() });
  mockGetSubscriptions.mockResolvedValue({ success: true, data: [sub()] });
});

describe("admin/index", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<AdminHomeScreen />);
    await waitFor(() => expect(mockGetStats).toHaveBeenCalledTimes(1));
  });

  it("never shows the invented headline numbers again", async () => {
    render(<AdminHomeScreen />);
    await waitFor(() => expect(mockGetStats).toHaveBeenCalled());
    expect(screen.queryByText("12,458")).toBeNull();
    expect(screen.queryByText("$245,890")).toBeNull();
  });

  it("renders the real counts", async () => {
    render(<AdminHomeScreen />);
    expect(await screen.findByText("1,240")).toBeTruthy();
    expect(screen.getByText("310")).toBeTruthy();
    expect(screen.getByText("$9,300")).toBeTruthy();
  });

  it("computes the dispute success rate from real counts", async () => {
    // 150 of 200 resolved.
    render(<AdminHomeScreen />);
    expect(await screen.findByText("75%")).toBeTruthy();
  });

  it("states no success rate when no dispute has been filed", async () => {
    // The old screen's flat "78%" asserted a rate for a platform with no
    // disputes at all.
    mockGetStats.mockResolvedValue({
      success: true,
      data: stats({ totalDisputes: 0, resolvedDisputes: 0 }),
    });
    render(<AdminHomeScreen />);
    expect(await screen.findByText("—")).toBeTruthy();
  });

  describe("change percentages", () => {
    it("shows the one trend the route actually computes", async () => {
      render(<AdminHomeScreen />);
      expect(await screen.findByText("+12.5%")).toBeTruthy();
    });

    it("shows no others, because nothing measures them", async () => {
      render(<AdminHomeScreen />);
      await waitFor(() => expect(mockGetStats).toHaveBeenCalled());
      for (const invented of ["+8%", "+15%", "+3%", "-15%"]) {
        expect(screen.queryByText(invented)).toBeNull();
      }
    });
  });

  it("keeps the quick-actions menu, which is product content", async () => {
    // QUICK_ACTIONS is the admin navigation, not user data.
    render(<AdminHomeScreen />);
    await waitFor(() => expect(mockGetStats).toHaveBeenCalled());
    expect(screen.getByText("Audit trail")).toBeTruthy();
  });

  it("distinguishes a failed read from real zeroes", async () => {
    // An operator seeing 0 users would conclude something very different from
    // "we could not read the counts".
    mockGetStats.mockResolvedValue({
      success: false,
      error: { message: "boom" },
    });
    render(<AdminHomeScreen />);

    expect(
      await screen.findByText(/could not load the platform stats/i),
    ).toBeTruthy();
    expect(screen.queryByText("Total Users")).toBeNull();
  });
});

describe("admin/subscriptions", () => {
  it("fetches on mount instead of faking a spinner over a fixture", async () => {
    render(<AdminSubscriptionsScreen />);
    await waitFor(() => expect(mockGetSubscriptions).toHaveBeenCalledTimes(1));
  });

  it("never shows the invented subscribers again", async () => {
    render(<AdminSubscriptionsScreen />);
    await waitFor(() => expect(mockGetSubscriptions).toHaveBeenCalled());
    expect(screen.queryByText("john@example.com")).toBeNull();
    expect(screen.queryByText("sarah@example.com")).toBeNull();
  });

  it("builds the plan chips from the plans actually present", async () => {
    // free | basic | pro | enterprise — this product has no "basic" and no
    // "enterprise" tier, so two chips could never match.
    mockGetSubscriptions.mockResolvedValue({
      success: true,
      data: [sub({ id: "a", plan: "pro" }), sub({ id: "b", plan: "family" })],
    });
    render(<AdminSubscriptionsScreen />);

    await waitFor(() => expect(mockGetSubscriptions).toHaveBeenCalled());
    // The chip title-cases the stored slug; the card badge upper-cases it.
    expect(screen.getByText("Family")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
    expect(screen.queryByText("Basic")).toBeNull();
    expect(screen.queryByText("Enterprise")).toBeNull();
  });

  describe("MRR", () => {
    it("sums only active subscriptions", async () => {
      mockGetSubscriptions.mockResolvedValue({
        success: true,
        data: [
          sub({ id: "a", amount: 100, status: "active" }),
          sub({ id: "b", amount: 50, status: "cancelled" }),
        ],
      });
      render(<AdminSubscriptionsScreen />);
      expect(await screen.findByText("$100.00")).toBeTruthy();
    });

    it("excludes a subscription with no recorded amount and says so", async () => {
      // Counting it as 0 would understate MRR silently.
      mockGetSubscriptions.mockResolvedValue({
        success: true,
        data: [
          sub({ id: "a", amount: 100 }),
          sub({ id: "b", amount: null }),
        ],
      });
      render(<AdminSubscriptionsScreen />);

      expect(await screen.findByText("$100.00")).toBeTruthy();
      expect(
        screen.getByText(/1 active subscription has no recorded amount/i),
      ).toBeTruthy();
    });

    it("says nothing about exclusions when every row is priced", async () => {
      render(<AdminSubscriptionsScreen />);
      await waitFor(() => expect(mockGetSubscriptions).toHaveBeenCalled());
      expect(screen.queryByText(/no recorded amount/i)).toBeNull();
    });
  });

  it("distinguishes a failed read from having no subscribers, and retries", async () => {
    mockGetSubscriptions.mockResolvedValue({
      success: false,
      error: { message: "boom" },
    });
    render(<AdminSubscriptionsScreen />);

    expect(
      await screen.findByText(/could not load subscriptions/i),
    ).toBeTruthy();
    expect(screen.queryByText(/No subscriptions recorded yet/i)).toBeNull();

    mockGetSubscriptions.mockResolvedValue({ success: true, data: [sub()] });
    fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(mockGetSubscriptions).toHaveBeenCalledTimes(2));
  });

  it("says so when there are genuinely no subscriptions", async () => {
    mockGetSubscriptions.mockResolvedValue({ success: true, data: [] });
    render(<AdminSubscriptionsScreen />);
    expect(
      await screen.findByText(/No subscriptions recorded yet/i),
    ).toBeTruthy();
  });
});
