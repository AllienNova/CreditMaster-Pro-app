/**
 * Background credit-check mapping.
 *
 * The background monitor called /api/credit/check. The client's base URL
 * already ends in /api, so every run went to /api/api/credit/check and 404'd.
 * The client returns { success: false } rather than throwing, so the catch
 * around it never fired, `response.data` was undefined, and the task handler's
 * `result.alerts.length` threw. The task has never completed a run.
 *
 * Inside that dead catch sat `{ score: 720, change: 0, alerts: [] }` labelled
 * "mock data for development". These tests exist mostly to pin the opposite
 * behaviour: when the score cannot be read, the answer is null — never a
 * number, and never a clean run with no alerts.
 */

import { toCreditCheckResult } from "../creditCheckAdapter";

const dashboard = {
  averageScore: 712,
  scoreChange30Days: -8,
  alerts: [
    {
      alert_type: "new_account",
      description: "A new account was opened in your name.",
      severity: "critical" as const,
    },
  ],
};

describe("toCreditCheckResult", () => {
  it("maps the average score and its 30-day change", () => {
    const result = toCreditCheckResult(dashboard);
    expect(result).toEqual(
      expect.objectContaining({ score: 712, change: -8 }),
    );
  });

  it("maps an alert's type and description", () => {
    const [alert] = toCreditCheckResult(dashboard)!.alerts;
    expect(alert.type).toBe("new_account");
    expect(alert.message).toBe("A new account was opened in your name.");
  });

  describe("when there is nothing real to report", () => {
    it.each([
      [null, "no dashboard"],
      [undefined, "undefined dashboard"],
      [{}, "no averageScore"],
      [{ averageScore: "712" }, "a non-numeric score"],
    ])("returns null for %j — %s", (input, _why) => {
      expect(toCreditCheckResult(input as never)).toBeNull();
    });

    it("returns null for an average of 0, which means no scores on file", () => {
      // 0 is not a credit score. Returning it would put "0" in front of the
      // user exactly the way the old hardcoded 720 did.
      expect(toCreditCheckResult({ averageScore: 0, alerts: [] })).toBeNull();
    });

    it("never substitutes a placeholder score", () => {
      const result = toCreditCheckResult({});
      expect(result).toBeNull();
      expect(JSON.stringify(result)).not.toContain("720");
    });
  });

  describe("severity", () => {
    it.each([
      ["low", "info"],
      ["medium", "warning"],
      // high maps to warning rather than critical: critical is the one that
      // plays a sound, and promoting high would make every alert urgent.
      ["high", "warning"],
      ["critical", "critical"],
    ])("maps %s to %s", (severity, expected) => {
      const result = toCreditCheckResult({
        ...dashboard,
        alerts: [{ ...dashboard.alerts[0], severity: severity as never }],
      });
      expect(result!.alerts[0].severity).toBe(expected);
    });

    it("treats an unrecognised severity as a warning rather than dropping it", () => {
      const result = toCreditCheckResult({
        ...dashboard,
        alerts: [{ ...dashboard.alerts[0], severity: "urgent" as never }],
      });
      expect(result!.alerts).toHaveLength(1);
      expect(result!.alerts[0].severity).toBe("warning");
    });
  });

  describe("alerts", () => {
    it("drops an alert with no text, which would push an empty notification", () => {
      const result = toCreditCheckResult({
        ...dashboard,
        alerts: [{ alert_type: "inquiry", description: "  ", severity: "low" }],
      });
      expect(result!.alerts).toEqual([]);
    });

    it("falls back to a generic type when the server sent none", () => {
      const result = toCreditCheckResult({
        ...dashboard,
        alerts: [{ description: "Something changed.", severity: "low" }],
      });
      expect(result!.alerts[0].type).toBe("credit_alert");
    });

    it("returns an empty list when alerts is absent, with the score intact", () => {
      const result = toCreditCheckResult({ averageScore: 700 });
      expect(result).toEqual({ score: 700, change: 0, alerts: [] });
    });

    it("treats a missing change as 0 — no movement is a real answer", () => {
      expect(toCreditCheckResult({ averageScore: 700 })!.change).toBe(0);
    });
  });
});
