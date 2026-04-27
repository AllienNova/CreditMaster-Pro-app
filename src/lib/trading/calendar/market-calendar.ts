/**
 * Market Calendar — 8.1
 *
 * US equity market session detection using NYSE/NASDAQ hours.
 * All session boundaries defined in America/New_York (ET) per the canonical policy.
 * Times from policy.calendar.yaml#sessions[XNYS]:
 *   pre-market:    04:00–09:30 ET  (09:00–14:30 UTC)
 *   regular:       09:30–16:00 ET  (14:30–21:00 UTC)
 *   post-market:   16:00–20:00 ET  (21:00–01:00 UTC next day)
 *
 * Holiday dates are calendar facts (NYSE published schedule), not policy thresholds.
 * Early-close rule: 13:00 ET (18:00 UTC) per policy.calendar.yaml#early_close_days.
 */

export interface MarketSession {
  date: string; // YYYY-MM-DD
  type: "regular" | "half_day" | "holiday" | "weekend";
  regularOpen?: string; // HH:mm in America/New_York
  regularClose?: string;
  preMarketOpen?: string;
  postMarketClose?: string;
}

// ============================================================================
// INTERNAL HELPERS — time in ET
// ============================================================================

/**
 * Convert a UTC Date to an object containing ET date/time components.
 */
function toETComponents(ts: Date): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0=Sun…6=Sat
  dateString: string; // YYYY-MM-DD
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(ts);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";

  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10);
  const day = parseInt(get("day"), 10);
  let hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  // Intl can return 24 for midnight hour in some runtimes
  if (hour === 24) hour = 0;

  const weekdayStr = get("weekday"); // "Sun", "Mon", …
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekdayStr] ?? ts.getDay();

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const dateString = `${year}-${mm}-${dd}`;

  return { year, month, day, hour, minute, dayOfWeek, dateString };
}

/** Minutes since ET midnight for a given timestamp. */
function etMinuteOfDay(ts: Date): number {
  const { hour, minute } = toETComponents(ts);
  return hour * 60 + minute;
}

// ============================================================================
// HOLIDAY CALENDAR — NYSE published schedule 2025–2027
// Format: "YYYY-MM-DD" strings in ET. These are calendar facts.
// ============================================================================

const NYSE_HOLIDAYS = new Set<string>([
  // 2025
  "2025-01-01", // New Year's Day
  "2025-01-20", // MLK Day
  "2025-02-17", // Presidents' Day
  "2025-04-18", // Good Friday
  "2025-05-26", // Memorial Day
  "2025-06-19", // Juneteenth
  "2025-07-04", // Independence Day
  "2025-09-01", // Labor Day
  "2025-11-27", // Thanksgiving
  "2025-12-25", // Christmas

  // 2026
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Day
  "2026-02-16", // Presidents' Day
  "2026-04-03", // Good Friday
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed; July 4 falls on Saturday)
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas

  // 2027
  "2027-01-01", // New Year's Day
  "2027-01-18", // MLK Day
  "2027-02-15", // Presidents' Day
  "2027-03-26", // Good Friday
  "2027-05-31", // Memorial Day
  "2027-06-18", // Juneteenth (observed; June 19 falls on Saturday)
  "2027-07-05", // Independence Day (observed; July 4 falls on Sunday)
  "2027-09-06", // Labor Day
  "2027-11-25", // Thanksgiving
  "2027-12-24", // Christmas (observed; Dec 25 falls on Saturday)
]);

/**
 * Early close days: market closes at 13:00 ET (18:00 UTC).
 * Rule: day-before-Independence-Day, Black Friday, Christmas Eve
 * per policy.calendar.yaml#early_close_days.
 */
const EARLY_CLOSE_DAYS = new Set<string>([
  // 2025
  "2025-07-03", // day before Independence Day
  "2025-11-28", // Black Friday
  "2025-12-24", // Christmas Eve

  // 2026 — July 4 is Saturday so July 3 is the observed holiday; July 2 is early close
  "2026-07-02", // day before observed Independence Day holiday
  "2026-11-27", // Black Friday
  "2026-12-24", // Christmas Eve

  // 2027 — July 4 is Sunday so July 5 is the observed holiday; July 2 is early close
  "2027-07-02", // day before observed Independence Day weekend
  "2027-11-26", // Black Friday
  "2027-12-23", // Christmas Eve (observed; Dec 24 falls on Friday, Dec 25 on Saturday)
]);

// Session boundary constants in minutes-since-ET-midnight
const PRE_MARKET_OPEN_MIN = 4 * 60; // 04:00 ET
const REGULAR_OPEN_MIN = 9 * 60 + 30; // 09:30 ET
const REGULAR_CLOSE_MIN = 16 * 60; // 16:00 ET
const EARLY_CLOSE_MIN = 13 * 60; // 13:00 ET
const POST_MARKET_CLOSE_MIN = 20 * 60; // 20:00 ET

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Returns true if the market is open for regular trading at the given timestamp.
 * Defaults to now if no timestamp provided.
 */
export function isMarketOpen(timestamp?: Date): boolean {
  const ts = timestamp ?? new Date();
  const { dayOfWeek, dateString } = toETComponents(ts);

  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  if (NYSE_HOLIDAYS.has(dateString)) return false;

  const min = etMinuteOfDay(ts);
  const closeMin = EARLY_CLOSE_DAYS.has(dateString)
    ? EARLY_CLOSE_MIN
    : REGULAR_CLOSE_MIN;

  return min >= REGULAR_OPEN_MIN && min < closeMin;
}

