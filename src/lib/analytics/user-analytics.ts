/**
 * User Analytics Service
 *
 * Tracks user behavior for product insights and optimization
 */

import { createClient } from "@supabase/supabase-js";

// Event types
export type AnalyticsEvent =
  | "page_view"
  | "feature_used"
  | "button_click"
  | "form_submit"
  | "error_occurred"
  | "dispute_started"
  | "dispute_completed"
  | "report_uploaded"
  | "score_viewed"
  | "subscription_started"
  | "subscription_cancelled"
  | "onboarding_step"
  | "search_performed"
  | "help_accessed"
  | "notification_clicked";

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: string;
  page?: string;
  referrer?: string;
  userAgent?: string;
}

// Session management
let sessionId: string | null = null;

function getSessionId(): string {
  if (typeof window === "undefined") return "server";

  if (!sessionId) {
    sessionId =
      sessionStorage.getItem("analytics_session") ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("analytics_session", sessionId);
  }
  return sessionId;
}

// Queue for batching events
const eventQueue: AnalyticsPayload[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

/**
 * Track an analytics event
 */
export function track(
  event: AnalyticsEvent,
  properties?: Record<string, any>,
  userId?: string,
): void {
  const payload: AnalyticsPayload = {
    event,
    userId,
    sessionId: getSessionId(),
    properties,
    timestamp: new Date().toISOString(),
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  eventQueue.push(payload);

  // Batch events and flush every 5 seconds or when queue reaches 10 events
  if (eventQueue.length >= 10) {
    flushEvents();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushEvents, 5000);
  }
}

/**
 * Flush queued events to the server
 */
async function flushEvents(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue.length = 0;

  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
  } catch (_error) {
    // Re-queue failed events
    eventQueue.push(...events);
    // UserAnalytics error: Failed to send analytics
    void _error;
  }
}

/**
 * Track page view
 */
export function trackPageView(page: string, userId?: string): void {
  track("page_view", { page }, userId);
}

/**
 * Track feature usage
 */
export function trackFeatureUsed(feature: string, userId?: string): void {
  track("feature_used", { feature }, userId);
}

/**
 * Track button click
 */
export function trackClick(
  buttonId: string,
  context?: string,
  userId?: string,
): void {
  track("button_click", { buttonId, context }, userId);
}

/**
 * Track form submission
 */
export function trackFormSubmit(
  formId: string,
  success: boolean,
  userId?: string,
): void {
  track("form_submit", { formId, success }, userId);
}

/**
 * Track error
 */
export function trackError(
  error: string,
  context?: string,
  userId?: string,
): void {
  track("error_occurred", { error, context }, userId);
}

/**
 * Track dispute flow
 */
export function trackDispute(
  action: "started" | "completed" | "abandoned",
  disputeType?: string,
  userId?: string,
): void {
  const event = action === "started" ? "dispute_started" : "dispute_completed";
  track(event, { action, disputeType }, userId);
}

/**
 * Track onboarding progress
 */
export function trackOnboarding(
  step: number,
  stepName: string,
  userId?: string,
): void {
  track("onboarding_step", { step, stepName }, userId);
}

/**
 * Identify user for analytics
 */
export function identify(userId: string, traits?: Record<string, any>): void {
  track("page_view", { ...traits, identified: true }, userId);
}

/**
 * Reset analytics session (on logout)
 */
export function resetSession(): void {
  sessionId = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("analytics_session");
  }
}

// Flush events before page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushEvents);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEvents();
    }
  });
}
