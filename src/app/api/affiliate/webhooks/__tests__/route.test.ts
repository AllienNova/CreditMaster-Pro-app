import type { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { webcrypto } from "node:crypto";
import { POST } from "../route";

// Polyfill Web Crypto API for Jest test environment (route uses crypto.subtle)
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: true,
  });
}

// Mock revenue tracker
jest.mock("@/lib/affiliate/revenue-tracker", () => ({
  revenueTracker: {
    trackEvent: jest.fn(),
  },
}));

import { revenueTracker } from "@/lib/affiliate/revenue-tracker";

const WEBHOOK_SECRET = "test-webhook-secret-key";

function computeHmac(timestamp: string, body: string): string {
  return createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

function createMockWebhookRequest(
  body: string,
  headers: Record<string, string> = {},
) {
  return {
    url: "http://localhost:3000/api/affiliate/webhooks",
    method: "POST",
    json: jest.fn().mockResolvedValue(JSON.parse(body)),
    text: jest.fn().mockResolvedValue(body),
    headers: new Headers({
      "Content-Type": "application/json",
      ...headers,
    }),
    nextUrl: new URL("http://localhost:3000/api/affiliate/webhooks"),
  } as unknown as NextRequest;
}

describe("POST /api/affiliate/webhooks", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, MONEYLION_WEBHOOK_SECRET: WEBHOOK_SECRET };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when signature header is missing", async () => {
    const req = createMockWebhookRequest(
      '{"event":"click.created","data":{}}',
      { "x-moneylion-timestamp": String(Math.floor(Date.now() / 1000)) },
    );
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Missing signature headers");
  });

  it("returns 401 when timestamp header is missing", async () => {
    const req = createMockWebhookRequest(
      '{"event":"click.created","data":{}}',
      { "x-moneylion-signature": "fake-sig" },
    );
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Missing signature headers");
  });

  it("returns 401 when timestamp is too old (replay protection)", async () => {
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const body = '{"event":"click.created","data":{}}';
    const sig = await computeHmac(oldTimestamp, body);

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": sig,
      "x-moneylion-timestamp": oldTimestamp,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Timestamp out of range");
  });

  it("returns 500 when webhook secret is not configured", async () => {
    delete process.env.MONEYLION_WEBHOOK_SECRET;

    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = '{"event":"click.created","data":{}}';

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": "some-sig",
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Webhook not configured");
  });

  it("returns 401 when signature is invalid", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = '{"event":"click.created","data":{}}';

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": "invalid-signature",
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Invalid signature");
  });

  it("returns 400 when payload is missing event", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = '{"data":{"productId":"p-1"}}';
    const sig = await computeHmac(timestamp, body);

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": sig,
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid webhook payload");
  });

  it("processes click.created event", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = {
      event: "click.created",
      data: {
        clickId: "clk-123",
        productId: "prod-1",
        partnerId: "partner-1",
        userId: "user-1",
      },
    };
    const body = JSON.stringify(payload);
    const sig = await computeHmac(timestamp, body);

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": sig,
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.event).toBe("click.created");
    expect(revenueTracker.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "click",
        productId: "prod-1",
        partnerId: "partner-1",
        userId: "user-1",
      }),
    );
  });

  it("processes application.submitted event", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = {
      event: "application.submitted",
      data: {
        clickId: "clk-456",
        productId: "prod-2",
        partnerId: "partner-2",
        userId: "user-2",
      },
    };
    const body = JSON.stringify(payload);
    const sig = await computeHmac(timestamp, body);

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": sig,
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(revenueTracker.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "application" }),
    );
  });

  it("processes approval.granted event with commission", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = {
      event: "approval.granted",
      data: {
        clickId: "clk-789",
        productId: "prod-3",
        partnerId: "partner-3",
        userId: "user-3",
        commission: 25.5,
      },
    };
    const body = JSON.stringify(payload);
    const sig = await computeHmac(timestamp, body);

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": sig,
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(revenueTracker.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "approval",
        commissionAmount: 25.5,
      }),
    );
  });

  it("processes conversion.completed event", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = {
      event: "conversion.completed",
      data: {
        clickId: "clk-abc",
        productId: "prod-4",
        partnerId: "partner-4",
        userId: "user-4",
        amount: 100,
        commission: 15,
      },
    };
    const body = JSON.stringify(payload);
    const sig = await computeHmac(timestamp, body);

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": sig,
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.event).toBe("conversion.completed");
    expect(revenueTracker.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "conversion" }),
    );
  });

  it("acknowledges unknown events without processing", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = {
      event: "account.updated",
      data: { userId: "user-1" },
    };
    const body = JSON.stringify(payload);
    const sig = await computeHmac(timestamp, body);

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": sig,
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.skipped).toBe(true);
    expect(revenueTracker.trackEvent).not.toHaveBeenCalled();
  });

  it("uses 'anonymous' for missing userId", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = {
      event: "click.created",
      data: {
        clickId: "clk-no-user",
        productId: "prod-5",
        partnerId: "partner-5",
      },
    };
    const body = JSON.stringify(payload);
    const sig = await computeHmac(timestamp, body);

    const req = createMockWebhookRequest(body, {
      "x-moneylion-signature": sig,
      "x-moneylion-timestamp": timestamp,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(revenueTracker.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "anonymous" }),
    );
  });
});
