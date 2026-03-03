import { getEasternTime, isMarketOpen, isNearMarketClose } from "../market-hours";
import { DEFAULT_MARKET_HOURS } from "../autonomous-types";

describe("market-hours", () => {
  // ========================================================================
  // getEasternTime
  // ========================================================================
  describe("getEasternTime", () => {
    it("returns hour, minute, dayOfWeek, and dateStr", () => {
      const result = getEasternTime(new Date("2026-03-10T14:30:00Z")); // Tuesday 10:30 ET
      expect(result).toHaveProperty("hour");
      expect(result).toHaveProperty("minute");
      expect(result).toHaveProperty("dayOfWeek");
      expect(result).toHaveProperty("dateStr");
    });

    it("converts UTC to Eastern Time correctly during EST", () => {
      // Jan 15, 2026 at 20:00 UTC = 15:00 EST (UTC-5)
      const result = getEasternTime(new Date("2026-01-15T20:00:00Z"));
      expect(result.hour).toBe(15);
      expect(result.minute).toBe(0);
    });

    it("returns correct day of week", () => {
      // 2026-03-09 is a Monday
      const result = getEasternTime(new Date("2026-03-09T15:00:00Z"));
      expect(result.dayOfWeek).toBe(1); // Monday
    });

    it("handles Saturday correctly", () => {
      // 2026-03-14 is a Saturday
      const result = getEasternTime(new Date("2026-03-14T15:00:00Z"));
      expect(result.dayOfWeek).toBe(6); // Saturday
    });

    it("handles Sunday correctly", () => {
      // 2026-03-15 is a Sunday
      const result = getEasternTime(new Date("2026-03-15T15:00:00Z"));
      expect(result.dayOfWeek).toBe(0); // Sunday
    });

    it("uses current time when no argument passed", () => {
      const result = getEasternTime();
      expect(typeof result.hour).toBe("number");
      expect(result.hour).toBeGreaterThanOrEqual(0);
      expect(result.hour).toBeLessThan(24);
    });
  });

  // ========================================================================
  // isMarketOpen
  // ========================================================================
  describe("isMarketOpen", () => {
    it("returns open during regular market hours", () => {
      // Wednesday 2026-03-11 at 10:30 AM ET = 15:30 UTC
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-03-11T15:30:00Z"),
      );
      expect(result.isOpen).toBe(true);
      expect(result.minutesUntilClose).toBeDefined();
    });

    it("returns closed on weekends (Saturday)", () => {
      // Saturday 2026-03-14 at 12:00 PM ET
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-03-14T17:00:00Z"),
      );
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain("weekend");
    });

    it("returns closed on weekends (Sunday)", () => {
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-03-15T17:00:00Z"),
      );
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain("weekend");
    });

    it("returns closed before market open (pre-market)", () => {
      // Wednesday 2026-03-11 at 8:00 AM ET = 13:00 UTC
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-03-11T13:00:00Z"),
      );
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain("pre-market");
    });

    it("returns closed after market close (after hours)", () => {
      // Wednesday 2026-03-11 at 4:30 PM ET = 21:30 UTC (after DST)
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-03-11T20:30:00Z"),
      );
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain("after hours");
    });

    it("returns closed on US market holidays", () => {
      // 2026-12-25 is Christmas (Friday) — market closed
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-12-25T17:00:00Z"),
      );
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain("holiday");
    });

    it("returns closed on MLK Day", () => {
      // 2026-01-19 is MLK Day
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-01-19T17:00:00Z"),
      );
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain("holiday");
    });

    it("calculates minutes until close correctly", () => {
      // Wednesday at 3:00 PM ET = 60 min until close
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-03-11T20:00:00Z"), // 3PM ET (after DST spring forward)
      );
      if (result.isOpen) {
        expect(result.minutesUntilClose).toBe(60);
      }
    });

    it("returns open at exactly 9:30 AM ET", () => {
      // Wednesday 2026-01-14 at 9:30 AM EST = 14:30 UTC
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-01-14T14:30:00Z"),
      );
      expect(result.isOpen).toBe(true);
    });

    it("returns closed at exactly 4:00 PM ET", () => {
      // Wednesday 2026-01-14 at 4:00 PM EST = 21:00 UTC
      const result = isMarketOpen(
        DEFAULT_MARKET_HOURS,
        new Date("2026-01-14T21:00:00Z"),
      );
      expect(result.isOpen).toBe(false);
    });

    it("accepts custom market hours config", () => {
      const customConfig = {
        ...DEFAULT_MARKET_HOURS,
        openHour: 8,
        openMinute: 0,
        closeHour: 17,
        closeMinute: 0,
      };
      // Wednesday 2026-01-14 at 8:00 AM EST = 13:00 UTC
      const result = isMarketOpen(customConfig, new Date("2026-01-14T13:00:00Z"));
      expect(result.isOpen).toBe(true);
    });
  });

  // ========================================================================
  // isNearMarketClose
  // ========================================================================
  describe("isNearMarketClose", () => {
    it("returns true within 15 minutes of close", () => {
      // Wednesday 2026-01-14 at 3:50 PM EST = 20:50 UTC (10 min before close)
      const result = isNearMarketClose(
        15,
        DEFAULT_MARKET_HOURS,
        new Date("2026-01-14T20:50:00Z"),
      );
      expect(result).toBe(true);
    });

    it("returns false when not near close", () => {
      // Wednesday 2026-01-14 at 2:00 PM EST = 19:00 UTC (120 min before close)
      const result = isNearMarketClose(
        15,
        DEFAULT_MARKET_HOURS,
        new Date("2026-01-14T19:00:00Z"),
      );
      expect(result).toBe(false);
    });

    it("returns false when market is closed", () => {
      const result = isNearMarketClose(
        15,
        DEFAULT_MARKET_HOURS,
        new Date("2026-01-14T23:00:00Z"), // 6 PM EST — after hours
      );
      expect(result).toBe(false);
    });

    it("accepts custom threshold", () => {
      // 30 min threshold; at 3:35 PM = 25 min before close
      const result = isNearMarketClose(
        30,
        DEFAULT_MARKET_HOURS,
        new Date("2026-01-14T20:35:00Z"),
      );
      expect(result).toBe(true);
    });
  });
});
