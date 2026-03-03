/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Tests for retry logic, subscription validation, and batch sending
 * features in WebPushService.
 *
 * These tests complement the existing web-push-service.test.ts file
 * which covers basic send, sendToMultiple, sendToUser, and payload creation.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// --- Environment setup ---
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
process.env.VAPID_PRIVATE_KEY = "test-private-key";

// --- Mocks ---
const mockSetVapidDetails = jest.fn();
const mockSendNotification = jest.fn().mockResolvedValue({} as never);

jest.mock("web-push", () => ({
  setVapidDetails: mockSetVapidDetails,
  sendNotification: mockSendNotification,
}));

// --- Import under test ---
import {
  webPushService,
  calculateBackoffDelay,
  isRetryableError,
  validateSubscription,
  type PushSubscription,
  type PushNotificationPayload,
  type RetryConfig,
} from "../web-push-service";

// --- Helpers ---

const makeSub = (overrides?: Partial<PushSubscription>): PushSubscription => ({
  id: "sub-1",
  userId: "user-1",
  endpoint: "https://push.example.com/sub1",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
  userAgent: "TestBrowser/1.0",
  createdAt: new Date("2026-01-01"),
  lastUsed: new Date("2026-02-01"),
  isActive: true,
  ...overrides,
});

const samplePayload: PushNotificationPayload = {
  type: "general",
  title: "Retry Test",
  body: "Testing retry logic",
};

// Fast retry config for tests (no real delays — uses jest fake timers where needed)
const fastRetryConfig: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1,
  maxDelayMs: 5,
};

// --- Tests ---

