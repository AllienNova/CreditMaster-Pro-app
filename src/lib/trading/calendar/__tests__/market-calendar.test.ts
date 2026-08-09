/**
 * Tests for market-calendar.ts (8.1) and session-hours.ts (8.3)
 * and blackout-windows.ts (8.2)
 */

import {
  isMarketOpen,
  isPreMarket,
  isPostMarket,
  isHoliday,
  getNextMarketOpen,
  getMarketSession,
} from "../market-calendar";

import {
  getCurrentSession,
  getSessionBoundaries,
  minutesToClose,
  minutesToOpen,
} from "../session-hours";

import {
  isInBlackout,
  getUpcomingBlackouts,
  addBlackout,
  buildEarningsBlackout,
  buildMacroBlackout,
  type BlackoutWindow,
} from "../blackout-windows";

// ============================================================================
// HELPERS — build a UTC Date from an ET wall-clock string
// ============================================================================

/**
 * Build a UTC Date for "YYYY-MM-DD HH:MM" in America/New_York.
 * Uses Intl to validate the round-trip. Tries EDT (UTC-4) and EST (UTC-5).
 */
function etDate(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  for (const offsetH of [4, 5]) {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const hh = String(hour + offsetH).padStart(2, "0");
    const mi = String(minute).padStart(2, "0");
    const candidate = new Date(`${year}-${mm}-${dd}T${hh}:${mi}:00.000Z`);
    // Verify round-trip
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(candidate);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
    const checkH = parseInt(get("hour"), 10);
    const checkM = parseInt(get("minute"), 10);
    if (checkH === hour && checkM === minute) return candidate;
  }
  throw new Error(`Could not build ET date for ${dateStr} ${timeStr}`);
}

// ============================================================================
// isMarketOpen
// ============================================================================

describe("isMarketOpen", () => {
  it("returns true at 10:00 ET on a regular trading day", () => {
    const ts = etDate("2025-03-17", "10:00"); // Monday, regular day
    expect(isMarketOpen(ts)).toBe(true);
  });

  it("returns false at 09:00 ET (pre-market)", () => {
    const ts = etDate("2025-03-17", "09:00");
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns false at 16:01 ET (post-market)", () => {
    const ts = etDate("2025-03-17", "16:01");
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns false on Saturday", () => {
    const ts = etDate("2025-03-15", "10:00"); // Saturday
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns false on Sunday", () => {
    const ts = etDate("2025-03-16", "10:00"); // Sunday
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns false on NYSE holiday — Independence Day 2025", () => {
    const ts = etDate("2025-07-04", "10:00");
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns false on Christmas 2025", () => {
    const ts = etDate("2025-12-25", "10:00");
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns false on New Year's Day 2026", () => {
    const ts = etDate("2026-01-01", "10:00");
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns false on Thanksgiving 2025", () => {
    const ts = etDate("2025-11-27", "10:00");
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns true at 09:30 ET (market open)", () => {
    const ts = etDate("2025-04-01", "09:30"); // Tuesday, regular day
    expect(isMarketOpen(ts)).toBe(true);
  });

  it("returns false at 15:59 + 60 seconds = 16:00 ET (close)", () => {
    const ts = etDate("2025-04-01", "16:00");
    expect(isMarketOpen(ts)).toBe(false);
  });

  it("returns true on early-close day at 12:59 ET (before early close)", () => {
    const ts = etDate("2025-07-03", "12:59"); // Black Friday before Ind Day
    expect(isMarketOpen(ts)).toBe(true);
  });

  it("returns false on early-close day at 13:00 ET (at early close)", () => {
    const ts = etDate("2025-07-03", "13:00");
    expect(isMarketOpen(ts)).toBe(false);
  });
});

// ============================================================================
// isPreMarket
// ============================================================================

