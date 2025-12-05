/**
 * Sentry Error Tracking Configuration
 *
 * This module provides error tracking utilities.
 * To enable Sentry, install @sentry/nextjs:
 *   npm install @sentry/nextjs
 *
 * Then uncomment the Sentry imports and implementations.
 */

const SENTRY_DSN = process.env.SENTRY_DSN;

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

// Error storage for development/fallback
const errorLog: Array<{ error: Error; context?: Record<string, unknown>; timestamp: Date }> = [];
let currentUser: { id: string; email?: string; subscription?: string } | null = null;

export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured. Install @sentry/nextjs for production error tracking.');
    return;
  }

  // When @sentry/nextjs is installed, initialize here:
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.init({ dsn: SENTRY_DSN, ... });
  console.log('[Sentry] Ready for initialization with DSN');
}

// Capture errors - logs locally when Sentry not configured
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): string {
  const errorId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  errorLog.push({ error, context, timestamp: new Date() });

  // Keep only last 100 errors in memory
  if (errorLog.length > 100) {
    errorLog.shift();
  }

  console.error('[Error Captured]', { errorId, error: error.message, context });

  return errorId;
}

// Capture messages
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): string {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const logFn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.info;
  logFn(`[${level.toUpperCase()}]`, message, context);

  return messageId;
}

// Set user context
export function setUser(user: {
  id: string;
  email?: string;
  subscription?: string;
}): void {
  currentUser = user;
}

// Clear user context (on logout)
export function clearUser(): void {
  currentUser = null;
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  category: string,
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Breadcrumb:${category}]`, message, data);
  }
}

// Performance transaction placeholder
export function startTransaction(
  name: string,
  op: string
): null {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Transaction:${op}]`, name);
  }
  return null;
}

// Get current error log (for debugging)
export function getErrorLog(): typeof errorLog {
  return [...errorLog];
}

// Get current user context
export function getCurrentUser(): typeof currentUser {
  return currentUser;
}

export default {
  initSentry,
  captureError,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  getErrorLog,
  getCurrentUser,
};