describe("calculateBackoffDelay", () => {
  it("returns base delay on first attempt (attempt 0)", () => {
    // 2^0 * 1000 = 1000, plus jitter (0..500)
    const delay = calculateBackoffDelay(0, 1000, 10000);
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(1500);
  });

  it("increases exponentially with each attempt", () => {
    // 2^1 * 1000 = 2000, plus jitter (0..500)
    const delay1 = calculateBackoffDelay(1, 1000, 10000);
    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay1).toBeLessThanOrEqual(2500);

    // 2^2 * 1000 = 4000, plus jitter (0..500)
    const delay2 = calculateBackoffDelay(2, 1000, 10000);
    expect(delay2).toBeGreaterThanOrEqual(4000);
    expect(delay2).toBeLessThanOrEqual(4500);
  });

  it("caps at maxDelayMs", () => {
    const delay = calculateBackoffDelay(10, 1000, 5000);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it("returns 0-range delay for zero base", () => {
    const delay = calculateBackoffDelay(0, 0, 10000);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(10000);
  });

  it("handles large attempt numbers gracefully", () => {
    const delay = calculateBackoffDelay(20, 100, 5000);
    expect(delay).toBeLessThanOrEqual(5000);
  });
});

describe("isRetryableError", () => {
  it("returns false for 410 Gone (subscription expired)", () => {
    const error: any = new Error("Gone");
    error.statusCode = 410;
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for expired subscription message", () => {
    const error = new Error("Push subscription expired");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for unsubscribed message", () => {
    const error = new Error("Endpoint unsubscribed from push");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns true for 429 Too Many Requests", () => {
    const error: any = new Error("Too Many Requests");
    error.statusCode = 429;
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for 500 Internal Server Error", () => {
    const error: any = new Error("Server Error");
    error.statusCode = 500;
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for 502 Bad Gateway", () => {
    const error: any = new Error("Bad Gateway");
    error.statusCode = 502;
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for 503 Service Unavailable", () => {
    const error: any = new Error("Service Unavailable");
    error.statusCode = 503;
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for ETIMEDOUT network error", () => {
    const error = new Error("connect ETIMEDOUT 10.0.0.1:443");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for ECONNRESET network error", () => {
    const error = new Error("read ECONNRESET");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for ECONNREFUSED network error", () => {
    const error = new Error("connect ECONNREFUSED 127.0.0.1:443");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for generic network error", () => {
    const error = new Error("network timeout at push service");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for unknown errors (default behavior)", () => {
    expect(isRetryableError("string error")).toBe(true);
    expect(isRetryableError(42)).toBe(true);
    expect(isRetryableError(null)).toBe(true);
  });

  it("returns true for Error without statusCode and without known message", () => {
    const error = new Error("Something weird happened");
    expect(isRetryableError(error)).toBe(true);
  });
});

describe("validateSubscription", () => {
  it("returns valid for a complete subscription", () => {
    const sub = makeSub();
    const result = validateSubscription(sub);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("reports missing id", () => {
    const result = validateSubscription({
      userId: "user-1",
      endpoint: "https://push.example.com",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing subscription id");
  });

  it("reports missing userId", () => {
    const result = validateSubscription({
      id: "sub-1",
      endpoint: "https://push.example.com",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing userId");
  });

  it("reports missing endpoint", () => {
    const result = validateSubscription({
      id: "sub-1",
      userId: "user-1",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing endpoint");
  });

  it("reports non-HTTPS endpoint", () => {
    const result = validateSubscription({
      id: "sub-1",
      userId: "user-1",
      endpoint: "http://push.example.com/sub",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Endpoint must use HTTPS");
  });

  it("allows http://localhost endpoints", () => {
    const result = validateSubscription({
      id: "sub-1",
      userId: "user-1",
      endpoint: "http://localhost:3000/push",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("reports missing keys object", () => {
    const result = validateSubscription({
      id: "sub-1",
      userId: "user-1",
      endpoint: "https://push.example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing keys object");
  });

  it("reports missing p256dh key", () => {
    const result = validateSubscription({
      id: "sub-1",
      userId: "user-1",
      endpoint: "https://push.example.com",
      keys: { p256dh: "", auth: "key2" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing p256dh key");
  });

  it("reports missing auth key", () => {
    const result = validateSubscription({
      id: "sub-1",
      userId: "user-1",
      endpoint: "https://push.example.com",
      keys: { p256dh: "key1", auth: "" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing auth key");
  });

  it("reports multiple errors at once", () => {
    const result = validateSubscription({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.errors).toContain("Missing subscription id");
    expect(result.errors).toContain("Missing userId");
    expect(result.errors).toContain("Missing endpoint");
    expect(result.errors).toContain("Missing keys object");
  });
});

describe("WebPushService – sendNotificationWithRetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendNotification.mockResolvedValue({} as never);
  });

  it("succeeds on first attempt with retryCount 0", async () => {
    const sub = makeSub();
    const result = await webPushService.sendNotificationWithRetry(
      sub,
      samplePayload,
      fastRetryConfig,
    );

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(0);
    expect(result.subscriptionId).toBe("sub-1");
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("retries on transient error and succeeds", async () => {
    const transientError: any = new Error("Service Unavailable");
    transientError.statusCode = 503;

    mockSendNotification
      .mockRejectedValueOnce(transientError as never)
      .mockResolvedValueOnce({} as never);

    const sub = makeSub();
    const result = await webPushService.sendNotificationWithRetry(
      sub,
      samplePayload,
      fastRetryConfig,
    );

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });

  it("stops retrying on non-retryable error (410 Gone)", async () => {
    const goneError: any = new Error("Gone");
    goneError.statusCode = 410;

    mockSendNotification.mockRejectedValueOnce(goneError as never);

    const sub = makeSub();
    const result = await webPushService.sendNotificationWithRetry(
      sub,
      samplePayload,
      fastRetryConfig,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("subscription_expired");
    expect(result.retryCount).toBe(0);
    // Should NOT retry after 410
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("stops retrying on expired subscription message", async () => {
    const expiredError = new Error("Push subscription expired");
    mockSendNotification.mockRejectedValueOnce(expiredError as never);

    const sub = makeSub();
    const result = await webPushService.sendNotificationWithRetry(
      sub,
      samplePayload,
      fastRetryConfig,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("subscription_expired");
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("exhausts all retries and returns failure", async () => {
    const transientError: any = new Error("Server Error");
    transientError.statusCode = 500;

    mockSendNotification.mockRejectedValue(transientError as never);

    const sub = makeSub();
    const result = await webPushService.sendNotificationWithRetry(
      sub,
      samplePayload,
      fastRetryConfig,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Server Error");
    expect(result.retryCount).toBe(fastRetryConfig.maxRetries);
    // initial + retries
    expect(mockSendNotification).toHaveBeenCalledTimes(
      1 + fastRetryConfig.maxRetries,
    );
  });

  it("rejects invalid subscription without sending", async () => {
    const invalidSub = makeSub({ endpoint: "" });
    const result = await webPushService.sendNotificationWithRetry(
      invalidSub,
      samplePayload,
      fastRetryConfig,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid subscription");
    expect(result.retryCount).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("returns failure when VAPID keys are not configured", async () => {
    const envBackup = { ...process.env };
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    let unconfiguredService: any;
    jest.isolateModules(() => {
      unconfiguredService = require("../web-push-service").webPushService;
    });

    const sub = makeSub();
    const result = await unconfiguredService.sendNotificationWithRetry(
      sub,
      samplePayload,
      fastRetryConfig,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Web Push not configured");
    expect(result.retryCount).toBe(0);

    process.env = envBackup;
  });
});

describe("WebPushService – sendToMultipleWithRetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendNotification.mockResolvedValue({} as never);
  });

  it("sends to multiple subscriptions with retry support", async () => {
    const sub1 = makeSub({ id: "sub-1" });
    const sub2 = makeSub({
      id: "sub-2",
      endpoint: "https://push.example.com/sub2",
    });

    const results = await webPushService.sendToMultipleWithRetry(
      [sub1, sub2],
      samplePayload,
      fastRetryConfig,
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[0].retryCount).toBe(0);
    expect(results[1].success).toBe(true);
    expect(results[1].retryCount).toBe(0);
  });

  it("returns mixed results when some subscriptions fail", async () => {
    const goneError: any = new Error("Gone");
    goneError.statusCode = 410;

    mockSendNotification
      .mockResolvedValueOnce({} as never) // sub-1 succeeds
      .mockRejectedValue(goneError as never); // sub-2 fails permanently

    const sub1 = makeSub({ id: "sub-1" });
    const sub2 = makeSub({
      id: "sub-2",
      endpoint: "https://push.example.com/sub2",
    });

    const results = await webPushService.sendToMultipleWithRetry(
      [sub1, sub2],
      samplePayload,
      fastRetryConfig,
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBe("subscription_expired");
  });

  it("returns empty array for empty subscriptions", async () => {
    const results = await webPushService.sendToMultipleWithRetry(
      [],
      samplePayload,
      fastRetryConfig,
    );
    expect(results).toEqual([]);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("WebPushService – sendBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendNotification.mockResolvedValue({} as never);
  });

  it("processes subscriptions in batches", async () => {
    const subs = Array.from({ length: 5 }, (_, i) =>
      makeSub({
        id: `sub-${i}`,
        endpoint: `https://push.example.com/sub${i}`,
      }),
    );

    const result = await webPushService.sendBatch(subs, samplePayload, {
      retryConfig: fastRetryConfig,
      batchConfig: { concurrency: 2, delayBetweenBatchesMs: 1 },
    });

    expect(result.sent).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(5);
    expect(result.expiredSubscriptions).toEqual([]);
    expect(mockSendNotification).toHaveBeenCalledTimes(5);
  });

  it("tracks expired subscriptions", async () => {
    const goneError: any = new Error("Gone");
    goneError.statusCode = 410;

    mockSendNotification
      .mockResolvedValueOnce({} as never) // sub-0 succeeds
      .mockRejectedValueOnce(goneError as never) // sub-1 expired
      .mockResolvedValueOnce({} as never); // sub-2 succeeds

    const subs = [
      makeSub({ id: "sub-0", endpoint: "https://push.example.com/sub0" }),
      makeSub({ id: "sub-1", endpoint: "https://push.example.com/sub1" }),
      makeSub({ id: "sub-2", endpoint: "https://push.example.com/sub2" }),
    ];

    const result = await webPushService.sendBatch(subs, samplePayload, {
      retryConfig: fastRetryConfig,
      batchConfig: { concurrency: 10, delayBetweenBatchesMs: 0 },
    });

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.expiredSubscriptions).toContain("sub-1");
    expect(result.expiredSubscriptions).toHaveLength(1);
  });

  it("tracks total retry count across all subscriptions", async () => {
    const transientError: any = new Error("Server Error");
    transientError.statusCode = 500;

    // sub-0: fails once, then succeeds (1 retry)
    // sub-1: succeeds first try (0 retries)
    mockSendNotification
      .mockRejectedValueOnce(transientError as never)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({} as never);

    const subs = [
      makeSub({ id: "sub-0", endpoint: "https://push.example.com/sub0" }),
      makeSub({ id: "sub-1", endpoint: "https://push.example.com/sub1" }),
    ];

    const result = await webPushService.sendBatch(subs, samplePayload, {
      retryConfig: fastRetryConfig,
      batchConfig: { concurrency: 1, delayBetweenBatchesMs: 0 },
    });

    expect(result.sent).toBe(2);
    expect(result.totalRetries).toBeGreaterThanOrEqual(1);
  });

  it("handles empty subscription array", async () => {
    const result = await webPushService.sendBatch([], samplePayload);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results).toEqual([]);
    expect(result.expiredSubscriptions).toEqual([]);
    expect(result.totalRetries).toBe(0);
  });

  it("uses default configs when options not provided", async () => {
    const sub = makeSub();
    const result = await webPushService.sendBatch([sub], samplePayload);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(1);
  });

  it("handles all subscriptions failing", async () => {
    const goneError: any = new Error("Gone");
    goneError.statusCode = 410;
    mockSendNotification.mockRejectedValue(goneError as never);

    const subs = [
      makeSub({ id: "sub-0", endpoint: "https://push.example.com/sub0" }),
      makeSub({ id: "sub-1", endpoint: "https://push.example.com/sub1" }),
    ];

    const result = await webPushService.sendBatch(subs, samplePayload, {
      retryConfig: fastRetryConfig,
      batchConfig: { concurrency: 10, delayBetweenBatchesMs: 0 },
    });

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.expiredSubscriptions).toHaveLength(2);
  });
});
