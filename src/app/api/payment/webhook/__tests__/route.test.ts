/**
 * @jest-environment node
 *
 * Integration tests for POST /api/payment/webhook
 * Covers: missing signature → 400, invalid signature → 400 (no downstream call),
 * valid event types (invoice.paid, checkout.session.completed,
 * customer.subscription.updated), handler error → 400,
 * missing webhook secret → 500.
 */

import { NextRequest } from "next/server";

// ── Shared mock fns — defined before jest.mock factories ──────────────────────
const mockVerify = jest.fn();
const mockHandle = jest.fn();
const mockHeadersGet = jest.fn();

jest.mock("@/lib/payment/stripe-service", () => ({
  stripeService: {
    verifyWebhookSignature: mockVerify,
    handleWebhookEvent: mockHandle,
  },
}));

// next/headers returns a plain object with a get() method
jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

import { POST } from "../route";
import { headers } from "next/headers";

function makeRequest(body = "raw-body"): NextRequest {
  return {
    text: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const fakeEvent = (type: string) =>
  ({ id: "evt_1", type, data: { object: {} } } as unknown as import("stripe").default.Event);

describe("POST /api/payment/webhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

    // Re-wire after clearAllMocks
    (headers as jest.Mock).mockResolvedValue({ get: mockHeadersGet });
    mockHeadersGet.mockReturnValue(null); // default: no signature
  });

  afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  // ── Missing signature → 400, no downstream ───────────────────────────────
  it("returns 400 when stripe-signature header is absent", async () => {
    mockHeadersGet.mockReturnValue(null);
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing stripe-signature/i);
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockHandle).not.toHaveBeenCalled();
  });

  // ── Missing webhook secret → 500 ─────────────────────────────────────────
  it("returns 500 when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    mockHeadersGet.mockImplementation((key: string) =>
      key === "stripe-signature" ? "sig_abc" : null,
    );
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/webhook configuration error/i);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  // ── Invalid signature → 400, no downstream ───────────────────────────────
  it("returns 400 when verifyWebhookSignature throws (bad signature)", async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === "stripe-signature" ? "sig_bad" : null,
    );
    mockVerify.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/webhook handler failed/i);
    expect(mockHandle).not.toHaveBeenCalled();
  });

  // ── invoice.paid → 200 ───────────────────────────────────────────────────
  it("processes invoice.paid event and returns 200", async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === "stripe-signature" ? "sig_valid" : null,
    );
    const event = fakeEvent("invoice.paid");
    mockVerify.mockReturnValue(event);
    mockHandle.mockResolvedValue(undefined);
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(mockHandle).toHaveBeenCalledWith(event);
  });

  // ── checkout.session.completed → 200 ─────────────────────────────────────
  it("processes checkout.session.completed event and returns 200", async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === "stripe-signature" ? "sig_valid" : null,
    );
    const event = fakeEvent("checkout.session.completed");
    mockVerify.mockReturnValue(event);
    mockHandle.mockResolvedValue(undefined);
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(mockHandle).toHaveBeenCalledWith(event);
  });

  // ── customer.subscription.updated → 200 ──────────────────────────────────
  it("processes customer.subscription.updated event and returns 200", async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === "stripe-signature" ? "sig_valid" : null,
    );
    const event = fakeEvent("customer.subscription.updated");
    mockVerify.mockReturnValue(event);
    mockHandle.mockResolvedValue(undefined);
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
  });

  // ── handleWebhookEvent throws → 400 ──────────────────────────────────────
  it("returns 400 when handleWebhookEvent throws", async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === "stripe-signature" ? "sig_valid" : null,
    );
    const event = fakeEvent("invoice.paid");
    mockVerify.mockReturnValue(event);
    mockHandle.mockRejectedValue(new Error("DB connection failed"));
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/webhook handler failed/i);
  });
});
