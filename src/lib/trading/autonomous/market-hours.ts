/**
 * Market Hours Utility
 *
 * Determines whether the US equity market is currently open.
 * Used by the autonomous trading service to gate signal scanning
 * and trade execution to market hours only.
 */

import { DEFAULT_MARKET_HOURS, type MarketHoursConfig } from "./autonomous-types";

// ============================================================================
// US MARKET HOLIDAYS (2026)
// ============================================================================

const US_MARKET_HOLIDAYS_2026 = new Set([
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Day
  "2026-02-16", // Presidents' Day
  "2026-04-03", // Good Friday
  "2026-05-25", // Memorial Day
  "2026-07-03", // Independence Day (observed)
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
]);

// ============================================================================
// TIMEZONE CONVERSION
// ============================================================================

/**
 * Get current time in US Eastern Time.
 * Uses Intl.DateTimeFormat for accurate timezone conversion
 * including DST handling.
 */
export function getEasternTime(now?: Date): {
  hour: number;
  minute: number;
  dayOfWeek: number;
  dateStr: string;
} {
  const date = now ?? new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[get("weekday")] ?? 0;
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;

  return { hour, minute, dayOfWeek, dateStr };
}

// ============================================================================
// MARKET STATUS
// ============================================================================

export interface MarketStatus {
  isOpen: boolean;
  reason: string;
  nextOpenAt?: Date;
  minutesUntilClose?: number;
}

/**
 * Check if the US equity market is currently open.
 *
 * Considers:
 * - Trading days (Mon-Fri)
 * - Market hours (9:30 AM - 4:00 PM ET)
 * - US market holidays
 */
export function isMarketOpen(
  config: MarketHoursConfig = DEFAULT_MARKET_HOURS,
  now?: Date,
): MarketStatus {
  const et = getEasternTime(now);

  // Check if it's a trading day
  if (!config.tradingDays.includes(et.dayOfWeek)) {
    return {
      isOpen: false,
      reason: `Market closed: weekend (day ${et.dayOfWeek})`,
    };
  }

  // Check holidays
  if (US_MARKET_HOLIDAYS_2026.has(et.dateStr)) {
    return {
      isOpen: false,
      reason: `Market closed: holiday (${et.dateStr})`,
    };
  }

  // Check market hours
  const currentMinutes = et.hour * 60 + et.minute;
  const openMinutes = config.openHour * 60 + config.openMinute;
  const closeMinutes = config.closeHour * 60 + config.closeMinute;

  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      reason: `Market closed: pre-market (opens at ${config.openHour}:${String(config.openMinute).padStart(2, "0")} ET)`,
    };
  }

  if (currentMinutes >= closeMinutes) {
    return {
      isOpen: false,
      reason: `Market closed: after hours (closed at ${config.closeHour}:${String(config.closeMinute).padStart(2, "0")} ET)`,
    };
  }

  const minutesUntilClose = closeMinutes - currentMinutes;

  return {
    isOpen: true,
    reason: `Market open (${minutesUntilClose} min until close)`,
    minutesUntilClose,
  };
}

/**
 * Check if we're within 15 minutes of market close.
 * Used to prevent opening new positions too close to close.
 */
export function isNearMarketClose(
  thresholdMinutes: number = 15,
  config: MarketHoursConfig = DEFAULT_MARKET_HOURS,
  now?: Date,
): boolean {
  const status = isMarketOpen(config, now);
  if (!status.isOpen) return false;
  return (status.minutesUntilClose ?? 0) <= thresholdMinutes;
}
