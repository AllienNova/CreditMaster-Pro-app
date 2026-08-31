/**
 * financial/transactions — real spending, and a breakdown that agrees with it.
 *
 * The screen carried a TRANSACTIONS array (Amazon -89.99, ...) and a SEPARATE
 * SPENDING_BY_CATEGORY constant (Shopping 168.31 at 28%). Two independent
 * fabrications of the same thing, which is why they did not have to agree —
 * and did not.
 *
 * The local `Transaction` interface also disagreed with the server's on two
 * field names (`name` vs `merchantName`, `account` vs `accountId`), so nothing
 * could typecheck the screen against what the route returns.
 *
 * The breakdown is now COMPUTED FROM THE SAME ROWS the list renders, so the
 * chart and the list cannot drift apart.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockGetAll = jest.fn();
jest.mock("../../services/api/financial", () => ({
  transactionApi: { getAll: (...a: unknown[]) => mockGetAll(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import TransactionsScreen from "../../../app/financial/transactions";

/** Exactly the server's Transaction shape (types.ts:227-236). */
function tx(over: Record<string, unknown> = {}) {
  return {
    id: "t1",
    accountId: "a1",
    amount: -50,
    category: "Groceries",
    merchantName: "Corner Shop",
    // The 1st at 00:00 UTC: the label must not slide a day west of UTC.
    date: "2026-08-01T00:00:00.000Z",
    pending: false,
    type: "expense",
    ...over,
  };
}

function page(items: ReturnType<typeof tx>[]) {
  return {
    success: true,
    data: { items, total: items.length, page: 1, pageSize: 100, hasMore: false },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAll.mockResolvedValue(
    page([
      tx({ id: "t1", merchantName: "Corner Shop", amount: -75, category: "Groceries" }),
      tx({ id: "t2", merchantName: "Bus Pass", amount: -25, category: "Transport" }),
      tx({ id: "t3", merchantName: "Payroll", amount: 2000, category: "Income", type: "income" }),
    ]),
  );
});

describe("financial/transactions", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<TransactionsScreen />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
  });

  it("never shows the invented spending again", async () => {
    render(<TransactionsScreen />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    expect(screen.queryByText("Amazon")).toBeNull();
    expect(screen.queryByText(/168\.31/)).toBeNull();
  });

  it("renders merchantName, which is the field the server sends", async () => {
    // The local type called it `name`. Reading the wrong field renders blank.
    render(<TransactionsScreen />);
    expect(await screen.findByText("Corner Shop")).toBeTruthy();
    expect(screen.getByText("Bus Pass")).toBeTruthy();
  });

  it("formats the real date in UTC rather than saying Today", async () => {
    // The fixture used "Today"/"Yesterday", which no payload carries.
    render(<TransactionsScreen />);
    // All three fixtures share the date, so assert the count rather than a
    // single node.
    await waitFor(() =>
      expect(screen.getAllByText("Aug 1").length).toBeGreaterThan(0),
    );
    expect(screen.queryByText("Today")).toBeNull();
  });

  describe("the category breakdown", () => {
    it("counts only expenses, not income", async () => {
      // A 2000 salary in the denominator would make "75% of spending" a share
      // of something that is not spending.
      render(<TransactionsScreen />);
      await screen.findByText("Corner Shop");

      // The chart renders percent as a BAR HEIGHT (percent * 2), never as
      // text, so measure the bar. 75 of 100 spent -> 150; 25 of 100 -> 50.
      // Income is excluded from the denominator entirely.
      const { StyleSheet } = require("react-native");
      const height = (category: string) =>
        StyleSheet.flatten(
          screen.getByTestId(`spend-bar-${category}`).props.style,
        )?.height;

      expect(height("Groceries")).toBe(150);
      expect(height("Transport")).toBe(50);
      expect(screen.queryByTestId("spend-bar-Income")).toBeNull();
    });

    it("agrees with the list, because it is computed from the same rows", async () => {
      // The two used to be independent constants.
      mockGetAll.mockResolvedValue(
        page([tx({ id: "t1", merchantName: "Only One", amount: -40, category: "Books" })]),
      );
      render(<TransactionsScreen />);
      expect(await screen.findByText("Only One")).toBeTruthy();
      const { StyleSheet } = require("react-native");
      // One expense = 100% of spending -> a full-height bar.
      expect(
        StyleSheet.flatten(screen.getByTestId("spend-bar-Books").props.style)
          ?.height,
      ).toBe(200);
    });

    it("shows nothing when there is no spending to divide by", async () => {
      // total === 0 would make every percentage 0/0 -> NaN.
      mockGetAll.mockResolvedValue(
        page([tx({ id: "t1", merchantName: "Payroll", amount: 500, category: "Income", type: "income" })]),
      );
      render(<TransactionsScreen />);
      await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
      expect(screen.queryByText(/NaN/)).toBeNull();
      // No bars at all, so no NaN heights to render.
      expect(screen.queryByTestId("spend-bar-Income")).toBeNull();
    });
  });

  describe("filters", () => {
    it("offers only categories the user actually has", async () => {
      // A chip for a category they have never spent in filters to an empty
      // screen and looks broken.
      render(<TransactionsScreen />);
      await screen.findByText("Corner Shop");
      expect(screen.getByText("All")).toBeTruthy();
      expect(screen.queryByText("Entertainment")).toBeNull();
    });

    it("says a filter matched nothing, distinctly from having no data", async () => {
      render(<TransactionsScreen />);
      await screen.findByText("Corner Shop");

      // "Transport" appears three times: a chart label, a filter chip and the
      // row's category. The chart renders FIRST, so getAllByText(...)[0] was
      // pressing a plain Text and nothing happened. Target the chip directly.
      fireEvent.press(screen.getByTestId("filter-chip-Transport"));
      await waitFor(() => expect(screen.queryByText("Corner Shop")).toBeNull());
      expect(screen.getByText("Bus Pass")).toBeTruthy();
    });
  });

  describe("honest states", () => {
    it("distinguishes a failed read from an empty ledger", async () => {
      mockGetAll.mockResolvedValue({ success: false, error: { message: "boom" } });
      render(<TransactionsScreen />);
      expect(
        await screen.findByText(/could not load your transactions/i),
      ).toBeTruthy();
      expect(screen.queryByText(/No transactions yet/i)).toBeNull();
    });

    it("retries on demand", async () => {
      mockGetAll.mockResolvedValueOnce({ success: false, error: { message: "boom" } });
      render(<TransactionsScreen />);
      await screen.findByText(/could not load your transactions/i);

      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Corner Shop")).toBeTruthy();
    });

    it("says so when nothing is linked", async () => {
      mockGetAll.mockResolvedValue(page([]));
      render(<TransactionsScreen />);
      expect(await screen.findByText(/No transactions yet/i)).toBeTruthy();
    });
  });
});