describe("isPreMarket", () => {
  it("returns true at 05:00 ET on a weekday", () => {
    const ts = etDate("2025-03-17", "05:00");
    expect(isPreMarket(ts)).toBe(true);
  });

  it("returns true at 04:00 ET (pre-market open)", () => {
    const ts = etDate("2025-03-17", "04:00");
    expect(isPreMarket(ts)).toBe(true);
  });

  it("returns false at 03:59 ET (before pre-market)", () => {
    const ts = etDate("2025-03-17", "03:59");
    expect(isPreMarket(ts)).toBe(false);
  });

  it("returns false at 09:30 ET (regular market open)", () => {
    const ts = etDate("2025-03-17", "09:30");
    expect(isPreMarket(ts)).toBe(false);
  });

  it("returns false on weekend", () => {
    const ts = etDate("2025-03-15", "07:00");
    expect(isPreMarket(ts)).toBe(false);
  });

  it("returns false on holiday", () => {
    const ts = etDate("2025-12-25", "07:00");
    expect(isPreMarket(ts)).toBe(false);
  });
});

// ============================================================================
// isPostMarket
// ============================================================================

describe("isPostMarket", () => {
  it("returns true at 17:00 ET on a weekday", () => {
    const ts = etDate("2025-03-17", "17:00");
    expect(isPostMarket(ts)).toBe(true);
  });

  it("returns true at 16:00 ET (post-market start)", () => {
    const ts = etDate("2025-03-17", "16:00");
    expect(isPostMarket(ts)).toBe(true);
  });

  it("returns false at 20:00 ET (post-market end)", () => {
    const ts = etDate("2025-03-17", "20:00");
    expect(isPostMarket(ts)).toBe(false);
  });

  it("returns false at 15:59 ET (still regular session)", () => {
    const ts = etDate("2025-03-17", "15:59");
    expect(isPostMarket(ts)).toBe(false);
  });

  it("returns false on weekend", () => {
    const ts = etDate("2025-03-15", "17:00");
    expect(isPostMarket(ts)).toBe(false);
  });

  it("returns false on holiday", () => {
    const ts = etDate("2025-12-25", "17:00");
    expect(isPostMarket(ts)).toBe(false);
  });

  it("starts at 13:00 ET on early-close day", () => {
    const ts = etDate("2025-07-03", "13:00");
    expect(isPostMarket(ts)).toBe(true);
  });
});

// ============================================================================
// isHoliday
// ============================================================================

describe("isHoliday", () => {
  it("detects Independence Day 2025", () => {
    expect(isHoliday(etDate("2025-07-04", "12:00"))).toBe(true);
  });

  it("detects MLK Day 2026", () => {
    expect(isHoliday(etDate("2026-01-19", "12:00"))).toBe(true);
  });

  it("detects Memorial Day 2027", () => {
    expect(isHoliday(etDate("2027-05-31", "12:00"))).toBe(true);
  });

  it("detects Good Friday 2025", () => {
    expect(isHoliday(etDate("2025-04-18", "12:00"))).toBe(true);
  });

  it("detects Juneteenth 2025", () => {
    expect(isHoliday(etDate("2025-06-19", "12:00"))).toBe(true);
  });

  it("returns false for a regular trading day", () => {
    expect(isHoliday(etDate("2025-03-17", "12:00"))).toBe(false);
  });

  it("returns false for an early-close day (not a holiday)", () => {
    expect(isHoliday(etDate("2025-07-03", "12:00"))).toBe(false);
  });

  it("detects Christmas 2027 (observed, Dec 24)", () => {
    expect(isHoliday(etDate("2027-12-24", "12:00"))).toBe(true);
  });
});

// ============================================================================
// getNextMarketOpen
// ============================================================================

describe("getNextMarketOpen", () => {
  it("returns today's open if called before market open on a weekday", () => {
    const ts = etDate("2025-03-17", "07:00");
    const next = getNextMarketOpen(ts);
    const openHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(next);
    expect(openHour).toBe("09:30");
  });

  it("returns next Monday's open when called on Friday after close", () => {
    const ts = etDate("2025-03-14", "17:00"); // Friday after close
    const next = getNextMarketOpen(ts);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(next);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    expect(weekday).toBe("Mon");
    expect(`${hour}:${minute}`).toBe("09:30");
  });

  it("skips a holiday when finding next market open", () => {
    // Dec 24 is Christmas Eve 2025 (not a holiday), Dec 25 is the holiday
    const ts = etDate("2025-12-24", "17:00"); // after close on Dec 24
    const next = getNextMarketOpen(ts);
    const dateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(next);
    const get = (t: string) => dateParts.find((p) => p.type === t)?.value ?? "";
    // Next open should be Dec 26 (Dec 25 is Christmas holiday)
    expect(get("month")).toBe("12");
    expect(get("day")).toBe("26");
    expect(`${get("hour")}:${get("minute")}`).toBe("09:30");
  });
});

