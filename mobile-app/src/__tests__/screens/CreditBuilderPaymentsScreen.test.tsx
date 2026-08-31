/**
 * credit-builder/payments — real-data wiring.
 *
 * The screen rendered a MOCK_PAYMENTS array to every user: a Chase Freedom
 * payment, a Capital One payment, and a Discover payment five days LATE,
 * summed into an on-time rate. It made no request. Telling someone they have a
 * late payment they do not have is the same class of harm as hiding one — it
 * is the exact data a user would open a dispute over.
 *
 * It now reads GET /api/credit-builder/rent-payments, the payments Fynvita
 * actually reports to the bureaus. That route did not exist: rent reporting is
 * a marketed feature that had tables and a full service and no way in.
 *
 * The subtle one these tests pin is the on-time rate. It used to end in
 * `|| 100`, so a user with nothing tracked was shown a perfect 100% record —
 * a fabricated compliment, and the last place anyone would look for a bug.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type {
  RentPayment,
  RentReportingAccount,
} from "../../services/api/credit";

const mockGetPayments = jest.fn();

jest.mock("../../services/api/credit", () => ({
  rentReportingApi: {
    getPayments: (...args: unknown[]) => mockGetPayments(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import PaymentsScreen from "../../../app/credit-builder/payments";

const ACCOUNT: RentReportingAccount = {
  id: "acct-1",
  provider: "rentreporters",
  status: "active",
  landlordName: "Ada Property Co",
  propertyAddress: "12 Bridge St",
  monthlyRent: 1450,
};

function payment(over: Partial<RentPayment> = {}): RentPayment {
  return {
    id: "pay-1",
    accountId: "acct-1",
    userId: "user-1",
    amount: 1450,
    dueDate: "2026-07-01T00:00:00.000Z",
    paidDate: "2026-06-30T00:00:00.000Z",
    status: "on_time",
    reportedToCredit: true,
    bureausReported: ["experian"],
    createdAt: "2026-06-30T00:00:00.000Z",
    ...over,
  };
}

function ok(payments: RentPayment[], accounts: RentReportingAccount[] = [ACCOUNT]) {
  return { success: true, data: { payments, accounts } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPayments.mockResolvedValue(ok([payment()]));
});

describe("credit-builder/payments", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<PaymentsScreen />);
    await waitFor(() => expect(mockGetPayments).toHaveBeenCalledTimes(1));
  });

  it("never shows the invented accounts again", async () => {
    render(<PaymentsScreen />);
    await waitFor(() => expect(mockGetPayments).toHaveBeenCalled());
    expect(screen.queryByText("Chase Freedom")).toBeNull();
    expect(screen.queryByText("Capital One")).toBeNull();
    expect(screen.queryByText("Discover It")).toBeNull();
  });

  it("labels each payment with the property it was for", async () => {
    // rent_payments carries account_id, not a display name; the property comes
    // from the accounts in the same response.
    render(<PaymentsScreen />);
    expect(await screen.findByText("12 Bridge St")).toBeTruthy();
  });

  describe("on-time rate", () => {
    it("is computed from settled payments", async () => {
      mockGetPayments.mockResolvedValue(
        ok([
          payment({ id: "a", status: "on_time" }),
          payment({ id: "b", status: "on_time" }),
          payment({ id: "c", status: "late", paidDate: "2026-07-06T00:00:00.000Z" }),
        ]),
      );
      render(<PaymentsScreen />);
      // 2 on time of 3 settled.
      expect(await screen.findByText("67%")).toBeTruthy();
    });

    it("shows no rate at all when nothing has settled", async () => {
      // The old code's `|| 100` congratulated a user who had never had a
      // payment reported.
      mockGetPayments.mockResolvedValue(ok([]));
      render(<PaymentsScreen />);
      await waitFor(() => expect(mockGetPayments).toHaveBeenCalled());
      expect(screen.getByText("—")).toBeTruthy();
      expect(screen.queryByText("100%")).toBeNull();
    });

    it("counts a MISSED payment against the rate, not just a late one", async () => {
      // missed is the worst outcome rent_payments records. Counting only
      // "late" would show a user with one on-time and one missed payment a
      // perfect 100% record — the same fabricated compliment the `|| 100`
      // fallback produced, arrived at from the other direction.
      mockGetPayments.mockResolvedValue(
        ok([
          payment({ id: "a", status: "on_time" }),
          payment({ id: "b", status: "missed", paidDate: undefined }),
        ]),
      );
      render(<PaymentsScreen />);
      expect(await screen.findByText("50%")).toBeTruthy();
      expect(screen.queryByText("100%")).toBeNull();
    });

    it("ignores pending payments, which have not settled either way", async () => {
      mockGetPayments.mockResolvedValue(
        ok([
          payment({ id: "a", status: "on_time" }),
          payment({ id: "b", status: "pending", paidDate: undefined }),
        ]),
      );
      render(<PaymentsScreen />);
      expect(await screen.findByText("100%")).toBeTruthy();
    });
  });

  it("derives days late from the two real dates", async () => {
    // The old fixture carried a daysLate field. rent_payments has no such
    // column — only due_date and paid_date.
    mockGetPayments.mockResolvedValue(
      ok([
        payment({
          status: "late",
          dueDate: "2026-07-01T00:00:00.000Z",
          paidDate: "2026-07-06T00:00:00.000Z",
        }),
      ]),
    );
    render(<PaymentsScreen />);
    expect(await screen.findByText("5 days late")).toBeTruthy();
  });

  it("says when a payment has not reached the bureaus yet", async () => {
    // Tracked is not the same as reported: an unreported payment has not
    // affected the score, and the old screen had no way to say so.
    mockGetPayments.mockResolvedValue(
      ok([payment({ reportedToCredit: false })]),
    );
    render(<PaymentsScreen />);
    expect(await screen.findByText("Not yet reported")).toBeTruthy();
  });

  describe("honest states", () => {
    it("shows a loading state before the response lands", () => {
      mockGetPayments.mockReturnValue(new Promise(() => {}));
      render(<PaymentsScreen />);
      expect(screen.getByText(/Loading your payment history/i)).toBeTruthy();
    });

    it("distinguishes a failed load from an empty history, and retries", async () => {
      mockGetPayments.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<PaymentsScreen />);

      expect(
        await screen.findByText(/could not load your payment history/i),
      ).toBeTruthy();
      // Not the empty-state copy: the two lead to opposite actions.
      expect(screen.queryByText(/No payments are being reported yet/i)).toBeNull();

      mockGetPayments.mockResolvedValue(ok([payment()]));
      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetPayments).toHaveBeenCalledTimes(2));
    });

    it("explains what rent reporting is when nothing is tracked", async () => {
      mockGetPayments.mockResolvedValue(ok([], []));
      render(<PaymentsScreen />);
      expect(
        await screen.findByText(/No payments are being reported yet/i),
      ).toBeTruthy();
    });
  });

  it("filters by a status the database can actually hold", async () => {
    // "upcoming" was in the old vocabulary and is not one of the five values
    // rent_payments.status permits; a payment not yet due is `pending`.
    mockGetPayments.mockResolvedValue(
      ok([
        payment({ id: "a", status: "on_time" }),
        payment({ id: "b", status: "pending", paidDate: undefined }),
      ]),
    );
    render(<PaymentsScreen />);
    await waitFor(() => expect(mockGetPayments).toHaveBeenCalled());

    expect(screen.queryByText("Upcoming")).toBeNull();

    // "Pending" appears twice by design — once as the stats-grid label above
    // the count, once as the filter chip. The chip is rendered after the
    // stats card, so it is the last match.
    const pendingLabels = screen.getAllByText("Pending");
    fireEvent.press(pendingLabels[pendingLabels.length - 1]);

    await waitFor(() => expect(screen.queryByText("Paid")).toBeNull());
    expect(screen.getByText("Due")).toBeTruthy();
  });
});
