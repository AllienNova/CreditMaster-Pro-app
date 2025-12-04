/**
 * React Hook for Translations
 * 
 * Provides translation functions and locale management in React components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  t, 
  getLocale, 
  setLocale, 
  formatDate, 
  formatNumber, 
  formatCurrency,
  formatRelativeTime,
  detectLocale,
  Locale,
  locales,
  localeNames,
  localeFlags
} from '@/lib/i18n';
import { TranslationKey } from '@/lib/i18n/translations';

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  // Initialize locale on mount
  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    setLocale(detected);
  }, []);

  // Change locale
  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  // Translation function
  const translate = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return t(key, params);
    },
    [locale] // Re-run when locale changes
  );

  return {
    t: translate,
    locale,
    setLocale: changeLocale,
    locales,
    localeNames,
    localeFlags,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime
  };
}

/**
 * Hook for formatted dates
 */
export function useFormattedDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const { locale } = useTranslation();
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    setFormatted(formatDate(date, options));
  }, [date, locale, options]);

  return formatted;
}

/**
 * Hook for formatted currency
 */
export function useFormattedCurrency(amount: number, currency?: string) {
  const { locale } = useTranslation();
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    setFormatted(formatCurrency(amount, currency));
  }, [amount, currency, locale]);

  return formatted;
}

/**
 * Hook for relative time
 */
export function useRelativeTime(date: Date | string) {
  const { locale } = useTranslation();
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    setFormatted(formatRelativeTime(date));
    
    // Update every minute for recent times
    const interval = setInterval(() => {
      setFormatted(formatRelativeTime(date));
    }, 60000);

    return () => clearInterval(interval);
  }, [date, locale]);

  return formatted;
}

