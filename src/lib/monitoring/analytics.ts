/**
 * Analytics Module for CPFI
 * 
 * Tracks user interactions, conversions, and feature usage.
 * Supports Google Analytics 4 and custom event tracking.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Initialize Google Analytics
export function initAnalytics(): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) {
    return;
  }

  // GA4 script is typically loaded via next/script in layout
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    send_page_view: false, // We'll send manually for SPA navigation
  });
}

// Track page views
export function trackPageView(path: string, title?: string): void {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title,
  });
}

// Track custom events
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  if (!window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// Predefined event trackers
export const analytics = {
  // User Events
  userSignUp: (method: 'email' | 'google' | 'github') => {
    trackEvent('sign_up', 'user', method);
  },

  userLogin: (method: 'email' | 'google' | 'github') => {
    trackEvent('login', 'user', method);
  },

  // Dispute Events
  disputeCreated: (bureau: string, templateId?: string) => {
    trackEvent('dispute_created', 'disputes', bureau);
    if (templateId) {
      trackEvent('template_used', 'disputes', templateId);
    }
  },

  disputeSent: (bureau: string) => {
    trackEvent('dispute_sent', 'disputes', bureau);
  },

  disputeResolved: (bureau: string, outcome: string) => {
    trackEvent('dispute_resolved', 'disputes', `${bureau}:${outcome}`);
  },

  // Strategy Events
  strategyViewed: (strategyId: string) => {
    trackEvent('strategy_viewed', 'strategies', strategyId);
  },

  strategyApplied: (strategyId: string) => {
    trackEvent('strategy_applied', 'strategies', strategyId);
  },

  // Subscription Events
  subscriptionViewed: (plan: string) => {
    trackEvent('view_item', 'subscription', plan);
  },

  subscriptionStarted: (plan: string, value: number) => {
    trackEvent('begin_checkout', 'subscription', plan, value);
  },

  subscriptionCompleted: (plan: string, value: number) => {
    trackEvent('purchase', 'subscription', plan, value);
  },

  subscriptionCanceled: (plan: string) => {
    trackEvent('subscription_canceled', 'subscription', plan);
  },

  // Feature Usage
  featureUsed: (feature: string) => {
    trackEvent('feature_used', 'engagement', feature);
  },

  documentUploaded: (type: string) => {
    trackEvent('document_uploaded', 'documents', type);
  },

  letterGenerated: (type: string) => {
    trackEvent('letter_generated', 'ai', type);
  },

  // Credit Score Events
  scoreTracked: (bureau: string) => {
    trackEvent('score_tracked', 'credit_scores', bureau);
  },

  scoreImproved: (points: number) => {
    trackEvent('score_improved', 'credit_scores', 'improvement', points);
  },

  // Error Tracking (non-fatal)
  errorOccurred: (errorType: string, errorMessage: string) => {
    trackEvent('error', 'errors', `${errorType}: ${errorMessage}`);
  },
};

export default analytics;