// ============================================================================
// getMarketSession
// ============================================================================

describe("getMarketSession", () => {
  it("returns type=regular on a normal trading day", () => {
    const session = getMarketSession(etDate("2025-03-17", "10:00"));
    expect(session.type).toBe("regular");
    expect(session.regularOpen).toBe("09:30");
    expect(session.regularClose).toBe("16:00");
  });

  it("returns type=holiday on a NYSE holiday", () => {
    const session = getMarketSession(etDate("2025-07-04", "10:00"));
    expect(session.type).toBe("holiday");
  });

  it("returns type=weekend on Saturday", () => {
    const session = getMarketSession(etDate("2025-03-15", "10:00"));
    expect(session.type).toBe("weekend");
  });

  it("returns type=half_day on early-close day with 13:00 close", () => {
    const session = getMarketSession(etDate("2025-07-03", "10:00"));
    expect(session.type).toBe("half_day");
    expect(session.regularClose).toBe("13:00");
  });
});

// ============================================================================
// getCurrentSession (session-hours.ts)
// ============================================================================

describe("getCurrentSession", () => {
  it("returns regular during regular hours", () => {
    const ts = etDate("2025-03-17", "11:00");
    expect(getCurrentSession(ts)).toBe("regular");
  });

  it("returns pre_market during pre-market hours", () => {
    const ts = etDate("2025-03-17", "07:00");
    expect(getCurrentSession(ts)).toBe("pre_market");
  });

  it("returns post_market during post-market hours", () => {
    const ts = etDate("2025-03-17", "17:00");
    expect(getCurrentSession(ts)).toBe("post_market");
  });

  it("returns closed on weekend", () => {
    const ts = etDate("2025-03-15", "12:00");
    expect(getCurrentSession(ts)).toBe("closed");
  });

  it("returns closed at 02:00 ET on a weekday", () => {
    const ts = etDate("2025-03-17", "02:00");
    expect(getCurrentSession(ts)).toBe("closed");
  });
});

// ============================================================================
// getSessionBoundaries (session-hours.ts)
// ============================================================================

describe("getSessionBoundaries", () => {
  it("returns correct boundaries for a regular trading day", () => {
    const ts = etDate("2025-03-17", "12:00");
    const bounds = getSessionBoundaries(ts);

    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);

    expect(fmt(bounds.preMarketOpen)).toBe("04:00");
    expect(fmt(bounds.regularOpen)).toBe("09:30");
    expect(fmt(bounds.regularClose)).toBe("16:00");
    expect(fmt(bounds.postMarketClose)).toBe("20:00");
  });

  it("returns early-close regularClose (13:00) on half-day", () => {
    const ts = etDate("2025-07-03", "10:00");
    const bounds = getSessionBoundaries(ts);

    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);

    expect(fmt(bounds.regularClose)).toBe("13:00");
  });
});

// ============================================================================
// minutesToClose / minutesToOpen (session-hours.ts)
// ============================================================================

describe("minutesToClose", () => {
  it("returns 0 when market is not open", () => {
    const ts = etDate("2025-03-17", "07:00");
    expect(minutesToClose(ts)).toBe(0);
  });

  it("returns correct minutes when market is open", () => {
    const ts = etDate("2025-03-17", "15:30"); // 30 minutes to close
    const mins = minutesToClose(ts);
    expect(mins).toBeGreaterThanOrEqual(29);
    expect(mins).toBeLessThanOrEqual(31);
  });
});

describe("minutesToOpen", () => {
  it("returns 0 when market is open", () => {
    const ts = etDate("2025-03-17", "11:00");
    expect(minutesToOpen(ts)).toBe(0);
  });

  it("returns positive minutes when market is closed and next open is today", () => {
    const ts = etDate("2025-03-17", "07:00"); // 2.5h before open
    const mins = minutesToOpen(ts);
    expect(mins).toBeGreaterThan(100);
    expect(mins).toBeLessThan(200);
  });
});