/**
 * Returns true if the current time is in the pre-market session (04:00–09:30 ET).
 */
export function isPreMarket(timestamp?: Date): boolean {
  const ts = timestamp ?? new Date();
  const { dayOfWeek, dateString } = toETComponents(ts);

  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  if (NYSE_HOLIDAYS.has(dateString)) return false;

  const min = etMinuteOfDay(ts);
  return min >= PRE_MARKET_OPEN_MIN && min < REGULAR_OPEN_MIN;
}

/**
 * Returns true if the current time is in the post-market session (16:00–20:00 ET).
 * On early-close days post-market begins at 13:00 ET.
 */
export function isPostMarket(timestamp?: Date): boolean {
  const ts = timestamp ?? new Date();
  const { dayOfWeek, dateString } = toETComponents(ts);

  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  if (NYSE_HOLIDAYS.has(dateString)) return false;

  const min = etMinuteOfDay(ts);
  const postStart = EARLY_CLOSE_DAYS.has(dateString)
    ? EARLY_CLOSE_MIN
    : REGULAR_CLOSE_MIN;

  return min >= postStart && min < POST_MARKET_CLOSE_MIN;
}

/**
 * Returns true if the given date is a NYSE market holiday.
 */
export function isHoliday(date?: Date): boolean {
  const ts = date ?? new Date();
  const { dateString } = toETComponents(ts);
  return NYSE_HOLIDAYS.has(dateString);
}

/**
 * Returns the next regular market open as a UTC Date.
 * Skips weekends and holidays.
 */
export function getNextMarketOpen(from?: Date): Date {
  const ts = from ?? new Date();
  // Start from a candidate date: if we are before open today, use today; otherwise next day
  let candidate = new Date(ts);

  for (let i = 0; i < 10; i++) {
    const { dayOfWeek, dateString } = toETComponents(candidate);

    if (
      dayOfWeek !== 0 &&
      dayOfWeek !== 6 &&
      !NYSE_HOLIDAYS.has(dateString)
    ) {
      const min = etMinuteOfDay(candidate);
      if (min <= REGULAR_OPEN_MIN) {
        // Market hasn't opened yet today (or is exactly at open) — return today's open
        return buildETTime(candidate, 9, 30);
      }
    }

    // Advance one calendar day (add 24 hours; ET midnight differences handled by toETComponents)
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
    // Snap to next-day ET open candidate
    const { year, month, day } = toETComponents(candidate);
    candidate = buildDateInET(year, month, day, 9, 30);
  }

  // Fallback — should never reach here under normal operation
  return buildETTime(candidate, 9, 30);
}

/**
 * Returns a MarketSession descriptor for the given date.
 */
export function getMarketSession(date?: Date): MarketSession {
  const ts = date ?? new Date();
  const { dayOfWeek, dateString } = toETComponents(ts);

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { date: dateString, type: "weekend" };
  }

  if (NYSE_HOLIDAYS.has(dateString)) {
    return { date: dateString, type: "holiday" };
  }

  if (EARLY_CLOSE_DAYS.has(dateString)) {
    return {
      date: dateString,
      type: "half_day",
      regularOpen: "09:30",
      regularClose: "13:00",
      preMarketOpen: "04:00",
      postMarketClose: "20:00",
    };
  }

  return {
    date: dateString,
    type: "regular",
    regularOpen: "09:30",
    regularClose: "16:00",
    preMarketOpen: "04:00",
    postMarketClose: "20:00",
  };
}

// ============================================================================
// INTERNAL UTILITIES
// ============================================================================

/**
 * Build a UTC Date representing a specific HH:MM in America/New_York on the
 * same calendar day as `anchor`.
 */
function buildETTime(anchor: Date, hour: number, minute: number): Date {
  const { year, month, day } = toETComponents(anchor);
  return buildDateInET(year, month, day, hour, minute);
}

/**
 * Build a UTC Date for YYYY-MM-DD HH:MM in America/New_York.
 * Uses binary search over UTC offsets to find the correct UTC epoch.
 */
function buildDateInET(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  // Estimate UTC offset: ET is UTC-5 (EST) or UTC-4 (EDT)
  // Try both offsets and pick the one that resolves to the correct ET time.
  for (const offsetH of [4, 5]) {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const hh = String(hour).padStart(2, "0");
    const mi = String(minute).padStart(2, "0");
    const candidate = new Date(`${year}-${mm}-${dd}T${hh}:${mi}:00.000Z`);
    // Adjust by the trial offset
    const adjusted = new Date(candidate.getTime() + offsetH * 60 * 60 * 1000);
    const check = toETComponents(adjusted);
    if (
      check.year === year &&
      check.month === month &&
      check.day === day &&
      check.hour === hour &&
      check.minute === minute
    ) {
      return adjusted;
    }
  }
  // If neither offset matched exactly, fall back to UTC-5
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mi = String(minute).padStart(2, "0");
  return new Date(
    `${year}-${mm}-${dd}T${hh}:${mi}:00.000Z`,
  );
}

// Re-export the ET-date builder for use by other calendar modules
export { buildDateInET, toETComponents };
