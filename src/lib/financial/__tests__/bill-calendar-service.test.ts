/**
 * @jest-environment node
 */

/**
 * Bill Calendar Service Unit Tests
 *
 * Tests for bill CRUD, calendar views, payment recording, summary
 * aggregation, and reminder management.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import that triggers module load
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

function supabase() {
  return require("@/lib/supabase/client").getSupabase();
}

// Chain mock — every method returns the same object so any Supabase chain works
function chainMock(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "is",
    "in",
    "order",
    "limit",
    "gte",
    "lte",
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  // Thenable for awaiting without .single()
  obj.then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) => Promise.resolve(result).then(resolve, reject);
  return obj;
}

function mockFrom(result: { data: unknown; error: unknown }) {
  const mock = chainMock(result);
  (supabase().from as jest.Mock).mockReturnValue(mock);
  return mock;
}

/**
 * Returns separate chain mocks for sequential `supabase.from()` calls.
 * E.g. first call resolves with resultA, second with resultB, etc.
 */
function mockFromSequence(
  ...results: Array<{ data: unknown; error: unknown }>
) {
  const mocks = results.map((r) => chainMock(r));
  const fromMock = supabase().from as jest.Mock;
  for (let i = 0; i < mocks.length; i++) {
    fromMock.mockReturnValueOnce(mocks[i]);
  }
  return mocks;
}

// ---------------------------------------------------------------------------
// Helpers — row factories
// ---------------------------------------------------------------------------

const NOW = "2026-02-15T12:00:00.000Z";
const USER_ID = "user-1";
const BILL_ID = "bill-1";

function billRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BILL_ID,
    user_id: USER_ID,
    name: "Netflix",
    payee: "Netflix Inc",
    amount: 15.99,
    category: "streaming",
    frequency: "monthly",
    due_day: 15,
    next_due_date: "2026-03-15T00:00:00.000Z",
    autopay_enabled: false,
    autopay_account_id: null,
    reminder_days_before: 3,
    reminder_types: ["in_app"],
    notes: null,
    website_url: null,
    account_number: null,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    bill_id: BILL_ID,
    user_id: USER_ID,
    amount: 15.99,
    paid_date: "2026-02-15T00:00:00.000Z",
    due_date: "2026-02-15T00:00:00.000Z",
    status: "paid",
    payment_method: null,
    confirmation_number: null,
    notes: null,
    created_at: NOW,
    ...overrides,
  };
}

function reminderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "reminder-1",
    bill_id: BILL_ID,
    user_id: USER_ID,
    reminder_date: "2026-02-12T00:00:00.000Z",
    reminder_type: "in_app",
    sent: false,
    sent_at: null,
    created_at: NOW,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import the service AFTER mocks are in place
// ---------------------------------------------------------------------------

import { BillCalendarService } from "../bill-calendar-service";

let service: BillCalendarService;

beforeEach(() => {
  service = new BillCalendarService();
});

// ===========================================================================
// createBill
// ===========================================================================