// ============================================================================
// Blackout Windows — blackout-windows.ts (8.2)
// ============================================================================

describe("isInBlackout", () => {
  it("returns null when no blackout is active", () => {
    // Use a time that should not overlap any periodic blackout
    const ts = etDate("2025-02-03", "10:00"); // Monday, no OPEX, no earnings
    const result = isInBlackout("AAPL", ts);
    expect(result).toBeNull();
  });

  it("detects a runtime earnings blackout for the matching symbol", () => {
    const earningsTime = etDate("2025-08-15", "16:30");
    const bw = buildEarningsBlackout("MSFT", earningsTime);
    addBlackout(bw);

    // 12h before earnings — within the 24h window
    const during = new Date(earningsTime.getTime() - 12 * 60 * 60 * 1000);
    expect(isInBlackout("MSFT", during)).not.toBeNull();
  });

  it("does not apply a symbol-specific blackout to a different symbol", () => {
    const earningsTime = etDate("2025-08-20", "16:30");
    const bw = buildEarningsBlackout("GOOGL", earningsTime);
    addBlackout(bw);

    const during = new Date(earningsTime.getTime() - 12 * 60 * 60 * 1000);
    expect(isInBlackout("AAPL", during)).toBeNull();
  });

  it("detects OPEX on third Friday of a non-quad-witch month", () => {
    // Third Friday of January 2025 = January 17 (OPEX, not quad witch)
    const ts = etDate("2025-01-17", "10:00");
    const result = isInBlackout("SPY", ts);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("opex");
  });

  it("detects quad-witching on third Friday of March 2025", () => {
    // Third Friday of March 2025 = March 21
    const ts = etDate("2025-03-21", "10:00");
    const result = isInBlackout("SPY", ts);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("quad_witching");
  });

  it("detects quad-witching on third Friday of December 2025", () => {
    // Third Friday of December 2025 = December 19
    const ts = etDate("2025-12-19", "10:00");
    const result = isInBlackout("SPY", ts);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("quad_witching");
  });
});

describe("buildEarningsBlackout", () => {
  it("creates a window 24h before and 2h after earnings", () => {
    const earningsTime = new Date("2025-09-01T20:30:00Z");
    const bw = buildEarningsBlackout("NVDA", earningsTime);

    expect(bw.type).toBe("earnings");
    expect(bw.symbol).toBe("NVDA");
    expect(bw.blockNewPositions).toBe(true);
    expect(bw.blockAllTrading).toBe(false);

    const expectedStart = new Date(earningsTime.getTime() - 24 * 60 * 60 * 1000);
    const expectedEnd = new Date(earningsTime.getTime() + 2 * 60 * 60 * 1000);
    expect(bw.start.getTime()).toBe(expectedStart.getTime());
    expect(bw.end.getTime()).toBe(expectedEnd.getTime());
  });
});

describe("buildMacroBlackout", () => {
  it("creates a market-wide blackout with correct duration", () => {
    const releaseTime = new Date("2025-09-17T18:00:00Z"); // 14:00 ET FOMC
    const bw = buildMacroBlackout("FOMC_DECISION", releaseTime, 30, 60);

    expect(bw.type).toBe("macro_event");
    expect(bw.symbol).toBeUndefined();
    expect(bw.start.getTime()).toBe(releaseTime.getTime() - 30 * 60 * 1000);
    expect(bw.end.getTime()).toBe(releaseTime.getTime() + 60 * 60 * 1000);
  });
});

describe("getUpcomingBlackouts", () => {
  it("returns periodic blackouts within the horizon", () => {
    // Should always find at least one OPEX or quad witch in the next 14 days
    // unless we happen to test right after OPEX — use a large window to be safe
    const results = getUpcomingBlackouts(undefined, 60);
    expect(Array.isArray(results)).toBe(true);
    // Results should be sorted by start time
    for (let i = 1; i < results.length; i++) {
      expect(results[i].start.getTime()).toBeGreaterThanOrEqual(
        results[i - 1].start.getTime(),
      );
    }
  });
});
