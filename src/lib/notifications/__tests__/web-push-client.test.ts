/**
 * @jest-environment jsdom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Browser global mocks ────────────────────────────────────────────────────

const mockRegister = jest.fn();
const mockSubscribe = jest.fn();
const mockGetSubscription = jest.fn();
const mockUnsubscribe = jest.fn();

const mockPushManager = {
  subscribe: mockSubscribe,
  getSubscription: mockGetSubscription,
};

const mockRegistration = {
  pushManager: mockPushManager,
};

// Service worker mock
Object.defineProperty(globalThis.navigator, "serviceWorker", {
  value: {
    register: mockRegister,
    ready: Promise.resolve(mockRegistration),
  },
  writable: true,
  configurable: true,
});

// PushManager mock
Object.defineProperty(globalThis, "PushManager", {
  value: class MockPushManager {},
  writable: true,
  configurable: true,
});

// Notification mock
const MockNotification = jest.fn() as any;
MockNotification.permission = "default";
MockNotification.requestPermission = jest.fn();
Object.defineProperty(globalThis, "Notification", {
  value: MockNotification,
  writable: true,
  configurable: true,
});

// Mock web-push (required by web-push-service module even though we test the client)
jest.mock("web-push", () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

// ── Import AFTER global mocks ───────────────────────────────────────────────

import { webPushClient } from "../web-push-service";

// ── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  MockNotification.permission = "default";
  MockNotification.requestPermission.mockReset();
  mockRegister.mockReset();
  mockSubscribe.mockReset();
  mockGetSubscription.mockReset();
  mockUnsubscribe.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  isSupported
// ═══════════════════════════════════════════════════════════════════════════════
describe("webPushClient – isSupported", () => {
  it("returns true when all browser APIs are available", () => {
    expect(webPushClient.isSupported()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getPermissionStatus
// ═══════════════════════════════════════════════════════════════════════════════
describe("webPushClient – getPermissionStatus", () => {
  it("returns current Notification.permission when supported", () => {
    MockNotification.permission = "granted";
    expect(webPushClient.getPermissionStatus()).toBe("granted");
  });

  it("returns 'default' for default permission state", () => {
    MockNotification.permission = "default";
    expect(webPushClient.getPermissionStatus()).toBe("default");
  });

  it("returns 'denied' when permission is denied", () => {
    MockNotification.permission = "denied";
    expect(webPushClient.getPermissionStatus()).toBe("denied");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  requestPermission
// ═══════════════════════════════════════════════════════════════════════════════
describe("webPushClient – requestPermission", () => {
  it("calls Notification.requestPermission and returns result", async () => {
    MockNotification.requestPermission.mockResolvedValue("granted");

    const result = await webPushClient.requestPermission();

    expect(result).toBe("granted");
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("returns denied when user denies permission", async () => {
    MockNotification.requestPermission.mockResolvedValue("denied");

    const result = await webPushClient.requestPermission();

    expect(result).toBe("denied");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  subscribe
// ═══════════════════════════════════════════════════════════════════════════════
describe("webPushClient – subscribe", () => {
  it("registers service worker and subscribes with VAPID key", async () => {
    mockRegister.mockResolvedValue(mockRegistration);
    const fakeSubJSON = {
      endpoint: "https://push.example.com/sub1",
      keys: { p256dh: "key1", auth: "key2" },
    };
    const fakeSubscription = { toJSON: () => fakeSubJSON };
    mockSubscribe.mockResolvedValue(fakeSubscription);

    const result = await webPushClient.subscribe("BEl62iUYgUivxIkv");

    expect(mockRegister).toHaveBeenCalledWith("/sw.js");
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(result).toEqual(fakeSubJSON);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  unsubscribe
// ═══════════════════════════════════════════════════════════════════════════════
describe("webPushClient – unsubscribe", () => {
  it("unsubscribes from current subscription and returns true", async () => {
    const fakeSubscription = { unsubscribe: mockUnsubscribe };
    mockGetSubscription.mockResolvedValue(fakeSubscription);
    mockUnsubscribe.mockResolvedValue(true);

    const result = await webPushClient.unsubscribe();

    expect(result).toBe(true);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("returns false when no subscription exists", async () => {
    mockGetSubscription.mockResolvedValue(null);

    const result = await webPushClient.unsubscribe();

    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getSubscription
// ═══════════════════════════════════════════════════════════════════════════════
describe("webPushClient – getSubscription", () => {
  it("returns current subscription as JSON", async () => {
    const fakeSubJSON = {
      endpoint: "https://push.example.com/sub1",
      keys: { p256dh: "key1", auth: "key2" },
    };
    const fakeSubscription = { toJSON: () => fakeSubJSON };
    mockGetSubscription.mockResolvedValue(fakeSubscription);

    const result = await webPushClient.getSubscription();

    expect(result).toEqual(fakeSubJSON);
  });

  it("returns null when no subscription exists", async () => {
    mockGetSubscription.mockResolvedValue(null);

    const result = await webPushClient.getSubscription();

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  urlBase64ToUint8Array
// ═══════════════════════════════════════════════════════════════════════════════
describe("webPushClient – urlBase64ToUint8Array", () => {
  it("converts a URL-safe base64 string to Uint8Array", () => {
    // "SGVsbG8" is base64url for "Hello"
    const result = webPushClient.urlBase64ToUint8Array("SGVsbG8");

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(5);
    // H=72, e=101, l=108, l=108, o=111
    expect(result[0]).toBe(72);
    expect(result[1]).toBe(101);
    expect(result[2]).toBe(108);
    expect(result[3]).toBe(108);
    expect(result[4]).toBe(111);
  });

  it("handles URL-safe characters (- and _)", () => {
    // Standard base64 "a+b/cA==" in URL-safe encoding is "a-b_cA"
    const result = webPushClient.urlBase64ToUint8Array("a-b_cA");

    expect(result).toBeInstanceOf(Uint8Array);
    // 6 base64 chars + 2 padding = 8 chars = 4 bytes of decoded data
    expect(result.length).toBe(4);
  });

  it("adds correct padding for strings not divisible by 4", () => {
    // 1-char input requires 3 padding chars (length % 4 == 1 → pad 3)
    // 2-char input requires 2 padding chars
    // 3-char input requires 1 padding char
    const result2 = webPushClient.urlBase64ToUint8Array("QQ");
    expect(result2).toBeInstanceOf(Uint8Array);
    // "QQ==" decodes to "A"
    expect(result2.length).toBe(1);
    expect(result2[0]).toBe(65); // 'A'
  });
});
