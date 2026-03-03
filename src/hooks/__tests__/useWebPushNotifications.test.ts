/**
 * @jest-environment jsdom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockIsSupported = jest.fn();
const mockGetPermissionStatus = jest.fn();
const mockRequestPermission = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockGetSubscription = jest.fn();

jest.mock("@/lib/notifications/web-push-service", () => ({
  webPushClient: {
    isSupported: () => mockIsSupported(),
    getPermissionStatus: () => mockGetPermissionStatus(),
    requestPermission: () => mockRequestPermission(),
    subscribe: (key: string) => mockSubscribe(key),
    unsubscribe: () => mockUnsubscribe(),
    getSubscription: () => mockGetSubscription(),
  },
}));

// ── Import AFTER mocks ──────────────────────────────────────────────────────

import { renderHook, act, waitFor } from "@testing-library/react";
import { useWebPushNotifications } from "../useWebPushNotifications";

// ── Fetch mock ──────────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

beforeEach(() => {
  jest.clearAllMocks();

  // Default: supported, permission default, no subscription
  mockIsSupported.mockReturnValue(true);
  mockGetPermissionStatus.mockReturnValue("default");
  mockRequestPermission.mockResolvedValue("granted");
  mockGetSubscription.mockResolvedValue(null);

  // Mock fetch for VAPID key endpoint
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ publicKey: "test-vapid-key" }),
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Initial state
// ═══════════════════════════════════════════════════════════════════════════════
describe("useWebPushNotifications – initial state", () => {
  it("should detect support and set initial permission", async () => {
    const { result } = renderHook(() => useWebPushNotifications("user-1"));

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
      expect(result.current.permission).toBe("default");
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set unsupported when browser does not support push", async () => {
    mockIsSupported.mockReturnValue(false);

    const { result } = renderHook(() => useWebPushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
      expect(result.current.permission).toBe("unsupported");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  requestPermission
// ═══════════════════════════════════════════════════════════════════════════════
describe("useWebPushNotifications – requestPermission", () => {
  it("should request permission and update state", async () => {
    mockRequestPermission.mockResolvedValue("granted");

    const { result } = renderHook(() => useWebPushNotifications("user-1"));

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    let permResult: NotificationPermission = "default";
    await act(async () => {
      permResult = await result.current.requestPermission();
    });

    expect(permResult).toBe("granted");
    expect(result.current.permission).toBe("granted");
  });

  it("should return denied when not supported", async () => {
    mockIsSupported.mockReturnValue(false);

    const { result } = renderHook(() => useWebPushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });

    let permResult: NotificationPermission = "default";
    await act(async () => {
      permResult = await result.current.requestPermission();
    });

    expect(permResult).toBe("denied");
    expect(result.current.error).toBeTruthy();
  });

  it("should handle permission request error", async () => {
    mockRequestPermission.mockRejectedValue(new Error("User cancelled"));

    const { result } = renderHook(() => useWebPushNotifications("user-1"));

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    let permResult: NotificationPermission = "default";
    await act(async () => {
      permResult = await result.current.requestPermission();
    });

    expect(permResult).toBe("denied");
    expect(result.current.error).toBe("User cancelled");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  subscribe
// ═══════════════════════════════════════════════════════════════════════════════
describe("useWebPushNotifications – subscribe", () => {
  it("should subscribe successfully with userId", async () => {
    mockGetPermissionStatus.mockReturnValue("granted");
    mockSubscribe.mockResolvedValue({
      endpoint: "https://push.example.com/sub1",
      keys: { p256dh: "key1", auth: "key2" },
    });

    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ publicKey: "test-vapid-key" }),
      })
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useWebPushNotifications("user-1"));

    // Wait for initial effects (support check + vapid key fetch)
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    // Allow vapid key fetch to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    let success = false;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(true);
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should return false when not supported", async () => {
    mockIsSupported.mockReturnValue(false);

    const { result } = renderHook(() => useWebPushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it("should handle subscribe failure", async () => {
    mockGetPermissionStatus.mockReturnValue("granted");
    mockSubscribe.mockResolvedValue(null);

    const { result } = renderHook(() => useWebPushNotifications("user-1"));

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    // Allow vapid key fetch
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    let success = false;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Failed to create push subscription");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  unsubscribe
// ═══════════════════════════════════════════════════════════════════════════════
describe("useWebPushNotifications – unsubscribe", () => {
  it("should unsubscribe successfully", async () => {
    mockGetSubscription.mockResolvedValue({
      endpoint: "https://push.example.com/sub1",
    });
    mockUnsubscribe.mockResolvedValue(true);

    const { result } = renderHook(() => useWebPushNotifications("user-1"));

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    let success = false;
    await act(async () => {
      success = await result.current.unsubscribe();
    });

    expect(success).toBe(true);
    expect(result.current.isSubscribed).toBe(false);
  });

  it("should handle unsubscribe failure", async () => {
    mockGetSubscription.mockResolvedValue({
      endpoint: "https://push.example.com/sub1",
    });
    mockUnsubscribe.mockResolvedValue(false);

    const { result } = renderHook(() => useWebPushNotifications("user-1"));

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    let success = false;
    await act(async () => {
      success = await result.current.unsubscribe();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe(
      "Failed to unsubscribe from push notifications",
    );
  });

  it("should return false when not supported", async () => {
    mockIsSupported.mockReturnValue(false);

    const { result } = renderHook(() => useWebPushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.unsubscribe();
    });

    expect(success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  checkSubscription
// ═══════════════════════════════════════════════════════════════════════════════
describe("useWebPushNotifications – checkSubscription", () => {
  it("should return true when subscribed", async () => {
    mockGetSubscription.mockResolvedValue({
      endpoint: "https://push.example.com/sub1",
    });

    const { result } = renderHook(() => useWebPushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    let isSubscribed = false;
    await act(async () => {
      isSubscribed = await result.current.checkSubscription();
    });

    expect(isSubscribed).toBe(true);
    expect(result.current.isSubscribed).toBe(true);
  });

  it("should return false when not subscribed", async () => {
    mockGetSubscription.mockResolvedValue(null);

    const { result } = renderHook(() => useWebPushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    let isSubscribed = false;
    await act(async () => {
      isSubscribed = await result.current.checkSubscription();
    });

    expect(isSubscribed).toBe(false);
  });

  it("should return false when not supported", async () => {
    mockIsSupported.mockReturnValue(false);

    const { result } = renderHook(() => useWebPushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });

    let isSubscribed = false;
    await act(async () => {
      isSubscribed = await result.current.checkSubscription();
    });

    expect(isSubscribed).toBe(false);
  });
});
