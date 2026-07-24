/**
 * Blackout Windows — 8.2
 *
 * Implements K-01 through K-06 blackout enforcement from policy.calendar.yaml.
 *
 * Blackout types and their policy sources:
 *   macro_event   — K-01/K-02: FOMC, CPI, NFP, PPI configurable windows
 *   earnings      — K-03: 24h before / 2h after earnings (no new positions)
 *   dividend      — K-04: ex-date hold-only flag (tracked externally)
 *   opex          — K-06: third Friday of each month
 *   quad_witching — K-05: third Friday of March/June/September/December (🔒)
 *
 * Runtime blackout windows (earnings, macro events) are added via addBlackout().
 * OPEX and quad-witching windows are computed dynamically from calendar rules.
 */

import { toETComponents, buildDateInET } from "./market-calendar";

export type BlackoutType =
  | "macro_event"
  | "earnings"
  | "dividend"
  | "opex"
  | "quad_witching";

export interface BlackoutWindow {
  type: BlackoutType;
  symbol?: string; // undefined = market-wide
  start: Date;
  end: Date;
  reason: string;
  blockNewPositions: boolean;
  blockAllTrading: boolean;
}

// ============================================================================
// RUNTIME BLACKOUT STORE — for earnings and macro events added at runtime
// ============================================================================

const runtimeBlackouts: BlackoutWindow[] = [];

/**
 * Add a blackout window to the runtime store.
 * Existing windows are not deduplicated — callers are responsible.
 */
export function addBlackout(window: BlackoutWindow): void {
  runtimeBlackouts.push(window);
}

// ============================================================================
// OPEX / QUAD-WITCHING COMPUTATION
// ============================================================================

/**
 * Returns the date of the Nth occurrence of a given weekday in a month/year.
 * weekday: 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
 */
function nthWeekdayOfMonth(
  year: number,
  month: number, // 1-12
  weekday: number,
  n: number, // 1=first, 2=second, 3=third, …
): Date {
  // Find the first occurrence
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstDow = firstDay.getUTCDay();
  const offset = (weekday - firstDow + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return buildDateInET(year, month, day, 0, 0);
}

const QUAD_WITCHING_MONTHS = new Set([3, 6, 9, 12]);

/**
 * Generate OPEX/quad-witching windows within [startYear, endYear] inclusive.
 * quad_witching supersedes opex when they overlap (same day).
 */
function generatePeriodicBlackouts(
  startYear: number,
  endYear: number,
): BlackoutWindow[] {
  const windows: BlackoutWindow[] = [];

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const thirdFriday = nthWeekdayOfMonth(year, month, 5, 3); // 5=Friday
      const { year: y, month: m, day: d } = toETComponents(thirdFriday);
      const isQuadWitch = QUAD_WITCHING_MONTHS.has(month);

      // Blackout runs from market open to market close on the third Friday.
      // For simplicity we span the full session: 04:00–20:00 ET.
      const start = buildDateInET(y, m, d, 4, 0);
      const end = buildDateInET(y, m, d, 20, 0);

      if (isQuadWitch) {
        windows.push({
          type: "quad_witching",
          symbol: undefined,
          start,
          end,
          reason: `Quad witching — ${year}-${String(month).padStart(2, "0")} (K-05, locked)`,
          blockNewPositions: true,
          blockAllTrading: false,
        });
      } else {
        windows.push({
          type: "opex",
          symbol: undefined,
          start,
          end,
          reason: `Monthly OPEX — ${year}-${String(month).padStart(2, "0")} (K-06)`,
          blockNewPositions: true,
          blockAllTrading: false,
        });
      }
    }
  }

  return windows;
}

// Pre-generate periodic windows for 2025–2027
const PERIODIC_BLACKOUTS = generatePeriodicBlackouts(2025, 2027);

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Returns the first active blackout window for the given symbol at the given
 * timestamp. Returns null if no blackout applies.
 *
 * Precedence: runtime blackouts checked first, then periodic (OPEX/quad).
 */
export function isInBlackout(
  symbol: string,
  timestamp?: Date,
): BlackoutWindow | null {
  const ts = timestamp ?? new Date();

  // Check runtime blackouts (earnings, macro events, dividends)
  for (const bw of runtimeBlackouts) {
    if (ts >= bw.start && ts < bw.end) {
      // Market-wide blackouts apply to all symbols; symbol-specific only to that symbol
      if (bw.symbol === undefined || bw.symbol === symbol) {
        return bw;
      }
    }
  }

  // Check periodic blackouts (opex, quad_witching)
  for (const bw of PERIODIC_BLACKOUTS) {
    if (ts >= bw.start && ts < bw.end) {
      return bw;
    }
  }

  return null;
}

/**
 * Returns upcoming blackout windows within the next `days` days.
 * If `symbol` is provided, includes symbol-specific + market-wide windows.
 * If `symbol` is omitted, returns only market-wide periodic windows.
 */
export function getUpcomingBlackouts(
  symbol?: string,
  days: number = 14,
): BlackoutWindow[] {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const results: BlackoutWindow[] = [];

  // Runtime windows
  for (const bw of runtimeBlackouts) {
    if (bw.end > now && bw.start < horizon) {
      if (symbol === undefined || bw.symbol === undefined || bw.symbol === symbol) {
        results.push(bw);
      }
    }
  }

  // Periodic windows (always market-wide)
  for (const bw of PERIODIC_BLACKOUTS) {
    if (bw.end > now && bw.start < horizon) {
      results.push(bw);
    }
  }

  return results.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Build a standard earnings blackout window.
 * Policy K-03: 24h before, 2h after earnings announcement.
 * blockNewPositions=true, blockAllTrading=false.
 */
export function buildEarningsBlackout(
  symbol: string,
  earningsTimestamp: Date,
): BlackoutWindow {
  const start = new Date(
    earningsTimestamp.getTime() - 24 * 60 * 60 * 1000,
  );
  const end = new Date(
    earningsTimestamp.getTime() + 2 * 60 * 60 * 1000,
  );
  return {
    type: "earnings",
    symbol,
    start,
    end,
    reason: `Earnings blackout for ${symbol} — K-03 (24h before, 2h after)`,
    blockNewPositions: true,
    blockAllTrading: false,
  };
}

/**
 * Build a macro event blackout window.
 * Caller provides event code, release time, and pre/post durations in minutes.
 * Policy K-01/K-02.
 */
export function buildMacroBlackout(
  eventCode: string,
  releaseTime: Date,
  minutesBefore: number,
  minutesAfter: number,
): BlackoutWindow {
  const start = new Date(releaseTime.getTime() - minutesBefore * 60 * 1000);
  const end = new Date(releaseTime.getTime() + minutesAfter * 60 * 1000);
  return {
    type: "macro_event",
    symbol: undefined,
    start,
    end,
    reason: `Macro blackout: ${eventCode} (K-01/K-02)`,
    blockNewPositions: true,
    blockAllTrading: false,
  };
}
