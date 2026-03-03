/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Import AFTER mocks
import { GET, PUT, POST } from "../../notifications/preferences/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
) {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  const init: RequestInit = { method: options?.method || "GET" };
  const headers: Record<string, string> = {};
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  if (options?.body) {
    init.method = options.method || "PUT";
    init.body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  init.headers = headers;
  return new NextRequest(absoluteUrl, init as never);
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications/preferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notification Preferences API – GET", () => {
  it("should return default preferences when none are stored", async () => {
    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications/preferences"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences).toBeDefined();
    expect(body.preferences.pushEnabled).toBe(true);
    expect(body.preferences.emailEnabled).toBe(true);
    expect(body.preferences.smsEnabled).toBe(false);
  });

  it("should return default channel settings", async () => {
    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications/preferences"),
    );
    const body = await res.json();

    expect(body.preferences.channels.dispute_update).toBe(true);
    expect(body.preferences.channels.score_change).toBe(true);
    expect(body.preferences.channels.payment_reminder).toBe(true);
    expect(body.preferences.channels.document_processed).toBe(true);
    expect(body.preferences.channels.recommendation).toBe(true);
    expect(body.preferences.channels.system).toBe(true);
    expect(body.preferences.channels.promotion).toBe(false);
  });

  it("should return default quiet hours settings", async () => {
    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications/preferences"),
    );
    const body = await res.json();

    expect(body.preferences.quietHours.enabled).toBe(false);
    expect(body.preferences.quietHours.start).toBe("22:00");
    expect(body.preferences.quietHours.end).toBe("08:00");
  });

  it("should use demo-user when x-user-id header is missing", async () => {
    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications/preferences"),
    );
    const body = await res.json();

    expect(body.preferences.userId).toBe("demo-user");
  });

  it("should use the provided x-user-id header", async () => {
    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications/preferences", {
        headers: { "x-user-id": "custom-user-42" },
      }),
    );
    const body = await res.json();

    expect(body.preferences.userId).toBe("custom-user-42");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/notifications/preferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notification Preferences API – PUT", () => {
  it("should update top-level preference fields", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "PUT",
        body: { smsEnabled: true },
        headers: { "x-user-id": "put-user-1" },
      },
    );
    req.json = jest.fn().mockResolvedValue({ smsEnabled: true });

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.preferences.smsEnabled).toBe(true);
    // Other defaults should still be present
    expect(body.preferences.pushEnabled).toBe(true);
    expect(body.preferences.emailEnabled).toBe(true);
  });

  it("should deep-merge channel updates", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "PUT",
        body: { channels: { promotion: true } },
        headers: { "x-user-id": "put-user-2" },
      },
    );
    req.json = jest
      .fn()
      .mockResolvedValue({ channels: { promotion: true } });

    const res = await PUT(req);
    const body = await res.json();

    expect(body.preferences.channels.promotion).toBe(true);
    // Other channel defaults should be preserved
    expect(body.preferences.channels.dispute_update).toBe(true);
    expect(body.preferences.channels.system).toBe(true);
  });

  it("should deep-merge quietHours updates", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "PUT",
        body: { quietHours: { enabled: true } },
        headers: { "x-user-id": "put-user-3" },
      },
    );
    req.json = jest
      .fn()
      .mockResolvedValue({ quietHours: { enabled: true } });

    const res = await PUT(req);
    const body = await res.json();

    expect(body.preferences.quietHours.enabled).toBe(true);
    // Defaults should be preserved
    expect(body.preferences.quietHours.start).toBe("22:00");
    expect(body.preferences.quietHours.end).toBe("08:00");
  });

  it("should prevent userId from being overridden", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "PUT",
        body: { userId: "hacker-user" },
        headers: { "x-user-id": "put-user-4" },
      },
    );
    req.json = jest.fn().mockResolvedValue({ userId: "hacker-user" });

    const res = await PUT(req);
    const body = await res.json();

    // userId should remain the one from the header, not from the body
    expect(body.preferences.userId).toBe("put-user-4");
  });

  it("should persist preferences across requests", async () => {
    const userId = "persist-user";

    // First PUT to set preferences
    const req1 = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "PUT",
        body: { emailEnabled: false },
        headers: { "x-user-id": userId },
      },
    );
    req1.json = jest.fn().mockResolvedValue({ emailEnabled: false });
    await PUT(req1);

    // GET to read back
    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications/preferences", {
        headers: { "x-user-id": userId },
      }),
    );
    const body = await res.json();

    expect(body.preferences.emailEnabled).toBe(false);
    expect(body.preferences.userId).toBe(userId);
  });

  it("should return 500 when request.json() throws", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      { method: "PUT" },
    );
    req.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update preferences");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notifications/preferences (subscribe/unsubscribe)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notification Preferences API – POST", () => {
  it("should handle subscribe action with subscription data", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "POST",
        body: {
          action: "subscribe",
          subscription: { endpoint: "https://push.example.com" },
        },
        headers: { "x-user-id": "post-user-1" },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      action: "subscribe",
      subscription: { endpoint: "https://push.example.com" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Subscribed to push notifications");
  });

  it("should handle unsubscribe action", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "POST",
        body: { action: "unsubscribe" },
        headers: { "x-user-id": "post-user-2" },
      },
    );
    req.json = jest.fn().mockResolvedValue({ action: "unsubscribe" });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Unsubscribed from push notifications");
  });

  it("should return 400 for invalid action", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "POST",
        body: { action: "unknown_action" },
        headers: { "x-user-id": "post-user-3" },
      },
    );
    req.json = jest.fn().mockResolvedValue({ action: "unknown_action" });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("should return 400 for subscribe without subscription data", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      {
        method: "POST",
        body: { action: "subscribe" },
        headers: { "x-user-id": "post-user-4" },
      },
    );
    req.json = jest.fn().mockResolvedValue({ action: "subscribe" });

    const res = await POST(req);
    const body = await res.json();

    // Subscribe without subscription object falls through to invalid action
    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("should return 500 when request.json() throws", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/preferences",
      { method: "POST" },
    );
    req.json = jest.fn().mockRejectedValue(new Error("Parse error"));

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to process request");
  });
});
