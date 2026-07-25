/**
 * Subscription Management screen — real-data wiring (PARITY-P2).
 *
 * The screen used to render a hardcoded PLANS array — a wrong 4-plan catalog
 * ("Basic"/"Enterprise" don't exist; $9.99/$29.99/$99.99 diverged from the real
 * 6-tier pricing) with "pro" hardcoded as the current plan — behind a fake
 * setTimeout load. It now fetches the real Stripe-backed catalog from
 * GET /api/payment/billing via subscriptionApi.getSubscriptionDetail and renders
 * the real plans, features, prices, the real current-plan marker, and the current
 * status/renewal, with honest inline loading / error+retry / empty states. The
 * plan-change and cancel actions call the real POST /api/payment/billing/plan
 * instead of a dead local-state toggle.
 *
 * These tests prove: fetch-on-mount, the real catalog renders while the removed
 * mock (Basic, Enterprise, $9.99, "Most Popular") never shows, each honest state
 * renders, no card/payment data is fabricated on this screen, and the plan-change /
 * redirect / cancel actions hit the real API (never a fake toggle).
 */

import React from "react";
import { Alert } from "react-native";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import type { SubscriptionDetail } from "../../services/api/user";

const mockGetSubscriptionDetail = jest.fn();
const mockUpdatePlan = jest.fn();
const mockCancelPlan = jest.fn();
const mockOpenExternalUrl = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/user", () => ({
  subscriptionApi: {
    getSubscriptionDetail: (...args: unknown[]) =>
      mockGetSubscriptionDetail(...args),
    updatePlan: (...args: unknown[]) => mockUpdatePlan(...args),
    cancelPlan: (...args: unknown[]) => mockCancelPlan(...args),
  },
}));

jest.mock("../../utils/openExternalUrl", () => ({
  openExternalUrl: (...args: unknown[]) => mockOpenExternalUrl(...args),
}));

// expo-router is mocked globally in jest.setup.js.

import SubscriptionScreen from "../../../app/billing/subscription";

function detail(over: Partial<SubscriptionDetail> = {}): SubscriptionDetail {
  return {
    plans: [
      {
        id: "free",
        name: "Free",
        price: 0,
        interval: "month",
        features: ["Credit score from 1 bureau"],
        isCurrent: false,
      },
      {
        id: "standard",
        name: "Standard",
        price: 29.99,
        interval: "month",
        features: ["All 3 bureaus", "10 AI-powered disputes/month"],
        isCurrent: true,
      },
      {
        id: "pro",
        name: "Pro",
        price: 99.99,
        interval: "month",
        features: ["Unlimited AI-powered disputes"],
        isCurrent: false,
      },
    ],
    currentPlanId: "standard",
    status: "active",
    nextBilling: "2027-02-15",
    cancelAtPeriodEnd: false,
    ...over,
  };
}

function resolve(data: SubscriptionDetail = detail()) {
  mockGetSubscriptionDetail.mockResolvedValue({ success: true, data });
}

