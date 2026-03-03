/**
 * TaxPaymentScheduler — Unit Tests
 *
 * Tests tax payment estimation, schedule generation, deadline tracking,
 * extension management, payment recording, calendar events, and reminders.
 */

import { taxPaymentScheduler } from "../tax-payment-scheduler";

// ---------------------------------------------------------------------------
// Fresh IDs to avoid singleton state collisions
// ---------------------------------------------------------------------------

let userCounter = 0;
function uniqueUserId(): string {
  return `tax-test-user-${++userCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// estimatePayments
// ---------------------------------------------------------------------------

describe("TaxPaymentScheduler", () => {
  describe("estimatePayments", () => {
    it("should estimate payments for a single filer", () => {
      const est = taxPaymentScheduler.estimatePayments(100000, "single");

      expect(est.annualIncome).toBe(100000);
      expect(est.filingStatus).toBe("single");
      expect(est.estimatedTax).toBeGreaterThan(0);
      expect(est.quarterlyAmount).toBe(Math.ceil(est.estimatedTax / 4));
      expect(est.effectiveRate).toBeGreaterThan(0);
      expect(est.effectiveRate).toBeLessThan(40);
    });

    it("should estimate payments for married filing jointly", () => {
      const single = taxPaymentScheduler.estimatePayments(100000, "single");
      const joint = taxPaymentScheduler.estimatePayments(100000, "married_filing_jointly");

      // Joint filers have a higher standard deduction → lower tax
      expect(joint.estimatedTax).toBeLessThan(single.estimatedTax);
    });

    it("should return 0 tax for very low income", () => {
      const est = taxPaymentScheduler.estimatePayments(5000, "single");
      // $5k income with $14.6k standard deduction → $0 taxable
      expect(est.estimatedTax).toBe(0);
      expect(est.quarterlyAmount).toBe(0);
      expect(est.effectiveRate).toBe(0);
    });

    it("should return 0 effective rate for zero income", () => {
      const est = taxPaymentScheduler.estimatePayments(0, "single");
      expect(est.estimatedTax).toBe(0);
      expect(est.effectiveRate).toBe(0);
    });

    it("should use higher safe harbor multiplier for high income", () => {
      const high = taxPaymentScheduler.estimatePayments(200000, "single");
      // 110% safe harbor for AGI > 150k
      expect(high.safeHarborAmount).toBeGreaterThan(high.quarterlyAmount);
    });

    it("should use 100% safe harbor for income <= 150k", () => {
      const normal = taxPaymentScheduler.estimatePayments(100000, "single");
      expect(normal.safeHarborAmount).toBe(normal.quarterlyAmount);
    });

    it("should default to single filing status", () => {
      const est = taxPaymentScheduler.estimatePayments(100000);
      expect(est.filingStatus).toBe("single");
    });

    it("should handle head_of_household filing status", () => {
      const est = taxPaymentScheduler.estimatePayments(80000, "head_of_household");
      expect(est.filingStatus).toBe("head_of_household");
      expect(est.estimatedTax).toBeGreaterThan(0);
    });

    it("should handle married_filing_separately status", () => {
      const est = taxPaymentScheduler.estimatePayments(80000, "married_filing_separately");
      expect(est.filingStatus).toBe("married_filing_separately");
      expect(est.estimatedTax).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // generateSchedule
  // -------------------------------------------------------------------------

  describe("generateSchedule", () => {
    it("should generate a complete schedule with quarterly payments", () => {
      const userId = uniqueUserId();
      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
        "single",
      );

      expect(schedule.userId).toBe(userId);
      expect(schedule.taxYear).toBe(2025);
      expect(schedule.annualIncome).toBe(100000);
      expect(schedule.estimatedTax).toBeGreaterThan(0);
      expect(schedule.quarterlyPayments).toHaveLength(4);
      expect(schedule.filingDeadline).toBeDefined();
      expect(schedule.stateDeadlines).toHaveLength(0);
    });

    it("should set correct quarterly due dates", () => {
      const userId = uniqueUserId();
      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
      );

      const dates = schedule.quarterlyPayments.map((q) => ({
        quarter: q.quarter,
        month: q.dueDate.getMonth() + 1,
        day: q.dueDate.getDate(),
      }));

      expect(dates[0]).toEqual({ quarter: 1, month: 4, day: 15 });
      expect(dates[1]).toEqual({ quarter: 2, month: 6, day: 15 });
      expect(dates[2]).toEqual({ quarter: 3, month: 9, day: 15 });
      expect(dates[3]).toEqual({ quarter: 4, month: 1, day: 15 }); // next year
    });

    it("should set Q4 due date in the following year", () => {
      const userId = uniqueUserId();
      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
      );

      const q4 = schedule.quarterlyPayments[3];
      expect(q4.dueDate.getFullYear()).toBe(2026);
    });

    it("should set federal filing deadline to April 15 of next year", () => {
      const userId = uniqueUserId();
      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
      );

      expect(schedule.filingDeadline.dueDate.getFullYear()).toBe(2026);
      expect(schedule.filingDeadline.dueDate.getMonth()).toBe(3); // April = 3
      expect(schedule.filingDeadline.dueDate.getDate()).toBe(15);
      expect(schedule.filingDeadline.type).toBe("annual_filing");
    });

    it("should include state deadlines when provided", () => {
      const userId = uniqueUserId();
      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
        "single",
        ["CA", "NY"],
      );

      expect(schedule.stateDeadlines).toHaveLength(2);
      expect(schedule.stateDeadlines[0].state).toBe("CA");
      expect(schedule.stateDeadlines[1].state).toBe("NY");
      expect(schedule.stateDeadlines[0].type).toBe("state_filing");
    });

    it("should calculate remaining amounts correctly", () => {
      const userId = uniqueUserId();
      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
      );

      expect(schedule.totalPaid).toBe(0);
      expect(schedule.totalRemaining).toBe(schedule.estimatedTax);
    });

    it("should reflect prior payments in quarterly status", () => {
      const userId = uniqueUserId();
      // Record a payment before generating schedule
      taxPaymentScheduler.recordPayment(userId, "q1_2025", 5000);

      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
      );

      expect(schedule.quarterlyPayments[0].paidAmount).toBe(5000);
      expect(schedule.totalPaid).toBe(5000);
    });

    it("should compute deadline status based on the current date", () => {
      const userId = uniqueUserId();
      // Use a date far in the future where all 2025 deadlines are overdue
      const futureDate = new Date("2027-06-01");
      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
        "single",
        undefined,
        futureDate,
      );

      // All deadlines should be overdue
      for (const q of schedule.quarterlyPayments) {
        expect(q.status).toBe("overdue");
      }
    });
  });

  // -------------------------------------------------------------------------
  // fileExtension
  // -------------------------------------------------------------------------

  describe("fileExtension", () => {
    it("should create an extension deadline for October 15", () => {
      const userId = uniqueUserId();
      // First generate a schedule to create the filing deadline
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      const extension = taxPaymentScheduler.fileExtension(userId, 2025);

      expect(extension.type).toBe("extension_filing");
      expect(extension.dueDate.getMonth()).toBe(9); // October = 9
      expect(extension.dueDate.getDate()).toBe(15);
      expect(extension.dueDate.getFullYear()).toBe(2026);
      expect(extension.taxYear).toBe(2025);
    });

    it("should mark original filing deadline as extended", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);
      taxPaymentScheduler.fileExtension(userId, 2025);

      const deadlines = taxPaymentScheduler.getDeadlines(userId, {
        type: "annual_filing",
        taxYear: 2025,
      });

      expect(deadlines.length).toBeGreaterThan(0);
      expect(deadlines[0].status).toBe("extended");
      expect(deadlines[0].extensionDate).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Payment Tracking
  // -------------------------------------------------------------------------

  describe("payment tracking", () => {
    it("should record and retrieve payments", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.recordPayment(userId, "dl-1", 1000);
      taxPaymentScheduler.recordPayment(userId, "dl-1", 500);

      expect(taxPaymentScheduler.getPaymentAmount(userId, "dl-1")).toBe(1500);
    });

    it("should return 0 for unknown payments", () => {
      expect(taxPaymentScheduler.getPaymentAmount("nobody", "dl-x")).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // markComplete
  // -------------------------------------------------------------------------

  describe("markComplete", () => {
    it("should mark a deadline as completed", () => {
      const userId = uniqueUserId();
      const schedule = taxPaymentScheduler.generateSchedule(
        userId,
        2025,
        100000,
      );

      const deadlineId = schedule.filingDeadline.id;
      expect(taxPaymentScheduler.markComplete(userId, deadlineId)).toBe(true);

      const deadlines = taxPaymentScheduler.getDeadlines(userId, { status: "completed" });
      expect(deadlines.some((d) => d.id === deadlineId)).toBe(true);
    });

    it("should return false for unknown deadline", () => {
      expect(taxPaymentScheduler.markComplete("nobody", "dl-x")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getDeadlines
  // -------------------------------------------------------------------------

  describe("getDeadlines", () => {
    it("should return empty for unknown user", () => {
      expect(taxPaymentScheduler.getDeadlines("nobody")).toEqual([]);
    });

    it("should filter by type", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      const quarterly = taxPaymentScheduler.getDeadlines(userId, {
        type: "quarterly_estimated",
      });
      expect(quarterly).toHaveLength(4);
    });

    it("should filter by tax year", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);
      taxPaymentScheduler.generateSchedule(userId, 2024, 80000);

      const y2025 = taxPaymentScheduler.getDeadlines(userId, { taxYear: 2025 });
      const y2024 = taxPaymentScheduler.getDeadlines(userId, { taxYear: 2024 });

      expect(y2025.length).toBeGreaterThan(0);
      expect(y2024.length).toBeGreaterThan(0);
      expect(y2025.every((d) => d.taxYear === 2025)).toBe(true);
      expect(y2024.every((d) => d.taxYear === 2024)).toBe(true);
    });

    it("should sort deadlines by due date ascending", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      const deadlines = taxPaymentScheduler.getDeadlines(userId);
      for (let i = 1; i < deadlines.length; i++) {
        expect(deadlines[i].dueDate.getTime()).toBeGreaterThanOrEqual(
          deadlines[i - 1].dueDate.getTime(),
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // getCalendarEvents
  // -------------------------------------------------------------------------

  describe("getCalendarEvents", () => {
    it("should generate calendar events for all deadlines", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      const events = taxPaymentScheduler.getCalendarEvents(userId, 2025);
      expect(events.length).toBeGreaterThanOrEqual(5); // 4 quarterly + 1 filing

      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(event.title).toBeTruthy();
        expect(event.date).toBeInstanceOf(Date);
        expect(event.type).toBeTruthy();
        expect(typeof event.isUrgent).toBe("boolean");
      }
    });

    it("should mark overdue/due_soon events as urgent", () => {
      const userId = uniqueUserId();
      // Generate schedule with a date that makes some deadlines overdue
      const futureDate = new Date("2027-01-01");
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000, "single", undefined, futureDate);

      const events = taxPaymentScheduler.getCalendarEvents(userId, 2025);
      const urgentEvents = events.filter((e) => e.isUrgent);
      expect(urgentEvents.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // getUpcomingReminders
  // -------------------------------------------------------------------------

  describe("getUpcomingReminders", () => {
    it("should return overdue reminders", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      // Check from a date after all Q1 deadlines
      const lateDate = new Date("2026-04-20");
      const reminders = taxPaymentScheduler.getUpcomingReminders(userId, lateDate);

      const overdue = reminders.filter((r) => r.daysUntilDue < 0);
      expect(overdue.length).toBeGreaterThan(0);
      expect(overdue[0].title).toContain("OVERDUE");
    });

    it("should return reminders for deadline days matching reminder windows", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      // Check from exactly 14 days before Apr 15, 2026 filing deadline
      // Use local Date constructor to match the service's date creation
      const reminderDate = new Date(2026, 3, 1); // April 1, 2026 local
      const reminders = taxPaymentScheduler.getUpcomingReminders(userId, reminderDate);

      const dueSoon = reminders.filter((r) => r.daysUntilDue === 14);
      expect(dueSoon.length).toBeGreaterThanOrEqual(1);
    });

    it("should sort reminders by days until due", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      const reminders = taxPaymentScheduler.getUpcomingReminders(
        userId,
        new Date("2026-04-20"),
      );

      for (let i = 1; i < reminders.length; i++) {
        expect(reminders[i].daysUntilDue).toBeGreaterThanOrEqual(
          reminders[i - 1].daysUntilDue,
        );
      }
    });

    it("should not include completed or extended deadlines", () => {
      const userId = uniqueUserId();
      const schedule = taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      // Complete the filing deadline
      taxPaymentScheduler.markComplete(userId, schedule.filingDeadline.id);

      const reminders = taxPaymentScheduler.getUpcomingReminders(
        userId,
        new Date("2026-04-14"),
      );

      const filingReminder = reminders.find(
        (r) => r.deadlineId === schedule.filingDeadline.id,
      );
      expect(filingReminder).toBeUndefined();
    });

    it("should include amount in reminder when available", () => {
      const userId = uniqueUserId();
      taxPaymentScheduler.generateSchedule(userId, 2025, 100000);

      const reminders = taxPaymentScheduler.getUpcomingReminders(
        userId,
        new Date("2026-04-20"),
      );

      const withAmount = reminders.filter((r) => r.amount !== undefined);
      expect(withAmount.length).toBeGreaterThan(0);
    });
  });
});
