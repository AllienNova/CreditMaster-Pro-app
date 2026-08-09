import {
  normalizeStatus,
  normalizeOutcome,
  mapGoodwillLetter,
  computeStats,
  formatDate,
  type WebGoodwillLetter,
  type GoodwillLetterView,
} from "../goodwill-data";

describe("normalizeStatus", () => {
  it("maps each known DB status to its display status", () => {
    expect(normalizeStatus("draft")).toBe("draft");
    expect(normalizeStatus("sent")).toBe("sent");
    expect(normalizeStatus("response_received")).toBe("response_received");
    expect(normalizeStatus("approved")).toBe("successful");
    expect(normalizeStatus("denied")).toBe("unsuccessful");
  });

  it("degrades an unknown status to draft (never invents an outcome)", () => {
    expect(normalizeStatus("archived")).toBe("draft");
  });

  it("degrades a missing status to draft", () => {
    expect(normalizeStatus(undefined)).toBe("draft");
  });

  it("does not resolve inherited object keys to a status", () => {
    expect(normalizeStatus("constructor")).toBe("draft");
    expect(normalizeStatus("__proto__")).toBe("draft");
  });
});

describe("normalizeOutcome", () => {
  it("maps each known DB outcome to its display outcome", () => {
    expect(normalizeOutcome("removed")).toBe("removed");
    expect(normalizeOutcome("denied")).toBe("declined");
    expect(normalizeOutcome("pending")).toBe("pending");
  });

  it("returns undefined for an unknown outcome (omitted, not invented)", () => {
    expect(normalizeOutcome("settled")).toBeUndefined();
  });

  it("returns undefined for a missing outcome", () => {
    expect(normalizeOutcome(undefined)).toBeUndefined();
  });

  it("does not resolve inherited object keys to an outcome", () => {
    expect(normalizeOutcome("hasOwnProperty")).toBeUndefined();
  });
});

describe("mapGoodwillLetter", () => {
  it("maps a full raw letter onto the view model", () => {
    const raw: WebGoodwillLetter = {
      id: "gw-1",
      userId: "user-1",
      creditorName: "Northgate Bank",
      accountNumber: "****1010",
      latePaymentDate: "2025-11-01",
      reason: "Requesting removal after a documented hardship",
      letterContent: "Dear Northgate...",
      status: "approved",
      sentAt: "2025-12-15T00:00:00.000Z",
      responseReceivedAt: "2026-01-05T00:00:00.000Z",
      outcome: "removed",
      notes: "n/a",
      createdAt: "2025-12-10T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    };

    expect(mapGoodwillLetter(raw)).toEqual({
      id: "gw-1",
      creditorName: "Northgate Bank",
      accountNumber: "****1010",
      reason: "Requesting removal after a documented hardship",
      status: "successful",
      sentDate: "2025-12-15T00:00:00.000Z",
      outcome: "removed",
      createdAt: "2025-12-10T00:00:00.000Z",
    });
  });

  it("falls back to empty strings rather than fabricating a creditor or reason", () => {
    const view = mapGoodwillLetter({ id: "gw-2", createdAt: "2026-01-01" });
    expect(view.creditorName).toBe("");
    expect(view.reason).toBe("");
    expect(view.status).toBe("draft");
    expect(view.accountNumber).toBeUndefined();
    expect(view.sentDate).toBeUndefined();
    expect(view.outcome).toBeUndefined();
  });
});

describe("computeStats", () => {
  const view = (over: Partial<GoodwillLetterView>): GoodwillLetterView => ({
    id: "x",
    creditorName: "C",
    reason: "",
    status: "draft",
    ...over,
  });

  it("counts total, sent, successful and a whole-percent success rate", () => {
    const letters: GoodwillLetterView[] = [
      view({ status: "successful", sentDate: "2025-12-15", outcome: "removed" }),
      view({ status: "sent", sentDate: "2026-01-05" }),
      view({ status: "unsuccessful", sentDate: "2026-01-10", outcome: "declined" }),
      view({ status: "draft" }),
    ];
    expect(computeStats(letters)).toEqual({
      total: 4,
      sent: 3,
      successful: 1,
      successRate: 33,
    });
  });

  it("returns zeros for an empty list without dividing by zero", () => {
    expect(computeStats([])).toEqual({
      total: 0,
      sent: 0,
      successful: 0,
      successRate: 0,
    });
  });

  it("reports a 0% rate when letters were sent but none succeeded", () => {
    const stats = computeStats([
      view({ status: "sent", sentDate: "2026-01-05" }),
    ]);
    expect(stats.sent).toBe(1);
    expect(stats.successful).toBe(0);
    expect(stats.successRate).toBe(0);
  });
});

describe("formatDate", () => {
  it("formats a valid ISO string to a locale date", () => {
    const iso = "2025-12-15T00:00:00.000Z";
    expect(formatDate(iso)).toBe(new Date(iso).toLocaleDateString());
  });

  it("returns an empty string for a missing date", () => {
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("returns an empty string for an unparseable date", () => {
    expect(formatDate("not-a-date")).toBe("");
  });
});
