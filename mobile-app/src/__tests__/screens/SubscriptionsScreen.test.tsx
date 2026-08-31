/**
 * budgeting/subscriptions — real-data wiring, plus monthlyCost.
 *
 * The screen rendered a MOCK_SUBSCRIPTIONS array — Netflix $15.99, Spotify
 * $10.99 and the rest — to every user, summed into a monthly and an annual
 * cost, with Manage and Cancel buttons beside each. It made no request. A user
 * reading their annual subscription spend was reading a number about somebody
 * who does not exist.
 *
 * Its category chips were invented as well: "Entertainment", "Software",
 * "Services", "Fitness", "Cloud". None is a value BillCategory can hold, so no
 * real bill could ever have matched one — the filter was decoration.
 *
 * The number worth guarding is the monthly total. A yearly subscription
 * counted at face value inflates it twelvefold, so an unrecognised cadence is
 * excluded and said out loud rather than assumed monthly.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { monthlyCost, type BillItem } from "../../services/api/financial";

const mockGetBills = jest.fn();

jest.mock("../../services/api/financial", () => {
  const actual = jest.requireActual("../../services/api/financial");
  return {
    ...actual,
    billsApi: { getBills: (...args: unknown[]) => mockGetBills(...args) },
  };
});

// expo-router is mocked globally in jest.setup.js.

import SubscriptionsScreen from "../../../app/budgeting/subscriptions";

function bill(over: Partial<BillItem> = {}): BillItem {
  return {
    id: "b1",
    merchant: "Netflix",
    amount: 15.99,
    dueDate: "2026-09-01T00:00:00.000Z",
    category: "streaming",
    isAutoPay: true,
    frequency: "monthly",
    ...over,
  };
}

function ok(bills: BillItem[]) {
  return { success: true, data: { bills } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBills.mockResolvedValue(ok([bill()]));
});

describe("monthlyCost", () => {
  it.each([
    ["weekly", 10, (10 * 52) / 12],
    ["biweekly", 10, (10 * 26) / 12],
    ["monthly", 10, 10],
    ["quarterly", 30, 10],
    ["yearly", 120, 10],
  ])("normalises a %s bill", (frequency, amount, expected) => {
    expect(monthlyCost(bill({ frequency, amount }))).toBeCloseTo(expected, 6);
  });

  it.each(["", "fortnightly", "daily"])(
    "returns null for the unrecognised cadence %j",
    (frequency) => {
      // Assuming monthly here would put a yearly charge into a monthly total
      // at twelve times its real weight.
      expect(monthlyCost(bill({ frequency }))).toBeNull();
    },
  );
});

describe("budgeting/subscriptions", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<SubscriptionsScreen />);
    await waitFor(() => expect(mockGetBills).toHaveBeenCalledTimes(1));
  });

  it("shows only bills categorised as a subscription", async () => {
    mockGetBills.mockResolvedValue(
      ok([
        bill({ id: "a", merchant: "Netflix", category: "streaming" }),
        bill({ id: "b", merchant: "Adobe", category: "subscription" }),
        bill({ id: "c", merchant: "Pacific Gas", category: "utilities" }),
        bill({ id: "d", merchant: "Landlord", category: "rent" }),
      ]),
    );
    render(<SubscriptionsScreen />);

    expect(await screen.findByText("Netflix")).toBeTruthy();
    expect(screen.getByText("Adobe")).toBeTruthy();
    expect(screen.queryByText("Pacific Gas")).toBeNull();
    expect(screen.queryByText("Landlord")).toBeNull();
  });

  it("builds the category chips from the user's own data", async () => {
    // The invented chips could never have matched a real bill.
    mockGetBills.mockResolvedValue(
      ok([bill({ id: "a", category: "streaming" })]),
    );
    render(<SubscriptionsScreen />);

    await waitFor(() => expect(mockGetBills).toHaveBeenCalled());
    expect(screen.getByText("Streaming")).toBeTruthy();
    for (const invented of ["Entertainment", "Software", "Fitness", "Cloud"]) {
      expect(screen.queryByText(invented)).toBeNull();
    }
  });

  describe("monthly total", () => {
    it("converts a yearly subscription to its monthly share", async () => {
      mockGetBills.mockResolvedValue(
        ok([
          bill({ id: "a", amount: 10, frequency: "monthly" }),
          bill({ id: "b", amount: 120, frequency: "yearly" }),
        ]),
      );
      render(<SubscriptionsScreen />);
      // 10 + 120/12 = 20 a month, 240 a year.
      expect(await screen.findByText("$20.00")).toBeTruthy();
      expect(screen.getByText("$240.00")).toBeTruthy();
    });

    it("excludes an unknown cadence and says how many", async () => {
      mockGetBills.mockResolvedValue(
        ok([
          bill({ id: "a", amount: 10, frequency: "monthly" }),
          bill({ id: "b", amount: 500, frequency: "" }),
        ]),
      );
      render(<SubscriptionsScreen />);

      // Assert on the ANNUAL figure: it is unique on the screen, whereas
      // "$10.00" is both the monthly total and the monthly bill's own cost.
      // $500 excluded -> 10/mo -> $120.00 a year, not $6,120.00.
      expect(await screen.findByText("$120.00")).toBeTruthy();
      expect(screen.queryByText("$6,120.00")).toBeNull();
      expect(
        screen.getByText(/1 subscription has an unknown billing cycle/i),
      ).toBeTruthy();
    });

    it("says nothing about exclusions when every cadence is known", async () => {
      render(<SubscriptionsScreen />);
      await waitFor(() => expect(mockGetBills).toHaveBeenCalled());
      expect(screen.queryByText(/unknown billing cycle/i)).toBeNull();
    });
  });

  it("no longer offers a Cancel button that cancels nothing", async () => {
    // Neither Manage nor Cancel had a route or a handler. A control that looks
    // like it stops a payment and does not is worse than no control.
    render(<SubscriptionsScreen />);
    await waitFor(() => expect(mockGetBills).toHaveBeenCalled());
    expect(screen.queryByText("Cancel")).toBeNull();
    expect(screen.queryByText("Manage")).toBeNull();
  });

  describe("honest states", () => {
    it("shows a loading state before the response lands", () => {
      mockGetBills.mockReturnValue(new Promise(() => {}));
      render(<SubscriptionsScreen />);
      expect(screen.getByText(/Loading your subscriptions/i)).toBeTruthy();
    });

    it("distinguishes a failed load from having none, and retries", async () => {
      mockGetBills.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<SubscriptionsScreen />);

      expect(
        await screen.findByText(/could not load your subscriptions/i),
      ).toBeTruthy();
      expect(screen.queryByText(/No subscriptions detected yet/i)).toBeNull();

      mockGetBills.mockResolvedValue(ok([bill()]));
      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetBills).toHaveBeenCalledTimes(2));
    });

    it("explains how detection works when there are none", async () => {
      mockGetBills.mockResolvedValue(ok([]));
      render(<SubscriptionsScreen />);
      expect(
        await screen.findByText(/No subscriptions detected yet/i),
      ).toBeTruthy();
    });
  });
});
