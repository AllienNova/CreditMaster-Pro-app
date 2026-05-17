/**
 * @jest-environment node
 *
 * Integration tests for POST /api/payment/billing/plan (TASK-WBH-03 / FND-017)
 *
 * New contract (real Stripe control flow — FND-017 is fixed):
 *   - No active subscription → { status: "redirect", checkoutUrl }
 *   - Existing subscription  → changeSubscriptionPlan → { status: "updated", subscription }
 *   - Cancel path            → cancelSubscription     → { status: "updated", subscription }
 *   - planId === "free"      → cancelSubscription     → { status: "updated", subscription }
 *   - Invalid planId         → 400
 *
 * Do NOT assert synchronous "active" status — that was FND-017.
 */

import { NextRequest } from "next/server";

// ── Module mocks (before imports) ───────────────────────────────────────────

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role");
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/subscriptions/subscription-service", () => ({
  subscriptionService: {
    getUserSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    changeSubscriptionPlan: jest.fn(),
    getUserProfile: jest.fn(),
  },
}));
jest.mock("@/lib/payment/stripe-service", () => ({
  stripeService: {
    createCheckoutSession: jest.fn(),
  },
  SUBSCRIPTION_PLANS: [
    { id: "free",    name: "Free",    priceId: "price_free",    price: 0,      interval: "month", features: [] },
    { id: "pro",     name: "Pro",     priceId: "price_pro",     price: 99.99,  interval: "month", features: [] },
    { id: "standard",name: "Standard",priceId: "price_standard",price: 29.99,  interval: "month", features: [] },
  ],
}));

import { POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { resolveRoleFromDb } from "@/lib/auth/resolve-role";
import { rbac } from "@/lib/auth/rbac";
import { subscriptionService } from "@/lib/subscriptions/subscription-service";
import { stripeService } from "@/lib/payment/stripe-service";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = { id: "user-premium-1", email: "premium@example.com", role: "premium" };

const mockActiveSub = {
  id: "sub-db-001",
  userId: mockUser.id,
  stripeSubscriptionId: "sub_stripe_001",
  stripePriceId: "price_standard",
  status: "active",
  cancelAtPeriodEnd: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockUpdatedSub = {
  ...mockActiveSub,
  stripePriceId: "price_pro",
};

const mockCanceledSub = {
  ...mockActiveSub,
  status: "canceled",
  cancelAtPeriodEnd: true,
};

const mockProfile = {
  id: mockUser.id,
  fullName: "Test User",
  subscriptionTier: "pro" as const,
  subscriptionStatus: "active" as const,
  stripeCustomerId: "cus_test_001",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  const url = "http://localhost:3000/api/payment/billing/plan";
  return {
    url,
    method: "POST",
    headers: new Headers({ authorization: "Bearer valid.jwt.token" }),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/payment/billing/plan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (resolveRoleFromDb as jest.Mock).mockResolvedValue("premium");
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(null);
    (subscriptionService.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
    (subscriptionService.changeSubscriptionPlan as jest.Mock).mockResolvedValue(mockUpdatedSub);
    (subscriptionService.cancelSubscription as jest.Mock).mockResolvedValue(mockCanceledSub);
    (stripeService.createCheckoutSession as jest.Mock).mockResolvedValue({
      url: "https://checkout.stripe.com/session/test_001",
    });
  });

  // ── Negative auth ──────────────────────────────────────────────────────────

  it("returns 401 when JWT is missing or invalid", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const res = await POST(makeRequest({ planId: "pro" }));
    expect(res.status).toBe(401);
    expect(subscriptionService.getUserSubscription).not.toHaveBeenCalled();
    expect(subscriptionService.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("returns 403 when user lacks billing:update permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const res = await POST(makeRequest({ planId: "pro" }));
    expect(res.status).toBe(403);
    expect(subscriptionService.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  // ── Input validation ───────────────────────────────────────────────────────

  it("returns 400 when planId is not a known plan and cancelSubscription is not set", async () => {
    const res = await POST(makeRequest({ planId: "invalid-plan" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid plan/i);
  });

  // ── New subscription → redirect ────────────────────────────────────────────

  it("returns redirect with checkoutUrl when user has no active subscription", async () => {
    (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("redirect");
    expect(json.checkoutUrl).toBe("https://checkout.stripe.com/session/test_001");
    expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
      "price_pro",
      "cus_test_001",
      expect.any(String),
      expect.any(String),
    );
    expect(subscriptionService.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("returns 500 when no active sub and user has no Stripe customer", async () => {
    (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(null);
    (subscriptionService.getUserProfile as jest.Mock).mockResolvedValue({
      ...mockProfile,
      stripeCustomerId: null,
    });

    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/no stripe customer/i);
  });

  // ── Existing subscription → change plan ───────────────────────────────────

  it("returns updated subscription when changing plan on existing subscription", async () => {
    (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(mockActiveSub);

    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("updated");
    expect(json.subscription).toBeDefined();
    expect(subscriptionService.changeSubscriptionPlan).toHaveBeenCalledWith(
      mockUser.id,
      "price_pro",
    );
    expect(stripeService.createCheckoutSession).not.toHaveBeenCalled();
  });

  // ── Cancel subscription ────────────────────────────────────────────────────

  it("cancels subscription when cancelSubscription=true", async () => {
    (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(mockActiveSub);

    const res = await POST(makeRequest({ cancelSubscription: true }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("updated");
    expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith(mockUser.id);
    expect(subscriptionService.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("cancels subscription when planId is 'free'", async () => {
    (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(mockActiveSub);

    const res = await POST(makeRequest({ planId: "free" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("updated");
    expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith(mockUser.id);
    expect(subscriptionService.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  // ── Upstream errors → 500 ─────────────────────────────────────────────────

  it("returns 500 when changeSubscriptionPlan throws", async () => {
    (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(mockActiveSub);
    (subscriptionService.changeSubscriptionPlan as jest.Mock).mockRejectedValue(
      new Error("Stripe unavailable"),
    );

    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/failed to update plan/i);
  });

  it("returns 500 when createCheckoutSession throws", async () => {
    (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(null);
    (stripeService.createCheckoutSession as jest.Mock).mockRejectedValue(
      new Error("Stripe session error"),
    );

    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/failed to update plan/i);
  });
});
