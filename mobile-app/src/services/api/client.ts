/**
 * Fynvita Mobile API Client
 * Core HTTP client with authentication, retry logic, offline support, and error handling
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabase";
import type { ApiResponse, ApiError, RequestConfig } from "./types";

// Configuration
// For Android emulator, use 10.0.2.2 to access localhost
// For iOS simulator, use localhost
// For physical device, use your machine's IP address
const getDefaultApiUrl = (): string => {
  if (__DEV__) {
    // In development, prefer explicit env var, fallback to localhost with /api prefix
    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    // Android emulator needs 10.0.2.2 to reach host machine
    if (Platform.OS === "android") {
      return "http://10.0.2.2:3000/api";
    }
    // iOS simulator can use localhost
    return "http://localhost:3000/api";
  }
  // Production URL
  return process.env.EXPO_PUBLIC_API_URL || "https://api.fynvita.com/api";
};

const API_BASE_URL = getDefaultApiUrl();
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_PREFIX = "fynvita_cache_";
const OFFLINE_QUEUE_KEY = "fynvita_offline_queue";

// Retry configuration for different error types
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const RETRYABLE_ERRORS = [
  "NETWORK_ERROR",
  "TIMEOUT",
  "ECONNRESET",
  "ETIMEDOUT",
];

// Offline queue for requests made while offline
interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: string;
  timestamp: number;
}

let offlineQueue: QueuedRequest[] = [];

/**
 * Initialize the API client - load offline queue from storage
 */
export async function initializeApiClient(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (stored) {
      offlineQueue = JSON.parse(stored);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn("Failed to load offline queue:", error);
    }
  }
}

/**
 * Check if device is online using NetInfo for mobile, navigator for web
 */
async function isOnline(): Promise<boolean> {
  if (Platform.OS === "web") {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }
  try {
    const { default: NetInfo } = await import("@react-native-community/netinfo");
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch {
    // If NetInfo is not available, assume online and let request errors handle it
    return true;
  }
}

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    if (__DEV__) console.error("Failed to get auth token:", error);
    return null;
  }
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function calculateRetryDelay(
  attempt: number,
  baseDelay: number = RETRY_DELAY,
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const maxDelay = 30000;
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  // Add jitter (±25%)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, statusCode?: number): boolean {
  if (statusCode && RETRYABLE_STATUS_CODES.includes(statusCode)) {
    return true;
  }
  if (error?.code && RETRYABLE_ERRORS.includes(error.code)) {
    return true;
  }
  if (error?.message?.toLowerCase().includes("network")) {
    return true;
  }
  if (error?.message?.toLowerCase().includes("timeout")) {
    return true;
  }
  return false;
}

/**
 * Cache management
 */
async function getCachedResponse<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const { data, expiry } = JSON.parse(cached);
    if (Date.now() > expiry) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

async function setCachedResponse<T>(
  key: string,
  data: T,
  ttlMs: number,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({
        data,
        expiry: Date.now() + ttlMs,
      }),
    );
  } catch (error) {
    if (__DEV__) {
      console.warn("Failed to cache response:", error);
    }
  }
}

/**
 * Add request to offline queue
 */
