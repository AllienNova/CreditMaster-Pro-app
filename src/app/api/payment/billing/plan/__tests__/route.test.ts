/**
 * @jest-environment node
 *
 * Integration tests for POST /api/payment/billing/plan
 * Covers: (a) unauthenticated → 401, (b) wrong role → 403,
 * (c) valid input + auth → 200 (update plan),
 * (d) cancel subscription path → 200,
 * (e) upstream error → 500.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/payment/billing-profile-store");

import { POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { billingProfileStore } from "@/lib/payment/billing-profile-store";

const mockUser = { id: "user-premium-1", email: "premium@example.com", role: "premium" };

const mockProfile = {
  customerId: "cus_test",
  currentPlanId: "pro",
  status: "active",
  cancelAtPeriodEnd: false,
  currentPeriodStart: new Date("2026-01-01"),
  currentPeriodEnd: new Date("2026-02-01"),
  paymentMethods: [],
  invoices: [],
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return {
    headers: new Headers({ authorization: "Bearer valid.jwt.token" }),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/payment/billing/plan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (billingProfileStore.updatePlan as jest.Mock).mockResolvedValue(mockProfile);
    (billingProfileStore.cancelSubscription as jest.Mock).mockResolvedValue({
      ...mockProfile,
      status: "canceled",
      cancelAtPeriodEnd: true,
    });
  });

  // ── (a) Unauthenticated → 401 ────────────────────────────────────────────
  it("returns 401 when JWT is missing or invalid", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
    expect(billingProfileStore.updatePlan).not.toHaveBeenCalled();
  });

  // ── (b) Wrong role / missing permission → 403 ────────────────────────────
  it("returns 403 when user lacks billing:update permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.error).toMatch(/forbidden/i);
    expect(billingProfileStore.updatePlan).not.toHaveBeenCalled();
  });

  // ── (c) Valid update plan → 200 ──────────────────────────────────────────
  it("returns 200 with subscription data when plan is updated", async () => {
    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.subscription.planId).toBe("pro");
    expect(json.subscription.status).toBe("active");
    expect(billingProfileStore.updatePlan).toHaveBeenCalledWith(mockUser.id, "pro");
    expect(billingProfileStore.cancelSubscription).not.toHaveBeenCalled();
  });

  // ── (c) Cancel subscription path → 200 ───────────────────────────────────
  it("returns 200 with canceled status when cancelSubscription=true", async () => {
    const res = await POST(makeRequest({ cancelSubscription: true }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.subscription.status).toBe("canceled");
    expect(json.subscription.cancelAtPeriodEnd).toBe(true);
    expect(billingProfileStore.cancelSubscription).toHaveBeenCalledWith(mockUser.id);
    expect(billingProfileStore.updatePlan).not.toHaveBeenCalled();
  });

  // ── (e) Upstream / store error → 500 ─────────────────────────────────────
  it("returns 500 when billingProfileStore throws", async () => {
    (billingProfileStore.updatePlan as jest.Mock).mockRejectedValue(
      new Error("DB unavailable"),
    );
    const res = await POST(makeRequest({ planId: "pro" }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/failed to update plan/i);
  });
});
