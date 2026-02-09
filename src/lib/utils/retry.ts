/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides robust retry logic for external API calls to handle
 * transient failures gracefully.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  retryableStatusCodes?: number[];
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'EHOSTUNREACH'
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

/**
 * Check if an error is retryable
 */
interface RetryableError extends Error {
  code?: string;
  status?: number;
}

function isRetryableError(error: unknown, options: Required<Omit<RetryOptions, 'onRetry'>>): boolean {
  const err = error as RetryableError;
  // Network errors
  if (err.code && options.retryableErrors.includes(err.code)) {
    return true;
  }

  // HTTP status codes
  if (err.status && options.retryableStatusCodes.includes(err.status)) {
    return true;
  }

  // Rate limiting
  if (err.message?.toLowerCase().includes('rate limit')) {
    return true;
  }

  // Timeout errors
  if (err.message?.toLowerCase().includes('timeout')) {
    return true;
  }

  // Connection errors
  if (err.message?.toLowerCase().includes('connection')) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with jitter for exponential backoff
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'onRetry'>>): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);
  // Add jitter (±25%)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt > opts.maxRetries || !isRetryableError(error, opts)) {
        throw error;
      }
      
      // Calculate delay
      const delay = calculateDelay(attempt, opts);
      
      // Call retry callback if provided
      if (options?.onRetry) {
        options.onRetry(error instanceof Error ? error : new Error(String(error)), attempt);
      }
      
      // Log retry attempt
      // Retrying after transient failure
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Create a retryable fetch wrapper
 */
export function createRetryableFetch(options?: RetryOptions) {
  return async function retryableFetch(
    url: string | URL,
    init?: RequestInit
  ): Promise<Response> {
    return withRetry(async () => {
      const response = await fetch(url, init);
      
      // Throw on retryable status codes
      if (!response.ok && DEFAULT_OPTIONS.retryableStatusCodes.includes(response.status)) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as RetryableError;
        error.status = response.status;
        throw error;
      }
      
      return response;
    }, options);
  };
}

// Pre-configured retry functions for different services
// Note: onRetry callbacks are no-ops in production to avoid console logging
const noopRetryCallback = () => { /* retry in progress */ };

export const experianRetry = <T>(fn: () => Promise<T>) => withRetry(fn, {
  maxRetries: 3,
  initialDelay: 2000,
  onRetry: noopRetryCallback
});

export const plaidRetry = <T>(fn: () => Promise<T>) => withRetry(fn, {
  maxRetries: 3,
  initialDelay: 1000,
  onRetry: noopRetryCallback
});

export const stripeRetry = <T>(fn: () => Promise<T>) => withRetry(fn, {
  maxRetries: 2,
  initialDelay: 500,
  onRetry: noopRetryCallback
});

export const aimlRetry = <T>(fn: () => Promise<T>) => withRetry(fn, {
  maxRetries: 2,
  initialDelay: 1000,
  retryableStatusCodes: [429, 500, 502, 503],
  onRetry: noopRetryCallback
});