async function queueOfflineRequest(
  request: Omit<QueuedRequest, "id" | "timestamp">,
): Promise<void> {
  const queuedRequest: QueuedRequest = {
    ...request,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  offlineQueue.push(queuedRequest);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
}

/**
 * Process offline queue when back online
 */
export async function processOfflineQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  if (offlineQueue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: QueuedRequest[] = [];

  for (const request of offlineQueue) {
    try {
      await apiRequest(request.endpoint, {
        method: request.method as any,
        body: request.body,
      });
      processed++;
    } catch {
      // Keep failed requests for later retry if they're less than 24 hours old
      if (Date.now() - request.timestamp < 24 * 60 * 60 * 1000) {
        remaining.push(request);
      }
      failed++;
    }
  }

  offlineQueue = remaining;
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
  return { processed, failed };
}

/**
 * Create API error from response
 */
function createApiError(
  message: string,
  code: string,
  details?: Record<string, unknown>,
): ApiError {
  return {
    code,
    message,
    details,
    retryable: RETRYABLE_ERRORS.includes(code),
  };
}

/**
 * Core API request function with retry logic
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & RequestConfig = {},
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retryCount = MAX_RETRIES,
    retryDelay = RETRY_DELAY,
    enableCache = false,
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    offlineSupport = true,
    ...fetchOptions
  } = options;

  // Check cache for GET requests
  const cacheKey = `${fetchOptions.method || "GET"}_${endpoint}`;
  if (enableCache && (!fetchOptions.method || fetchOptions.method === "GET")) {
    const cached = await getCachedResponse<T>(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Check if online
  const online = await isOnline();
  if (
    !online &&
    offlineSupport &&
    fetchOptions.method &&
    fetchOptions.method !== "GET"
  ) {
    await queueOfflineRequest({
      endpoint,
      method: fetchOptions.method,
      body: fetchOptions.body as string,
    });
    return {
      success: false,
      error: createApiError("Request queued for when online", "OFFLINE_QUEUED"),
      message:
        "You appear to be offline. This request will be processed when you reconnect.",
    };
  }

  // Get auth token
  const token = await getAuthToken();

  // Build request headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Client-Platform": Platform.OS,
    "X-Client-Version": process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Execute request with retry logic
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retryCount + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle response
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = createApiError(
          responseData.message ||
            responseData.error ||
            `HTTP ${response.status}`,
          `HTTP_${response.status}`,
          responseData,
        );

        // Retry on retryable errors
        if (attempt <= retryCount && isRetryableError(error, response.status)) {
          const delay = calculateRetryDelay(attempt, retryDelay);
          if (__DEV__) {
            console.warn(
              `API retry attempt ${attempt}/${retryCount} in ${delay}ms:`,
              error.message,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return {
          success: false,
          error,
          message: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      // Unwrap { success, data } wrapper from Next.js API responses
      // Backend returns: { success: true, data: {...} } or { success: false, error: {...} }
      // We normalize to always return the inner data for successful responses
      let unwrappedData: T;
      if (
        responseData &&
        typeof responseData === "object" &&
        "success" in responseData &&
        "data" in responseData
      ) {
        // Response has wrapper format - extract the data
        if (!responseData.success) {
          // Backend returned success: false - treat as error
          return {
            success: false,
            error: createApiError(
              responseData.error?.message ||
                responseData.message ||
                "Request failed",
              responseData.error?.code || "API_ERROR",
              responseData.error,
            ),
            message: responseData.error?.message || responseData.message,
            timestamp: new Date().toISOString(),
          };
        }
        unwrappedData = responseData.data as T;
      } else {
        // Response doesn't have wrapper - use as-is (legacy endpoints or direct data)
        unwrappedData = responseData as T;
      }

      // Success - cache if applicable
      if (
        enableCache &&
        (!fetchOptions.method || fetchOptions.method === "GET")
      ) {
        await setCachedResponse(cacheKey, unwrappedData, cacheTime);
      }

      return {
        success: true,
        data: unwrappedData,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      // Handle abort/timeout
      if (error.name === "AbortError") {
        if (attempt <= retryCount) {
          const delay = calculateRetryDelay(attempt, retryDelay);
          if (__DEV__) {
            console.warn(
              `API timeout, retry attempt ${attempt}/${retryCount} in ${delay}ms`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return {
          success: false,
          error: createApiError("Request timed out", "TIMEOUT"),
          timestamp: new Date().toISOString(),
        };
      }

      // Handle network errors
      if (isRetryableError(error) && attempt <= retryCount) {
        const delay = calculateRetryDelay(attempt, retryDelay);
        if (__DEV__) {
          console.warn(
            `API error, retry attempt ${attempt}/${retryCount} in ${delay}ms:`,
            error.message,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return {
        success: false,
        error: createApiError(
          error.message || "Network error",
          "NETWORK_ERROR",
          { originalError: error.toString() },
        ),
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Should not reach here, but handle just in case
  return {
    success: false,
    error: createApiError(
      lastError?.message || "Unknown error",
      "UNKNOWN_ERROR",
    ),
    timestamp: new Date().toISOString(),
  };
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) =>
    apiRequest<T>(endpoint, { method: "GET", ...config }),

  post: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...config,
    }),

  put: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      ...config,
    }),

  patch: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...config,
    }),

  delete: <T>(endpoint: string, config?: RequestConfig) =>
    apiRequest<T>(endpoint, { method: "DELETE", ...config }),
};

export default api;
