/**
 * @jest-environment jsdom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Browser global mocks ────────────────────────────────────────────────────

const mockRequestPermission = jest.fn();
const mockSubscribe = jest.fn();

// Service worker mock
const mockReady = Promise.resolve({
  pushManager: {
    subscribe: mockSubscribe,
  },
});

Object.defineProperty(globalThis.navigator, "serviceWorker", {
  value: { ready: mockReady },
  writable: true,
  configurable: true,
});

// Notification mock
const MockNotification = jest.fn() as any;
MockNotification.requestPermission = mockRequestPermission;
MockNotification.permission = "default";
Object.defineProperty(globalThis, "Notification", {
  value: MockNotification,
  writable: true,
  configurable: true,
});

// ── Import AFTER global mocks ───────────────────────────────────────────────

import {
  PushNotificationService,
  pushNotificationService,
} from "../push-notification-service";

// ── Setup ───────────────────────────────────────────────────────────────────

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV_BACKUP };
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkGs-GDq6FBs0";
  MockNotification.permission = "default";
});

afterAll(() => {
  process.env = ENV_BACKUP;
});

// ═══════════════════════════════════════════════════════════════════════════════
//  isSupported
// ═══════════════════════════════════════════════════════════════════════════════
describe("PushNotificationService – isSupported", () => {
  it("should return true when all browser APIs are available", () => {
    const service = new PushNotificationService();
    expect(service.isSupported()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  requestPermission
// ═══════════════════════════════════════════════════════════════════════════════
describe("PushNotificationService – requestPermission", () => {
  it("should call Notification.requestPermission when supported", async () => {
    mockRequestPermission.mockResolvedValue("granted");

    const service = new PushNotificationService();
    const result = await service.requestPermission();

    expect(result).toBe("granted");
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it("should return denied when permission is rejected", async () => {
    mockRequestPermission.mockResolvedValue("denied");

    const service = new PushNotificationService();
    const result = await service.requestPermission();

    expect(result).toBe("denied");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  subscribe
// ═══════════════════════════════════════════════════════════════════════════════
describe("PushNotificationService – subscribe", () => {
  it("should return null when VAPID key is missing", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const service = new PushNotificationService();

    const result = await service.subscribe("user-1");
    expect(result).toBeNull();
  });

  it("should return null when permission is denied", async () => {
    mockRequestPermission.mockResolvedValue("denied");

    const service = new PushNotificationService();
    const result = await service.subscribe("user-1");

    expect(result).toBeNull();
  });

  it("should subscribe and return subscription on success", async () => {
    mockRequestPermission.mockResolvedValue("granted");

    const fakeSubscription = { endpoint: "https://push.example.com/sub1" };
    mockSubscribe.mockResolvedValue(fakeSubscription);

    const service = new PushNotificationService();
    const result = await service.subscribe("user-1");

    expect(result).toBe(fakeSubscription);
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
  });

  it("should return null when pushManager.subscribe throws", async () => {
    mockRequestPermission.mockResolvedValue("granted");
    mockSubscribe.mockRejectedValue(new Error("Push failed"));

    const service = new PushNotificationService();
    const result = await service.subscribe("user-1");

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sendLocalNotification
// ═══════════════════════════════════════════════════════════════════════════════
describe("PushNotificationService – sendLocalNotification", () => {
  it("should create a Notification when permission is granted", async () => {
    mockRequestPermission.mockResolvedValue("granted");

    const service = new PushNotificationService();
    await service.sendLocalNotification({
      type: "system",
      title: "Test Alert",
      body: "Test notification body",
    });

    expect(MockNotification).toHaveBeenCalledWith("Test Alert", {
      body: "Test notification body",
      icon: "/icon-192.png",
      data: undefined,
    });
  });

  it("should not create notification when permission is denied", async () => {
    mockRequestPermission.mockResolvedValue("denied");

    const service = new PushNotificationService();
    await service.sendLocalNotification({
      type: "system",
      title: "Title",
      body: "Body",
    });

    expect(MockNotification).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getPreferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("PushNotificationService – getPreferences", () => {
  it("should return default preferences with the given userId", async () => {
    const service = new PushNotificationService();
    const prefs = await service.getPreferences("user-1");

    expect(prefs.userId).toBe("user-1");
    expect(prefs.pushEnabled).toBe(true);
    expect(prefs.emailEnabled).toBe(true);
    expect(prefs.smsEnabled).toBe(false);
    expect(prefs.channels.dispute_update).toBe(true);
    expect(prefs.channels.promotion).toBe(false);
    expect(prefs.quietHours.enabled).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  updatePreferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("PushNotificationService – updatePreferences", () => {
  it("should merge updated preferences with defaults", async () => {
    const service = new PushNotificationService();
    const updated = await service.updatePreferences("user-1", {
      pushEnabled: false,
      smsEnabled: true,
    });

    expect(updated.userId).toBe("user-1");
    expect(updated.pushEnabled).toBe(false);
    expect(updated.smsEnabled).toBe(true);
    // Other defaults preserved
    expect(updated.emailEnabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Singleton
// ═══════════════════════════════════════════════════════════════════════════════
describe("PushNotificationService – singleton", () => {
  it("pushNotificationService should be an instance of PushNotificationService", () => {
    expect(pushNotificationService).toBeInstanceOf(PushNotificationService);
  });
});
