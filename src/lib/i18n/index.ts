/**
 * i18n Module
 *
 * Provides translation functions and locale management
 */

import {
  Locale,
  defaultLocale,
  locales,
  dateFormats,
  currencyFormats,
  getDirection,
} from "./config";
import { allTranslations, TranslationKey } from "./translations";

// Current locale state
let currentLocale: Locale = defaultLocale;

/**
 * Set the current locale
 */
export function setLocale(locale: Locale): void {
  if (locales.includes(locale)) {
    currentLocale = locale;

    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = getDirection(locale);
    }
  }
}

/**
 * Get the current locale
 */
export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("locale") as Locale;
    if (stored && locales.includes(stored)) {
      currentLocale = stored;
    }
  }
  return currentLocale;
}

/**
 * Translate a key
 */
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const locale = getLocale();
  const dict = allTranslations[locale] || allTranslations[defaultLocale];
  let text: string =
    dict[key as string] || allTranslations[defaultLocale][key as string] || key;

  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`\\{${param}\\}`, "g"), String(value));
    });
  }

  return text;
}

/**
 * Format a date according to locale
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const locale = getLocale();
  const d = typeof date === "string" ? new Date(date) : date;
  const format = options || dateFormats[locale];

  return new Intl.DateTimeFormat(locale, format).format(d);
}

/**
 * Format a number according to locale
 */
export function formatNumber(
  num: number,
  options?: Intl.NumberFormatOptions,
): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Format currency according to locale
 */
export function formatCurrency(amount: number, currency?: string): string {
  const locale = getLocale();
  const config = currencyFormats[locale];

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: currency || config.currency,
  }).format(amount);
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const locale = getLocale();
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return rtf.format(-diffMinutes, "minute");
    }
    return rtf.format(-diffHours, "hour");
  }

  if (diffDays < 30) {
    return rtf.format(-diffDays, "day");
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return rtf.format(-diffMonths, "month");
  }

  const diffYears = Math.floor(diffMonths / 12);
  return rtf.format(-diffYears, "year");
}

/**
 * Detect user's preferred locale from browser
 */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;

  // Check localStorage first
  const stored = localStorage.getItem("locale") as Locale;
  if (stored && locales.includes(stored)) {
    return stored;
  }

  // Check browser language
  const browserLang = navigator.language.split("-")[0] as Locale;
  if (locales.includes(browserLang)) {
    return browserLang;
  }

  return defaultLocale;
}

// Re-export config
export * from "./config";
