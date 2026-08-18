/**
 * financial/income — real sources, and nothing about tax.
 *
 * The screen invented the user's earnings (Primary Job 4800/month), a
 * `taxWithheld` per source, and six months of gross/net history
 * (Jul 6800/5200 through Dec 6950/5300).
 *
 * WHAT THE SERVER HAS. GET /api/financial/income returns `{ sources, stats }`.
 * An IncomeSource is `{ id, name, amount, frequency, nextPayDate, category,
 * isAutoDetected }` (income-tracking-service.ts:16-29). There is NO
 * taxWithheld, and nothing stores a monthly history.
 *
 * So gross is real; taxes, net, the effective rate, the annual tax estimate
 * and the six-month trend all derived from the invented withholding. They are
 * gone rather than estimated — a withholding figure the user did not give us
 * is a claim about their payslip.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockGetIncome = jest.fn();
jest.mock("../../services/api/financial", () => ({
  incomeApi: { get: (...a: unknown[]) => mockGetIncome(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import IncomeScreen from "../../../app/financial/income";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetIncome.mockResolvedValue({
    success: true,
    data: {
      sources: [
        {
          id: "s1",
          name: "Acme Payroll",
          amount: 3200,
          frequency: "monthly",
          category: "salary",
        },
        // No category — the field is optional on the server and often absent.
        { id: "s2", name: "Side work", amount: 800, frequency: "monthly" },
      ],
      stats: { totalMonthlyIncome: 4000 },
    },
  });
});

describe("financial/income", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<IncomeScreen />);
    await waitFor(() => expect(mockGetIncome).toHaveBeenCalled());
  });

  it("never shows the invented earnings again", async () => {
    render(<IncomeScreen />);
    await waitFor(() => expect(mockGetIncome).toHaveBeenCalled());
    expect(screen.queryByText("Primary Job")).toBeNull();
    expect(screen.queryByText(/6,800/)).toBeNull();
    expect(screen.queryByText(/5,200/)).toBeNull();
  });

  it("shows the real sources", async () => {
    render(<IncomeScreen />);
    expect(await screen.findByText("Acme Payroll")).toBeTruthy();
    expect(screen.getByText("Side work")).toBeTruthy();
  });

  it("uses the server's monthly total rather than re-summing", async () => {
    // Sources can carry different frequencies; getMonthlyIncomeStats already
    // normalises them, so re-adding `amount` here would be a second, wronger
    // calculation.
    render(<IncomeScreen />);
    expect(await screen.findByText("$4,000")).toBeTruthy();
  });

  it("renders a source with no category without inventing one", async () => {
    // `category` is optional. The old screen keyed colour and icon off a
    // required `type`, so an absent value would have rendered undefined.
    render(<IncomeScreen />);
    expect(await screen.findByText("Side work")).toBeTruthy();
    expect(screen.queryByText("undefined")).toBeNull();
  });

  describe("what is no longer claimed", () => {
    it("shows no tax, net or effective rate", async () => {
      // All three came from a per-source taxWithheld the server does not have.
      render(<IncomeScreen />);
      await waitFor(() => expect(mockGetIncome).toHaveBeenCalled());
      expect(screen.queryByText("Net")).toBeNull();
      expect(screen.queryByText(/Effective Tax Rate/i)).toBeNull();
      expect(screen.queryByText(/Estimated Federal Tax/i)).toBeNull();
      expect(screen.queryByText(/Estimated Take-Home/i)).toBeNull();
    });

    it("says take-home is not tracked, rather than omitting it silently", async () => {
      // Absent reads as "not applicable"; stated reads as "we do not know".
      render(<IncomeScreen />);
      expect(
        await screen.findByText(/Take-home pay and withholding are not tracked/i),
      ).toBeTruthy();
    });

    it("says there is no income history, rather than charting one", async () => {
      render(<IncomeScreen />);
      expect(await screen.findByText(/Income over time/i)).toBeTruthy();
      expect(screen.getByText(/no history of what you actually received/i)).toBeTruthy();
      expect(screen.queryByText("6-Month Trend")).toBeNull();
    });
  });

  describe("honest states", () => {
    it("distinguishes a failed read from having no income", async () => {
      mockGetIncome.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<IncomeScreen />);
      expect(await screen.findByText(/could not load your income/i)).toBeTruthy();
      expect(screen.queryByText(/No income sources recorded/i)).toBeNull();
    });

    it("retries on demand", async () => {
      mockGetIncome.mockResolvedValueOnce({
        success: false,
        error: { message: "boom" },
      });
      render(<IncomeScreen />);
      await screen.findByText(/could not load your income/i);

      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetIncome).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Acme Payroll")).toBeTruthy();
    });

    it("says so when nothing is recorded", async () => {
      mockGetIncome.mockResolvedValue({
        success: true,
        data: { sources: [], stats: { totalMonthlyIncome: 0 } },
      });
      render(<IncomeScreen />);
      expect(
        await screen.findByText(/No income sources recorded yet/i),
      ).toBeTruthy();
    });

    it("shows no percentage share when the total is zero", async () => {
      // percent would be amount/0 -> Infinity, rendered as "Infinity% of income".
      mockGetIncome.mockResolvedValue({
        success: true,
        data: {
          sources: [{ id: "s1", name: "Odd job", amount: 50, frequency: "monthly" }],
          stats: { totalMonthlyIncome: 0 },
        },
      });
      render(<IncomeScreen />);
      await screen.findByText("Odd job");
      expect(screen.queryByText(/Infinity/)).toBeNull();
      expect(screen.queryByText(/% of income/)).toBeNull();
    });
  });
});