describe("createBill", () => {
  const input = {
    userId: USER_ID,
    name: "Netflix",
    payee: "Netflix Inc",
    amount: 15.99,
    category: "streaming" as const,
    frequency: "monthly" as const,
    dueDay: 15,
    nextDueDate: new Date("2026-03-15T00:00:00.000Z"),
  };

  it("should create a bill and return mapped result", async () => {
    const row = billRow();
    // createBill calls from("bills").insert + from("bill_reminders").insert
    mockFromSequence(
      { data: row, error: null },
      { data: null, error: null },
    );

    const result = await service.createBill(input);

    expect(result.id).toBe(BILL_ID);
    expect(result.name).toBe("Netflix");
    expect(result.amount).toBe(15.99);
    expect(result.userId).toBe(USER_ID);
    expect(result.isActive).toBe(true);
  });

  it("should use default reminderDaysBefore=3 and reminderTypes=[in_app]", async () => {
    const row = billRow();
    const mocks = mockFromSequence(
      { data: row, error: null },
      { data: null, error: null },
    );

    await service.createBill(input);

    // Check insert was called on bills table
    expect(supabase().from).toHaveBeenCalledWith("bills");
    const insertCall = (mocks[0].insert as jest.Mock).mock.calls[0][0];
    expect(insertCall.reminder_days_before).toBe(3);
    expect(insertCall.reminder_types).toEqual(["in_app"]);
  });

  it("should use provided optional fields", async () => {
    const row = billRow({
      autopay_enabled: true,
      autopay_account_id: "acct-1",
      reminder_days_before: 7,
      reminder_types: ["email", "push"],
      notes: "Family plan",
      website_url: "https://netflix.com",
      account_number: "NFLX-123",
    });
    const mocks = mockFromSequence(
      { data: row, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    const result = await service.createBill({
      ...input,
      autopayEnabled: true,
      autopayAccountId: "acct-1",
      reminderDaysBefore: 7,
      reminderTypes: ["email", "push"],
      notes: "Family plan",
      websiteUrl: "https://netflix.com",
      accountNumber: "NFLX-123",
    });

    const insertCall = (mocks[0].insert as jest.Mock).mock.calls[0][0];
    expect(insertCall.autopay_enabled).toBe(true);
    expect(insertCall.autopay_account_id).toBe("acct-1");
    expect(result.notes).toBe("Family plan");
  });

  it("should throw on supabase error", async () => {
    mockFrom({ data: null, error: { message: "DB down" } });

    await expect(service.createBill(input)).rejects.toThrow(
      "Failed to create bill: DB down",
    );
  });

  it("should throw when data is null", async () => {
    mockFrom({ data: null, error: null });

    await expect(service.createBill(input)).rejects.toThrow(
      "Failed to create bill",
    );
  });
});

// ===========================================================================
// getBillById
// ===========================================================================

describe("getBillById", () => {
  it("should return a mapped bill when found", async () => {
    mockFrom({ data: billRow(), error: null });

    const result = await service.getBillById(BILL_ID, USER_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(BILL_ID);
    expect(result!.name).toBe("Netflix");
    expect(result!.nextDueDate).toBeInstanceOf(Date);
  });

  it("should return null when not found", async () => {
    mockFrom({ data: null, error: { message: "Not found" } });

    const result = await service.getBillById("no-exist", USER_ID);

    expect(result).toBeNull();
  });

  it("should return null when data is null (no error)", async () => {
    mockFrom({ data: null, error: null });

    const result = await service.getBillById(BILL_ID, USER_ID);

    expect(result).toBeNull();
  });
});

// ===========================================================================
// getBillsByUser
// ===========================================================================

describe("getBillsByUser", () => {
  it("should return mapped bills for user", async () => {
    const mock = chainMock({
      data: [billRow(), billRow({ id: "bill-2", name: "Spotify" })],
      error: null,
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getBillsByUser(USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(BILL_ID);
    expect(result[1].name).toBe("Spotify");
  });

  it("should filter by active only by default", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await service.getBillsByUser(USER_ID);

    // eq should be called with is_active, true
    const eqCalls = (mock.eq as jest.Mock).mock.calls;
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        ["user_id", USER_ID],
        ["is_active", true],
      ]),
    );
  });

  it("should skip active filter when activeOnly is false", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await service.getBillsByUser(USER_ID, { activeOnly: false });

    // Only user_id eq, not is_active eq
    const eqCalls = (mock.eq as jest.Mock).mock.calls;
    const activeCall = eqCalls.find(
      (c: unknown[]) => c[0] === "is_active",
    );
    expect(activeCall).toBeUndefined();
  });

  it("should filter by category when provided", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await service.getBillsByUser(USER_ID, { category: "streaming" });

    const eqCalls = (mock.eq as jest.Mock).mock.calls;
    expect(eqCalls).toEqual(
      expect.arrayContaining([["category", "streaming"]]),
    );
  });

  it("should throw on supabase error", async () => {
    const mock = chainMock({ data: null, error: { message: "Failed" } });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await expect(service.getBillsByUser(USER_ID)).rejects.toThrow(
      "Failed to fetch bills: Failed",
    );
  });

  it("should return empty array when data is null", async () => {
    const mock = chainMock({ data: null, error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getBillsByUser(USER_ID);

    expect(result).toEqual([]);
  });
});

// ===========================================================================
// updateBill
// ===========================================================================

describe("updateBill", () => {
  it("should update a bill and return mapped result", async () => {
    const updated = billRow({ amount: 19.99 });
    mockFrom({ data: updated, error: null });

    const result = await service.updateBill(BILL_ID, USER_ID, {
      amount: 19.99,
    });

    expect(result.amount).toBe(19.99);
  });

  it("should map all update fields to DB columns", async () => {
    const mock = mockFrom({ data: billRow(), error: null });

    await service.updateBill(BILL_ID, USER_ID, {
      name: "Netflix Premium",
      payee: "Netflix Inc.",
      amount: 22.99,
      category: "streaming",
      frequency: "monthly",
      dueDay: 20,
      nextDueDate: new Date("2026-04-20"),
      autopayEnabled: true,
      autopayAccountId: "acct-2",
      reminderDaysBefore: 5,
      reminderTypes: ["email"],
      notes: "Upgraded",
      websiteUrl: "https://netflix.com",
      accountNumber: "NF-456",
      isActive: false,
    });

    const updateCall = (mock.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.name).toBe("Netflix Premium");
    expect(updateCall.payee).toBe("Netflix Inc.");
    expect(updateCall.amount).toBe(22.99);
    expect(updateCall.category).toBe("streaming");
    expect(updateCall.frequency).toBe("monthly");
    expect(updateCall.due_day).toBe(20);
    expect(updateCall.autopay_enabled).toBe(true);
    expect(updateCall.autopay_account_id).toBe("acct-2");
    expect(updateCall.reminder_days_before).toBe(5);
    expect(updateCall.reminder_types).toEqual(["email"]);
    expect(updateCall.notes).toBe("Upgraded");
    expect(updateCall.website_url).toBe("https://netflix.com");
    expect(updateCall.account_number).toBe("NF-456");
    expect(updateCall.is_active).toBe(false);
    expect(updateCall.updated_at).toBeDefined();
  });

  it("should throw on supabase error", async () => {
    mockFrom({ data: null, error: { message: "update err" } });

    await expect(
      service.updateBill(BILL_ID, USER_ID, { amount: 5 }),
    ).rejects.toThrow("Failed to update bill: update err");
  });

  it("should throw when data is null", async () => {
    mockFrom({ data: null, error: null });

    await expect(
      service.updateBill(BILL_ID, USER_ID, { amount: 5 }),
    ).rejects.toThrow("Failed to update bill");
  });
});

// ===========================================================================
// deleteBill
// ===========================================================================

describe("deleteBill", () => {
  it("should delete a bill and return true", async () => {
    const mock = chainMock({ data: null, error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);
    // delete chain doesn't call .single() — it resolves via then
    const result = await service.deleteBill(BILL_ID, USER_ID);

    expect(result).toBe(true);
    expect(supabase().from).toHaveBeenCalledWith("bills");
  });

  it("should throw on supabase error", async () => {
    const mock = chainMock({ data: null, error: { message: "FK violation" } });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await expect(service.deleteBill(BILL_ID, USER_ID)).rejects.toThrow(
      "Failed to delete bill: FK violation",
    );
  });
});

// ===========================================================================
// getMonthCalendar
// ===========================================================================

describe("getMonthCalendar", () => {
  // Use local-time dates so isSameDay() comparisons work in any timezone.
  // new Date(year, month, day) produces local time; toISOString() converts to UTC.
  const march15Local = new Date(2026, 2, 15).toISOString();

  it("should return calendar days for a month", async () => {
    // getMonthCalendar calls getBillsByUser (from("bills")) + getPaymentsForPeriod (from("bill_payments"))
    const billsDue15 = billRow({ next_due_date: march15Local });
    const billsChain = chainMock({ data: [billsDue15], error: null });
    const paymentsChain = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(billsChain)
      .mockReturnValueOnce(paymentsChain);

    const result = await service.getMonthCalendar(USER_ID, 2026, 2); // March (0-indexed)

    expect(result).toHaveLength(31); // March has 31 days
    // Day 15 should have the bill
    const day15 = result[14]; // 0-indexed
    expect(day15.bills).toHaveLength(1);
    expect(day15.bills[0].name).toBe("Netflix");
  });

  it("should mark paid bills as paid status", async () => {
    const billsDue15 = billRow({
      id: "bill-1",
      next_due_date: march15Local,
    });
    const payment = paymentRow({
      bill_id: "bill-1",
      due_date: march15Local,
    });
    const billsChain = chainMock({ data: [billsDue15], error: null });
    const paymentsChain = chainMock({ data: [payment], error: null });
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(billsChain)
      .mockReturnValueOnce(paymentsChain);

    const result = await service.getMonthCalendar(USER_ID, 2026, 2);

    const day15 = result[14];
    expect(day15.bills[0].status).toBe("paid");
    expect(day15.totalDue).toBe(0); // paid bills don't count
  });

  it("should return empty bills for days without due bills", async () => {
    const billsChain = chainMock({ data: [], error: null });
    const paymentsChain = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(billsChain)
      .mockReturnValueOnce(paymentsChain);

    const result = await service.getMonthCalendar(USER_ID, 2026, 0); // January

    expect(result).toHaveLength(31);
    for (const day of result) {
      expect(day.bills).toHaveLength(0);
      expect(day.totalDue).toBe(0);
    }
  });

  it("should handle February correctly (28/29 days)", async () => {
    const billsChain = chainMock({ data: [], error: null });
    const paymentsChain = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(billsChain)
      .mockReturnValueOnce(paymentsChain);

    const result = await service.getMonthCalendar(USER_ID, 2026, 1); // February 2026

    expect(result).toHaveLength(28); // 2026 is not a leap year
  });
});

// ===========================================================================
// getUpcomingBills
// ===========================================================================

describe("getUpcomingBills", () => {
  it("should return bills due within default 30 days", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inTenDays = new Date(today);
    inTenDays.setDate(inTenDays.getDate() + 10);

    const upcoming = billRow({
      next_due_date: inTenDays.toISOString(),
    });
    const mock = chainMock({ data: [upcoming], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getUpcomingBills(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("pending");
    expect(result[0].isPastDue).toBe(false);
    expect(result[0].daysUntilDue).toBeGreaterThan(0);
  });

  it("should exclude bills due after the window", async () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 100);

    const mock = chainMock({
      data: [billRow({ next_due_date: farFuture.toISOString() })],
      error: null,
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getUpcomingBills(USER_ID, 7);

    expect(result).toHaveLength(0);
  });

  it("should exclude overdue bills (before today)", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const mock = chainMock({
      data: [billRow({ next_due_date: yesterday.toISOString() })],
      error: null,
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getUpcomingBills(USER_ID);

    expect(result).toHaveLength(0);
  });

  it("should sort by days until due ascending", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in5 = new Date(today);
    in5.setDate(in5.getDate() + 5);
    const in2 = new Date(today);
    in2.setDate(in2.getDate() + 2);

    const mock = chainMock({
      data: [
        billRow({ id: "b1", next_due_date: in5.toISOString() }),
        billRow({ id: "b2", next_due_date: in2.toISOString() }),
      ],
      error: null,
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getUpcomingBills(USER_ID);

    expect(result[0].id).toBe("b2");
    expect(result[1].id).toBe("b1");
  });

  it("should return empty array when no active bills", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getUpcomingBills(USER_ID);

    expect(result).toEqual([]);
  });
});

// ===========================================================================
// getOverdueBills
// ===========================================================================

describe("getOverdueBills", () => {
  it("should return bills past their due date", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 3);

    const mock = chainMock({
      data: [billRow({ next_due_date: yesterday.toISOString() })],
      error: null,
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getOverdueBills(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("overdue");
    expect(result[0].isPastDue).toBe(true);
    expect(result[0].daysUntilDue).toBeLessThan(0);
  });

  it("should exclude future bills", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mock = chainMock({
      data: [billRow({ next_due_date: tomorrow.toISOString() })],
      error: null,
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getOverdueBills(USER_ID);

    expect(result).toHaveLength(0);
  });

  it("should sort by daysUntilDue ascending (most overdue first)", async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const mock = chainMock({
      data: [
        billRow({ id: "b1", next_due_date: threeDaysAgo.toISOString() }),
        billRow({ id: "b2", next_due_date: sevenDaysAgo.toISOString() }),
      ],
      error: null,
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getOverdueBills(USER_ID);

    expect(result[0].id).toBe("b2"); // more overdue
    expect(result[1].id).toBe("b1");
  });

  it("should return empty array when no overdue bills", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getOverdueBills(USER_ID);

    expect(result).toEqual([]);
  });
});

// ===========================================================================
// recordPayment
// ===========================================================================

describe("recordPayment", () => {
  it("should record a payment and return mapped result", async () => {
    // recordPayment calls: getBillById (from("bills")), insert payment (from("bill_payments")),
    // then updateBill (from("bills"))
    const bill = billRow({ next_due_date: "2026-03-15T00:00:00.000Z" });
    const payment = paymentRow({ status: "paid" });
    const updatedBill = billRow({ next_due_date: "2026-04-15T00:00:00.000Z" });

    (supabase().from as jest.Mock)
      .mockReturnValueOnce(chainMock({ data: bill, error: null }))   // getBillById
      .mockReturnValueOnce(chainMock({ data: payment, error: null })) // insert payment
      .mockReturnValueOnce(chainMock({ data: updatedBill, error: null })); // updateBill

    const result = await service.recordPayment(
      BILL_ID,
      USER_ID,
      15.99,
      new Date("2026-03-15"),
    );

    expect(result.id).toBe("payment-1");
    expect(result.amount).toBe(15.99);
    expect(result.status).toBe("paid");
    expect(result.billId).toBe(BILL_ID);
  });

  it("should mark payment as late when paid after due date", async () => {
    const bill = billRow({ next_due_date: "2026-03-15T00:00:00.000Z" });
    const latePayment = paymentRow({ status: "late" });
    const updatedBill = billRow();

    (supabase().from as jest.Mock)
      .mockReturnValueOnce(chainMock({ data: bill, error: null }))
      .mockReturnValueOnce(chainMock({ data: latePayment, error: null }))
      .mockReturnValueOnce(chainMock({ data: updatedBill, error: null }));

    const result = await service.recordPayment(
      BILL_ID,
      USER_ID,
      15.99,
      new Date("2026-03-20"), // After due date
    );

    expect(result.status).toBe("late");
  });

  it("should include optional payment details", async () => {
    const bill = billRow({ next_due_date: "2026-03-15T00:00:00.000Z" });
    const paymentMock = chainMock({ data: paymentRow(), error: null });
    const updateMock = chainMock({ data: billRow(), error: null });

    (supabase().from as jest.Mock)
      .mockReturnValueOnce(chainMock({ data: bill, error: null }))
      .mockReturnValueOnce(paymentMock)
      .mockReturnValueOnce(updateMock);

    await service.recordPayment(BILL_ID, USER_ID, 15.99, new Date("2026-03-14"), {
      paymentMethod: "credit_card",
      confirmationNumber: "CONF-123",
      notes: "Auto-payment",
    });

    const insertCall = (paymentMock.insert as jest.Mock).mock.calls[0][0];
    expect(insertCall.payment_method).toBe("credit_card");
    expect(insertCall.confirmation_number).toBe("CONF-123");
    expect(insertCall.notes).toBe("Auto-payment");
  });

  it("should throw when bill not found", async () => {
    mockFrom({ data: null, error: { message: "not found" } });

    await expect(
      service.recordPayment(BILL_ID, USER_ID, 15.99, new Date()),
    ).rejects.toThrow("Bill not found");
  });

  it("should throw when payment insert fails", async () => {
    const bill = billRow();
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(chainMock({ data: bill, error: null }))
      .mockReturnValueOnce(
        chainMock({ data: null, error: { message: "insert failed" } }),
      );

    await expect(
      service.recordPayment(BILL_ID, USER_ID, 15.99, new Date()),
    ).rejects.toThrow("Failed to record payment: insert failed");
  });
});

// ===========================================================================
// getPaymentHistory
// ===========================================================================

describe("getPaymentHistory", () => {
  it("should return mapped payment history", async () => {
    const mock = chainMock({
      data: [paymentRow(), paymentRow({ id: "payment-2" })],
      error: null,
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getPaymentHistory(BILL_ID, USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("payment-1");
    expect(result[0].paidDate).toBeInstanceOf(Date);
  });

  it("should respect limit parameter", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await service.getPaymentHistory(BILL_ID, USER_ID, 5);

    expect(mock.limit).toHaveBeenCalledWith(5);
  });

  it("should use default limit of 12", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await service.getPaymentHistory(BILL_ID, USER_ID);

    expect(mock.limit).toHaveBeenCalledWith(12);
  });

  it("should throw on supabase error", async () => {
    const mock = chainMock({ data: null, error: { message: "db err" } });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await expect(
      service.getPaymentHistory(BILL_ID, USER_ID),
    ).rejects.toThrow("Failed to fetch payment history: db err");
  });

  it("should return empty array when no data", async () => {
    const mock = chainMock({ data: null, error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getPaymentHistory(BILL_ID, USER_ID);

    expect(result).toEqual([]);
  });
});

// ===========================================================================
// getPaymentsForPeriod
// ===========================================================================

describe("getPaymentsForPeriod", () => {
  it("should return payments within the date range", async () => {
    const mock = chainMock({ data: [paymentRow()], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const start = new Date("2026-02-01");
    const end = new Date("2026-02-28");
    const result = await service.getPaymentsForPeriod(USER_ID, start, end);

    expect(result).toHaveLength(1);
    expect(supabase().from).toHaveBeenCalledWith("bill_payments");
    expect(mock.gte).toHaveBeenCalledWith("due_date", start.toISOString());
    expect(mock.lte).toHaveBeenCalledWith("due_date", end.toISOString());
  });

  it("should throw on supabase error", async () => {
    const mock = chainMock({ data: null, error: { message: "range err" } });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await expect(
      service.getPaymentsForPeriod(USER_ID, new Date(), new Date()),
    ).rejects.toThrow("Failed to fetch payments: range err");
  });

  it("should return empty array when data is null", async () => {
    const mock = chainMock({ data: null, error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getPaymentsForPeriod(
      USER_ID,
      new Date(),
      new Date(),
    );

    expect(result).toEqual([]);
  });
});

// ===========================================================================
// getBillSummary
// ===========================================================================

describe("getBillSummary", () => {
  it("should compute summary with upcoming and overdue bills", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysAhead = new Date(today);
    threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const upcomingBill = billRow({
      id: "b-upcoming",
      name: "Netflix",
      amount: 15.99,
      frequency: "monthly",
      autopay_enabled: false,
      next_due_date: threeDaysAhead.toISOString(),
    });
    const overdueBill = billRow({
      id: "b-overdue",
      name: "Spotify",
      amount: 9.99,
      frequency: "monthly",
      autopay_enabled: true,
      next_due_date: twoDaysAgo.toISOString(),
    });

    // getBillsByUser, then getPaymentsForPeriod
    const billsChain = chainMock({
      data: [upcomingBill, overdueBill],
      error: null,
    });
    const paymentsChain = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(billsChain)
      .mockReturnValueOnce(paymentsChain);

    const result = await service.getBillSummary(USER_ID);

    expect(result.billsCount).toBe(2);
    expect(result.upcomingBills).toHaveLength(1);
    expect(result.overdueBills).toHaveLength(1);
    expect(result.upcomingBills[0].id).toBe("b-upcoming");
    expect(result.overdueBills[0].id).toBe("b-overdue");
    expect(result.totalUpcomingWeek).toBe(15.99);
    expect(result.totalOverdue).toBe(9.99);
    expect(result.autopayCount).toBe(1);
    expect(result.manualPayCount).toBe(1);
  });

  it("should calculate monthly equivalent for different frequencies", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weeklyBill = billRow({
      id: "b-w",
      amount: 10,
      frequency: "weekly",
      next_due_date: tomorrow.toISOString(),
    });
    const annualBill = billRow({
      id: "b-a",
      amount: 120,
      frequency: "annually",
      next_due_date: tomorrow.toISOString(),
    });

    const billsChain = chainMock({
      data: [weeklyBill, annualBill],
      error: null,
    });
    const paymentsChain = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(billsChain)
      .mockReturnValueOnce(paymentsChain);

    const result = await service.getBillSummary(USER_ID);

    // weekly: 10 * 4.33 = 43.3, annually: 120 / 12 = 10
    expect(result.totalMonthlyBills).toBeCloseTo(53.3, 1);
  });

  it("should calculate paidThisMonth from payments", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const billsChain = chainMock({
      data: [billRow({ next_due_date: tomorrow.toISOString() })],
      error: null,
    });
    const paymentsChain = chainMock({
      data: [paymentRow({ amount: 50 }), paymentRow({ id: "p2", amount: 30 })],
      error: null,
    });
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(billsChain)
      .mockReturnValueOnce(paymentsChain);

    const result = await service.getBillSummary(USER_ID);

    expect(result.paidThisMonth).toBe(80);
  });

  it("should return zeroed summary when no bills", async () => {
    const billsChain = chainMock({ data: [], error: null });
    const paymentsChain = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock)
      .mockReturnValueOnce(billsChain)
      .mockReturnValueOnce(paymentsChain);

    const result = await service.getBillSummary(USER_ID);

    expect(result.billsCount).toBe(0);
    expect(result.totalMonthlyBills).toBe(0);
    expect(result.totalUpcomingWeek).toBe(0);
    expect(result.totalOverdue).toBe(0);
    expect(result.paidThisMonth).toBe(0);
    expect(result.autopayCount).toBe(0);
    expect(result.manualPayCount).toBe(0);
    expect(result.upcomingBills).toEqual([]);
    expect(result.overdueBills).toEqual([]);
  });
});

// ===========================================================================
// getPendingReminders
// ===========================================================================

describe("getPendingReminders", () => {
  it("should return pending reminders", async () => {
    const mock = chainMock({ data: [reminderRow()], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getPendingReminders(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("reminder-1");
    expect(result[0].sent).toBe(false);
    expect(result[0].reminderDate).toBeInstanceOf(Date);
    expect(supabase().from).toHaveBeenCalledWith("bill_reminders");
  });

  it("should filter by user_id when provided", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await service.getPendingReminders(USER_ID);

    const eqCalls = (mock.eq as jest.Mock).mock.calls;
    expect(eqCalls).toEqual(
      expect.arrayContaining([["user_id", USER_ID]]),
    );
  });

  it("should not filter by user_id when not provided", async () => {
    const mock = chainMock({ data: [], error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await service.getPendingReminders();

    // eq called with "sent" false + lte, but NOT "user_id"
    const eqCalls = (mock.eq as jest.Mock).mock.calls;
    const userIdCall = eqCalls.find(
      (c: unknown[]) => c[0] === "user_id",
    );
    expect(userIdCall).toBeUndefined();
  });

  it("should throw on supabase error", async () => {
    const mock = chainMock({ data: null, error: { message: "reminder err" } });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await expect(service.getPendingReminders()).rejects.toThrow(
      "Failed to fetch reminders: reminder err",
    );
  });

  it("should return empty array when data is null", async () => {
    const mock = chainMock({ data: null, error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    const result = await service.getPendingReminders();

    expect(result).toEqual([]);
  });
});

// ===========================================================================
// markReminderSent
// ===========================================================================

describe("markReminderSent", () => {
  it("should mark a reminder as sent", async () => {
    const mock = chainMock({ data: null, error: null });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await service.markReminderSent("reminder-1");

    expect(supabase().from).toHaveBeenCalledWith("bill_reminders");
    const updateCall = (mock.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.sent).toBe(true);
    expect(updateCall.sent_at).toBeDefined();
  });

  it("should throw on supabase error", async () => {
    const mock = chainMock({
      data: null,
      error: { message: "update reminder err" },
    });
    (supabase().from as jest.Mock).mockReturnValue(mock);

    await expect(service.markReminderSent("reminder-1")).rejects.toThrow(
      "Failed to mark reminder as sent: update reminder err",
    );
  });
});
