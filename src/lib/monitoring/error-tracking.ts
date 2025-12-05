/**
 * Error Tracking Service
 * Captures and reports errors for monitoring
 */

import { logger } from './logger';

interface ErrorContext {
  userId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

interface TrackedError {
  id: string;
  name: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  fingerprint: string;
}

// In-memory error store (use external service like Sentry in production)
const recentErrors: TrackedError[] = [];
const MAX_STORED_ERRORS = 100;

// Generate unique error ID
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate fingerprint for deduplication
function generateFingerprint(error: Error, context: ErrorContext): string {
  const parts = [
    error.name,
    error.message.substring(0, 100),
    context.url || '',
    context.method || '',
  ];
  return parts.join('|');
}

// Track an error
export function trackError(error: Error, context: ErrorContext = {}): string {
  const errorId = generateErrorId();
  const fingerprint = generateFingerprint(error, context);

  const trackedError: TrackedError = {
    id: errorId,
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    fingerprint,
  };

  // Store error
  recentErrors.unshift(trackedError);
  if (recentErrors.length > MAX_STORED_ERRORS) {
    recentErrors.pop();
  }

  // Log error
  logger.error(`Error tracked: ${errorId}`, error, {
    ...context,
    fingerprint,
  });

  // In production, send to external service
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Sentry integration would go here
    // Sentry.captureException(error, { extra: context });
  }

  return errorId;
}

// Track API error
export function trackApiError(
  error: Error,
  request: Request,
  statusCode: number
): string {
  return trackError(error, {
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    tags: {
      statusCode: String(statusCode),
      type: 'api_error',
    },
  });
}

// Track unhandled rejection
export function trackUnhandledRejection(reason: unknown): string {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  return trackError(error, {
    tags: { type: 'unhandled_rejection' },
  });
}

// Get recent errors (for admin dashboard)
export function getRecentErrors(limit: number = 20): TrackedError[] {
  return recentErrors.slice(0, limit);
}

// Get error by ID
export function getErrorById(id: string): TrackedError | undefined {
  return recentErrors.find((e) => e.id === id);
}

// Get error statistics
export function getErrorStats() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const errorsLastHour = recentErrors.filter(
    (e) => new Date(e.timestamp).getTime() > oneHourAgo
  ).length;

  const errorsLastDay = recentErrors.filter(
    (e) => new Date(e.timestamp).getTime() > oneDayAgo
  ).length;

  const errorsByType = recentErrors.reduce((acc, e) => {
    const type = e.context.tags?.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: recentErrors.length,
    lastHour: errorsLastHour,
    lastDay: errorsLastDay,
    byType: errorsByType,
  };
}

// Global error handler setup
export function setupGlobalErrorHandlers() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      trackError(event.error || new Error(event.message), {
        tags: { type: 'window_error' },
        extra: { filename: event.filename, lineno: event.lineno },
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      trackUnhandledRejection(event.reason);
    });
  }
}

