/**
 * Session Hours — 8.3
 *
 * Session type detection and boundary helpers.
 * Session boundaries from policy.calendar.yaml#sessions[XNYS]:
 *   pre_market:   04:00–09:30 ET
 *   regular:      09:30–16:00 ET
 *   post_market:  16:00–20:00 ET
 *   closed:       everything else
 */

import {
  isMarketOpen,
  isPreMarket,
  isPostMarket,
  getNextMarketOpen,
  getMarketSession,
  toETComponents,
  buildDateInET,
} from "./market-calendar";

export type SessionType = "pre_market" | "regular" | "post_market" | "closed";

export interface SessionBoundaries {
  preMarketOpen: Date;
  regularOpen: Date;
  regularClose: Date;
  postMarketClose: Date;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Returns the current session type for the given timestamp.
 * Defaults to now.
 */
export function getCurrentSession(timestamp?: Date): SessionType {
  const ts = timestamp ?? new Date();

  if (isMarketOpen(ts)) return "regular";
  if (isPreMarket(ts)) return "pre_market";
  if (isPostMarket(ts)) return "post_market";
  return "closed";
}

/**
 * Returns the four session boundaries for the calendar day containing `date`.
 * On early-close days, regularClose is set to 13:00 ET and postMarketClose
 * remains 20:00 ET (extended hours still apply per policy).
 * On weekends and holidays these boundaries are still returned as calendar
 * values — callers should check isMarketOpen / session type separately.
 */
export function getSessionBoundaries(date?: Date): SessionBoundaries {
  const ts = date ?? new Date();
  const { year, month, day } = toETComponents(ts);

  const preMarketOpen = buildDateInET(year, month, day, 4, 0);
  const regularOpen = buildDateInET(year, month, day, 9, 30);

  // Check for early-close: if 2025-07-03 etc., close is 13:00 ET.
  // getMarketSession is the authoritative source for session type.
  const session = getMarketSession(ts);
  const closeHour = session.type === "half_day" ? 13 : 16;
  const closeMin = session.type === "half_day" ? 0 : 0;

  const regularClose = buildDateInET(year, month, day, closeHour, closeMin);
  const postMarketClose = buildDateInET(year, month, day, 20, 0);

  return { preMarketOpen, regularOpen, regularClose, postMarketClose };
}

/**
 * Returns whole minutes until the regular session closes.
 * Returns 0 if the market is not currently in a regular session.
 * Returns 0 after market close.
 */
export function minutesToClose(timestamp?: Date): number {
  const ts = timestamp ?? new Date();
  if (!isMarketOpen(ts)) return 0;

  const { regularClose } = getSessionBoundaries(ts);
  const diffMs = regularClose.getTime() - ts.getTime();
  return diffMs > 0 ? Math.floor(diffMs / 60_000) : 0;
}

/**
 * Returns whole minutes until the next regular session opens.
 * Returns 0 if the market is currently open.
 */
export function minutesToOpen(timestamp?: Date): number {
  const ts = timestamp ?? new Date();
  if (isMarketOpen(ts)) return 0;

  const nextOpen = getNextMarketOpen(ts);
  const diffMs = nextOpen.getTime() - ts.getTime();
  return diffMs > 0 ? Math.floor(diffMs / 60_000) : 0;
}
