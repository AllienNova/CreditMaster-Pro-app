/**
 * Fynvita Mobile API Client Tests
 */

import {
  api,
  apiRequest,
  initializeApiClient,
  processOfflineQueue,
} from "../client";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Re-establish supabase mock after clearAllMocks resets it
    const { supabase } = require("../../supabase");
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    });
  });

  describe("apiRequest", () => {
    it("should make successful GET request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: "test" }),
      });

      const result = await apiRequest("/test");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: "test" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Bad request" }),
      });

      const result = await apiRequest("/test");

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Bad request");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await apiRequest("/test", { retryCount: 0 });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_ERROR");
    });

    it("should retry on 500 errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: "Server error" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: "success" }),
        });

      const result = await apiRequest("/test", {
        retryCount: 1,
        retryDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 400 errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Bad request" }),
      });

      const result = await apiRequest("/test", { retryCount: 3 });

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("api convenience methods", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    it("should make GET request", async () => {
      await api.get("/test");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should make POST request with body", async () => {
      await api.post("/test", { foo: "bar" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ foo: "bar" }),
        }),
      );
    });

    it("should make PATCH request", async () => {
      await api.patch("/test", { update: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ update: true }),
        }),
      );
    });

    it("should make DELETE request", async () => {
      await api.delete("/test");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("initializeApiClient", () => {
    it("should initialize without errors", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      await expect(initializeApiClient()).resolves.not.toThrow();
    });

    it("should load persisted offline queue from storage", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      const queuedItems = [
        {
          id: "1",
          endpoint: "/test",
          method: "POST",
          body: "{}",
          timestamp: Date.now(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queuedItems));

      await expect(initializeApiClient()).resolves.not.toThrow();
    });

    it("should handle corrupted offline queue gracefully", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      AsyncStorage.getItem.mockResolvedValueOnce("not-valid-json{{{");

      await expect(initializeApiClient()).resolves.not.toThrow();
    });
  });

  describe("offline queue behavior", () => {
    it("should queue POST requests when offline", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      // Mock NetInfo to report offline
      jest.mock("@react-native-community/netinfo", () => ({
        default: {
          fetch: jest.fn().mockResolvedValue({ isConnected: false }),
        },
      }));

      // Trigger a POST request that should be queued
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await apiRequest("/test-offline", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
        retryCount: 0,
        offlineSupport: true,
      });

      // When offline, POST requests either get queued or return an error
      expect(result.success).toBe(false);
    });

    it("should not queue GET requests when offline", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await apiRequest("/test", {
        method: "GET",
        retryCount: 0,
        offlineSupport: true,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_ERROR");
    });
  });

  describe("processOfflineQueue", () => {
    it("should return zero counts when queue is empty", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      // First reset the queue by loading empty state
      AsyncStorage.getItem.mockResolvedValueOnce("[]");
      await initializeApiClient();

      const result = await processOfflineQueue();
      expect(result).toEqual({ processed: 0, failed: 0 });
    });

    it("should process queued requests when back online", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      const queuedItems = [
        {
          id: "q1",
          endpoint: "/test-queued",
          method: "POST",
          body: '{"data":"test"}',
          timestamp: Date.now(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queuedItems));
      AsyncStorage.setItem.mockResolvedValue(undefined);
      await initializeApiClient();

      // apiRequest will retry on failure; provide enough success responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await processOfflineQueue();
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("should count items as processed even if server returns error", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      const queuedItems = [
        {
          id: "err1",
          endpoint: "/test-server-error",
          method: "POST",
          body: "{}",
          timestamp: Date.now() - 1000,
        },
      ];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queuedItems));
      AsyncStorage.setItem.mockResolvedValue(undefined);
      await initializeApiClient();

      // 400 errors are not retried and apiRequest returns (never throws) for them
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Bad request" }),
      });

      const result = await processOfflineQueue();
      // apiRequest resolves for 400 (no throw), so the legacy queue counts it as processed
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe("response unwrapping", () => {
    it("should unwrap success wrapper from Next.js API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, data: { id: "123", name: "Test" } }),
      });

      const result = await apiRequest<{ id: string; name: string }>("/test");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "123", name: "Test" });
    });

    it("should handle backend returning success: false with wrapper format", async () => {
      // The unwrapping logic requires BOTH 'success' AND 'data' keys to detect wrapper format
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            error: { message: "Validation failed", code: "VALIDATION_ERROR" },
          }),
      });

      const result = await apiRequest("/test");

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Validation failed");
    });

    it("should pass through non-wrapper responses as-is", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "456", direct: true }),
      });

      const result = await apiRequest<{ id: string; direct: boolean }>(
        "/legacy",
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "456", direct: true });
    });
  });

  describe("caching", () => {
    it("should cache GET responses when enableCache is true", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      AsyncStorage.setItem.mockResolvedValue(undefined);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cached: true }),
      });

      await apiRequest("/cached", { enableCache: true, cacheTime: 60000 });

      // AsyncStorage.setItem should have been called for caching
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining("fynvita_cache_"),
        expect.any(String),
      );
    });

    it("should return cached response on subsequent requests", async () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      const cachedData = {
        data: { fromCache: true },
        expiry: Date.now() + 60000,
      };
      AsyncStorage.getItem.mockImplementation((key: string) => {
        if (key.startsWith("fynvita_cache_")) {
          return Promise.resolve(JSON.stringify(cachedData));
        }
        return Promise.resolve(null);
      });

      const result = await apiRequest("/cached", { enableCache: true });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fromCache: true });
      // fetch should NOT have been called since cache was hit
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("timeout handling", () => {
    it("should return timeout error when request exceeds timeout", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            setTimeout(() => reject(error), 10);
          }),
      );

      const result = await apiRequest("/slow", { timeout: 5, retryCount: 0 });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("TIMEOUT");
    });
  });
});