/** Grab a button by its label from the most recent Alert.alert call and press it. */
async function pressAlertButton(text: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as {
    text: string;
    onPress?: () => void;
  }[];
  const button = buttons.find((b) => b.text === text);
  await act(async () => {
    button?.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  (Alert.alert as jest.Mock).mockRestore();
});

describe("Subscription Management screen", () => {
  it("fetches the subscription detail from the API on mount", async () => {
    resolve();
    render(<SubscriptionScreen />);
    await waitFor(() =>
      expect(mockGetSubscriptionDetail).toHaveBeenCalledTimes(1),
    );
  });

  it("renders the real plan catalog, current marker, and status/renewal — never the removed mock", async () => {
    resolve();
    render(<SubscriptionScreen />);

    // Real plans + real prices + real features. "Standard" renders twice — once in
    // the current-subscription summary and once as its plan card.
    expect(await screen.findByText("Pro")).toBeTruthy();
    expect(screen.getAllByText("Standard").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getByText("$99.99")).toBeTruthy();
    expect(screen.getByText("All 3 bureaus")).toBeTruthy();

    // Real current-plan marker + status + renewal.
    expect(screen.getByText("Current Plan")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText(/Renews: 2027-02-15/)).toBeTruthy();

    // The removed hardcoded mock catalog must not render.
    expect(screen.queryByText("Basic")).toBeNull();
    expect(screen.queryByText("Enterprise")).toBeNull();
    expect(screen.queryByText("$9.99")).toBeNull();
    expect(screen.queryByText("Most Popular")).toBeNull();

    // No payment-method / card data is fabricated on this screen.
    expect(screen.queryByText(/4242/)).toBeNull();
    expect(screen.queryByText(/••••/)).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetSubscriptionDetail.mockReturnValue(
      new Promise<never>(() => undefined),
    );
    render(<SubscriptionScreen />);
    expect(screen.getByTestId("billing-subscription-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never the mock", async () => {
    mockGetSubscriptionDetail.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<SubscriptionScreen />);

    expect(
      await screen.findByTestId("billing-subscription-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // No fabricated plan catalog behind the error.
    expect(screen.queryByText("Basic")).toBeNull();
    expect(screen.queryByText("Enterprise")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetSubscriptionDetail).toHaveBeenCalledTimes(2),
    );
  });

  it("falls back to a generic error message when the failure carries no message", async () => {
    mockGetSubscriptionDetail.mockResolvedValue({ success: false });
    render(<SubscriptionScreen />);
    expect(
      await screen.findByTestId("billing-subscription-error"),
    ).toBeTruthy();
    expect(
      screen.getByText("Unable to load your subscription right now."),
    ).toBeTruthy();
  });

  it("empty-states when the catalog comes back with no plans", async () => {
    resolve(detail({ plans: [] }));
    render(<SubscriptionScreen />);
    expect(
      await screen.findByTestId("billing-subscription-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No plans are available right now.")).toBeTruthy();
  });

  it("does not prompt a plan change when the current plan is tapped", async () => {
    resolve();
    render(<SubscriptionScreen />);
    await screen.findByText("Current Plan");
    // Press the current plan's card (the second "Standard" node — the first is the
    // summary). Its TouchableOpacity is disabled and guarded, so nothing happens.
    const standardNodes = screen.getAllByText("Standard");
    fireEvent.press(standardNodes[standardNodes.length - 1]);
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockUpdatePlan).not.toHaveBeenCalled();
  });

  it("changes plan through the real API and reloads when the change is applied", async () => {
    resolve();
    mockUpdatePlan.mockResolvedValue({
      success: true,
      data: { status: "updated" },
    });
    render(<SubscriptionScreen />);

    // "Upgrade" is Pro's action (99.99 > current 29.99).
    fireEvent.press(await screen.findByText("Upgrade"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Change Plan",
      "Switch to the Pro plan?",
      expect.any(Array),
    );

    await pressAlertButton("Confirm");

    expect(mockUpdatePlan).toHaveBeenCalledWith("pro");
    // mount + reload after the change.
    await waitFor(() =>
      expect(mockGetSubscriptionDetail).toHaveBeenCalledTimes(2),
    );
    expect(mockOpenExternalUrl).not.toHaveBeenCalled();
  });

  it("opens Stripe Checkout (via the allowlisted opener) when the change needs a redirect", async () => {
    resolve();
    mockUpdatePlan.mockResolvedValue({
      success: true,
      data: {
        status: "redirect",
        checkoutUrl: "https://checkout.stripe.com/c/pay/abc",
      },
    });
    render(<SubscriptionScreen />);

    fireEvent.press(await screen.findByText("Upgrade"));
    await pressAlertButton("Confirm");

    expect(mockUpdatePlan).toHaveBeenCalledWith("pro");
    await waitFor(() =>
      expect(mockOpenExternalUrl).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/pay/abc",
      ),
    );
    // A redirect does not re-fetch (only mount).
    expect(mockGetSubscriptionDetail).toHaveBeenCalledTimes(1);
  });

  it("surfaces an alert and does not reload when the plan change fails", async () => {
    resolve();
    mockUpdatePlan.mockResolvedValue({
      success: false,
      error: { code: "HTTP_500", message: "Stripe unavailable" },
    });
    render(<SubscriptionScreen />);

    fireEvent.press(await screen.findByText("Upgrade"));
    await pressAlertButton("Confirm");

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Unable to change plan",
        "Stripe unavailable",
      ),
    );
    // Only the mount fetch — no reload on failure.
    expect(mockGetSubscriptionDetail).toHaveBeenCalledTimes(1);
    expect(mockOpenExternalUrl).not.toHaveBeenCalled();
  });

  it("cancels the subscription through the real API and reloads", async () => {
    resolve();
    mockCancelPlan.mockResolvedValue({
      success: true,
      data: { status: "updated" },
    });
    render(<SubscriptionScreen />);

    fireEvent.press(await screen.findByTestId("billing-subscription-cancel"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Cancel Subscription",
      expect.stringContaining("Free plan"),
      expect.any(Array),
    );

    await pressAlertButton("Cancel Subscription");

    expect(mockCancelPlan).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(mockGetSubscriptionDetail).toHaveBeenCalledTimes(2),
    );
  });

  it("surfaces an alert when the cancel fails, without reloading", async () => {
    resolve();
    mockCancelPlan.mockResolvedValue({ success: false });
    render(<SubscriptionScreen />);

    fireEvent.press(await screen.findByTestId("billing-subscription-cancel"));
    await pressAlertButton("Cancel Subscription");

    await waitFor(() =>
      expect(mockCancelPlan).toHaveBeenCalledTimes(1),
    );
    expect(Alert.alert).toHaveBeenLastCalledWith(
      "Unable to cancel",
      "Please try again.",
    );
    expect(mockGetSubscriptionDetail).toHaveBeenCalledTimes(1);
  });

  it("hides the cancel action and shows 'Access ends' when the plan is set to cancel at period end", async () => {
    resolve(detail({ cancelAtPeriodEnd: true, nextBilling: "2027-03-01" }));
    render(<SubscriptionScreen />);

    expect(await screen.findByText(/Access ends: 2027-03-01/)).toBeTruthy();
    expect(screen.queryByTestId("billing-subscription-cancel")).toBeNull();
  });

  it("hides the cancel action for a free-tier user with no paid plan", async () => {
    resolve(
      detail({
        currentPlanId: "free",
        nextBilling: null,
        plans: [
          {
            id: "free",
            name: "Free",
            price: 0,
            interval: "month",
            features: ["Credit score from 1 bureau"],
            isCurrent: true,
          },
          {
            id: "standard",
            name: "Standard",
            price: 29.99,
            interval: "month",
            features: ["All 3 bureaus"],
            isCurrent: false,
          },
        ],
      }),
    );
    render(<SubscriptionScreen />);

    await screen.findByText("Current Plan");
    expect(screen.queryByTestId("billing-subscription-cancel")).toBeNull();
    // A free current plan makes the paid tier a downgrade-target... actually an
    // upgrade: "Select"/"Upgrade" label renders for the paid tier.
    expect(screen.getByText("Upgrade")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    resolve();
    const { UNSAFE_getAllByType } = render(<SubscriptionScreen />);
    await screen.findByText("Pro");

    const { ScrollView } = require("react-native");
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    expect(mockGetSubscriptionDetail).toHaveBeenCalledTimes(2);
  });
});
