/**
 * Internationalization (i18n) Configuration
 *
 * Multi-language support for Fynvita
 */

export const defaultLocale = "en";

export const locales = ["en", "es", "fr", "de", "pt", "zh"] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  zh: "中文",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  pt: "🇧🇷",
  zh: "🇨🇳",
};

// RTL languages (none currently, but ready for Arabic, Hebrew, etc.)
export const rtlLocales: Locale[] = [];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}

// Date/time formatting options per locale
export const dateFormats: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: { month: "short", day: "numeric", year: "numeric" },
  es: { day: "numeric", month: "short", year: "numeric" },
  fr: { day: "numeric", month: "short", year: "numeric" },
  de: { day: "numeric", month: "short", year: "numeric" },
  pt: { day: "numeric", month: "short", year: "numeric" },
  zh: { year: "numeric", month: "short", day: "numeric" },
};

// Currency formatting per locale
export const currencyFormats: Record<
  Locale,
  { currency: string; locale: string }
> = {
  en: { currency: "USD", locale: "en-US" },
  es: { currency: "EUR", locale: "es-ES" },
  fr: { currency: "EUR", locale: "fr-FR" },
  de: { currency: "EUR", locale: "de-DE" },
  pt: { currency: "BRL", locale: "pt-BR" },
  zh: { currency: "CNY", locale: "zh-CN" },
};
