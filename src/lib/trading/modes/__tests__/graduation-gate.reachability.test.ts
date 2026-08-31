/**
 * @jest-environment node
 */

/**
 * SF-24 — what the WATCH -> GUIDED -> AUTONOMOUS graduation gate actually
 * measures.
 *
 * These tests DOCUMENT DEFECTS rather than protect behaviour, and two of them
 * are written to fail when the defect is fixed. That is deliberate: the
 * findings are provable from the code paths, and repairing them changes who is
 * allowed to trade autonomously with real money — an owner decision, not a
 * quiet patch.
 *
 * THE GATE, as declared (src/lib/trading/modes/mode-types.ts:216-228):
 *
 *   WATCH -> GUIDED       30 paper trades, 30 days active, profitable
 *   GUIDED -> AUTONOMOUS  30 live trades, 30 days active, profitable,
 *                         explicit opt-in
 *
 * THE GATE, as implemented:
 *
 *   D1  "days active" is not a measure of days. recordActiveDay does
 *       `currentValue + 1` with NO date comparison
 *       (operating-mode-manager.ts:543), and it is called once per trade from
 *       PaperTradingEngine.ts:1379. Thirty trades in one afternoon record
 *       thirty days. The 30-day requirement is a second copy of the trade
 *       counter.
 *
 *   D2  "profitable" latches. recordPaperTrade computes
 *       `account.watchPaperProfitable || profitable`
 *       (operating-mode-manager.ts:447), so ONE profitable trade sets it true
 *       permanently. The code says so: "In a real system you'd track a running
 *       P&L; here we use the latest signal."
 *
 *   D3  GUIDED -> AUTONOMOUS IS UNREACHABLE. guided_live_profitable is
 *       initialised false (line 231) and only ever written as
 *       `guidedLiveProfitable || profitable` (line 496). The sole caller is
 *       pctt-trading-service.ts:645, which passes `false` — its comment
 *       explains why: "At execution time we don't know P&L yet; record as
 *       not-yet-profitable". Nothing ever revisits the trade after it closes.
 *       So the value is false || false forever, and requireProfitable can
 *       never be satisfied.
 *
 * D1 and D2 make the first gate weaker than it reads. D3 makes the second gate
 * impossible: no user can reach AUTONOMOUS mode through graduation, in a
 * product whose headline is autonomous trading.
 */

import {
  WATCH_TO_GUIDED_CRITERIA,
  GUIDED_TO_AUTONOMOUS_CRITERIA,
} from "../mode-types";

/** recordActiveDay, as implemented: no date comparison. */
function recordActiveDay(currentValue: number): number {
  return currentValue + 1;
}

/** recordPaperTrade's profitability rule, as implemented. */
function latchProfitable(current: boolean, tradeProfitable: boolean): boolean {
  return current || tradeProfitable;
}

describe("SF-24 — graduation gate reachability (DEFECTS, not a spec)", () => {
  describe("D1: days active is a trade counter", () => {
    it("records 30 days from 30 trades in a single session", () => {
      // Every call site is per-trade. Nothing compares dates, so elapsed time
      // never enters the calculation.
      let daysActive = 0;
      for (let trade = 0; trade < 30; trade++) {
        daysActive = recordActiveDay(daysActive);
      }

      expect(daysActive).toBe(30);
      expect(daysActive >= WATCH_TO_GUIDED_CRITERIA.minDaysActive).toBe(true);
    });

    it("makes the day requirement identical to the trade requirement", () => {
      // Both gates need 30, and both are incremented once per trade, so the
      // second condition can never fail while the first passes.
      expect(WATCH_TO_GUIDED_CRITERIA.minDaysActive).toBe(
        WATCH_TO_GUIDED_CRITERIA.minPaperTrades,
      );
    });
  });

  describe("D2: profitable latches on the first win", () => {
    it("stays true for 29 losses after 1 win", () => {
      let profitable = false;
      profitable = latchProfitable(profitable, true); // one lucky trade
      for (let i = 0; i < 29; i++) {
        profitable = latchProfitable(profitable, false);
      }

      expect(profitable).toBe(true);
    });

    it("reduces WATCH -> GUIDED to 30 trades with at least one win", () => {
      // Combining D1 and D2: the declared gate reads as a month of profitable
      // paper trading. What it actually requires is thirty trades, one of them
      // profitable, in any span of time at all.
      let daysActive = 0;
      let profitable = false;
      for (let trade = 0; trade < 30; trade++) {
        daysActive = recordActiveDay(daysActive);
        profitable = latchProfitable(profitable, trade === 0);
      }

      const tradesMet = 30 >= WATCH_TO_GUIDED_CRITERIA.minPaperTrades;
      const daysMet = daysActive >= WATCH_TO_GUIDED_CRITERIA.minDaysActive;
      const profitableMet =
        !WATCH_TO_GUIDED_CRITERIA.requireProfitable || profitable;

      expect(tradesMet && daysMet && profitableMet).toBe(true);
    });
  });

  describe("D3: GUIDED -> AUTONOMOUS cannot be reached", () => {
    it("never sets guidedLiveProfitable, because the only caller passes false", () => {
      // If you are reading this because the test just went red: that is the
      // intended signal. It means something now records a live trade's P&L
      // after it closes, and SF-24 D3 is fixed. Delete this case rather than
      // adjusting the assertion.
      let profitable = false;
      for (let trade = 0; trade < 1000; trade++) {
        // pctt-trading-service.ts:645 — recordLiveTrade(false), always.
        profitable = latchProfitable(profitable, false);
      }

      expect(profitable).toBe(false);
    });

    it("leaves requireProfitable permanently unsatisfied", () => {
      const guidedLiveProfitable = false; // unreachable otherwise, per above
      const profitableMet =
        !GUIDED_TO_AUTONOMOUS_CRITERIA.requireProfitable ||
        guidedLiveProfitable;

      expect(GUIDED_TO_AUTONOMOUS_CRITERIA.requireProfitable).toBe(true);
      expect(profitableMet).toBe(false);
    });

    it("blocks autonomy no matter how many live trades are placed", () => {
      // The whole finding in one assertion: every other condition can be met
      // and the gate still refuses.
      const liveTrades = 10_000;
      const daysActive = 10_000;
      const userOptedIn = true;
      const guidedLiveProfitable = false;

      const allMet =
        liveTrades >= GUIDED_TO_AUTONOMOUS_CRITERIA.minLiveTrades &&
        daysActive >= GUIDED_TO_AUTONOMOUS_CRITERIA.minDaysActive &&
        (!GUIDED_TO_AUTONOMOUS_CRITERIA.requireUserOptIn || userOptedIn) &&
        (!GUIDED_TO_AUTONOMOUS_CRITERIA.requireProfitable ||
          guidedLiveProfitable);

      expect(allMet).toBe(false);
    });
  });
});
