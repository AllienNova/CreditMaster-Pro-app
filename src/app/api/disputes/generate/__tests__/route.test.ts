/**
 * @jest-environment node
 *
 * Integration tests for POST /api/disputes/generate
 * Covers: (a) unauthenticated → 401, (b) insufficient credits → 402,
 * (c) ai mode: missing fields → 400, valid → 200,
 * (d) template mode: missing templateId → 400, unknown templateId → 404, valid → 200,
 * (e) strategy mode: missing strategyId/scenario → 400, scenario only → 200,
 *     valid strategyId → 200,
 * (f) orchestrator error → 500.
 * GET handler → 200 with API docs.
 */

import { NextRequest } from "next/server";

// ── Shared mocks — must be defined before jest.mock factories ─────────────────
const mockGetUser = jest.fn();
const mockGenerateDispute = jest.fn().mockResolvedValue("Generated dispute letter text");
const mockReviewCompliance = jest.fn().mockResolvedValue({ passed: true });
const mockCheckCredits = jest.fn().mockResolvedValue(true);
const mockDeductCredits = jest.fn().mockResolvedValue(undefined);

const fakeTemplate = {
  id: "template-001",
  name: "Late Payment Removal",
  scenario: "Late payment dispute",
  successRate: 0.72,
  tone: "formal",
  fcraSection: "605",
  requiredDocuments: ["Payment history"],
  bestPractices: ["Be specific"],
  placeholders: ["[YOUR_NAME]", "[CREDITOR_NAME]"],
  template: "Dear [CREDITOR_NAME], I am [YOUR_NAME] and I dispute...",
};

const fakeStrategy = {
  id: "strategy-001",
  name: "Goodwill Deletion",
  description: "Request goodwill deletion",
  successRate: 0.6,
  difficulty: "easy",
  riskLevel: "low",
  timeline: "30-60 days",
  legalBasis: "FCRA",
  steps: ["Write letter"],
  expectedOutcomes: ["Deletion"],
  aiPrompt: "Generate a goodwill letter for {DISPUTE_DETAILS} from {YOUR_NAME} at {YOUR_ADDRESS}",
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } }),
  ),
}));

jest.mock("@/lib/ai-orchestrator", () => ({
  getAIOrchestrator: jest.fn(() => ({
    generateDispute: mockGenerateDispute,
    reviewCompliance: mockReviewCompliance,
  })),
}));

jest.mock("@/lib/credits", () => ({
  creditService: {
    checkSufficientCredits: mockCheckCredits,
    deductCredits: mockDeductCredits,
  },
  CREDIT_COSTS: {
    dispute_letter_single: 50,
    dispute_letter_all: 150,
  },
}));

jest.mock("@/lib/disputes/dispute-service", () => ({
  disputeService: {},
  ALL_DISPUTE_TEMPLATES: [fakeTemplate],
  ALL_ADVANCED_STRATEGIES: [fakeStrategy],
  getTemplateById: jest.fn((id: string) => (id === fakeTemplate.id ? fakeTemplate : undefined)),
  getStrategyById: jest.fn((id: string) => (id === fakeStrategy.id ? fakeStrategy : undefined)),
  recommendStrategy: jest.fn(() => [fakeStrategy]),
}));

import { POST, GET } from "../route";
import { createClient } from "@/lib/supabase/server";
import { getAIOrchestrator } from "@/lib/ai-orchestrator";
import {
  getTemplateById,
  getStrategyById,
  recommendStrategy,
} from "@/lib/disputes/dispute-service";

const fakeUser = { id: "user-dispute-1", email: "user@example.com" };

function makeRequest(body: Record<string, unknown>): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/disputes/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Re-wire after clearAllMocks
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: mockGetUser },
    });
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockCheckCredits.mockResolvedValue(true);
    mockDeductCredits.mockResolvedValue(undefined);
    mockGenerateDispute.mockResolvedValue("Generated dispute letter text");
    mockReviewCompliance.mockResolvedValue({ passed: true });
    (getAIOrchestrator as jest.Mock).mockReturnValue({
      generateDispute: mockGenerateDispute,
      reviewCompliance: mockReviewCompliance,
    });
    (getTemplateById as jest.Mock).mockImplementation((id: string) =>
      id === fakeTemplate.id ? fakeTemplate : undefined,
    );
    (getStrategyById as jest.Mock).mockImplementation((id: string) =>
      id === fakeStrategy.id ? fakeStrategy : undefined,
    );
    (recommendStrategy as jest.Mock).mockReturnValue([fakeStrategy]);
  });

  // ── (a) Unauthenticated → 401 ─────────────────────────────────────────────
  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Not signed in" } });
    const res = await POST(makeRequest({ mode: "ai" }));
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/unauthorized/i);
    expect(mockGenerateDispute).not.toHaveBeenCalled();
  });

  // ── (b) Insufficient credits → 402 ───────────────────────────────────────
  it("returns 402 when user has insufficient credits for ai mode", async () => {
    mockCheckCredits.mockResolvedValue(false);
    const res = await POST(makeRequest({
      mode: "ai",
      creditReport: "report",
      disputeReason: "Incorrect balance",
      userInfo: { name: "Jane", address: "123 Main St" },
    }));
    const json = await res.json();
    expect(res.status).toBe(402);
    expect(json.code).toBe("INSUFFICIENT_CREDITS");
    expect(mockGenerateDispute).not.toHaveBeenCalled();
  });

  // ── (c) AI mode: missing creditReport → 400 ──────────────────────────────
  it("returns 400 when ai mode is missing creditReport", async () => {
    const res = await POST(makeRequest({
      mode: "ai",
      disputeReason: "Wrong balance",
      userInfo: { name: "Jane", address: "123 Main St" },
    }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/missing required fields/i);
  });

  it("returns 400 when ai mode userInfo is missing address", async () => {
    const res = await POST(makeRequest({
      mode: "ai",
      creditReport: "some report",
      disputeReason: "Wrong balance",
      userInfo: { name: "Jane" },
    }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/name and address/i);
  });

  // ── (c) AI mode: valid → 200 ─────────────────────────────────────────────
  it("returns 200 with dispute letter for valid ai mode request", async () => {
    const res = await POST(makeRequest({
      mode: "ai",
      creditReport: "Negative item: late payment Jan 2025",
      disputeReason: "Payment was made on time",
      userInfo: { name: "Jane Doe", address: "123 Main St, Springfield, IL" },
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.disputeLetter).toBe("Generated dispute letter text");
    expect(json.data.mode).toBe("ai");
    expect(mockGenerateDispute).toHaveBeenCalledTimes(1);
  });

  // ── (c) AI mode: defaults to ai when mode is omitted, allBureaus cost ────
  it("defaults to ai mode and uses the all-bureaus cost when allBureaus is true", async () => {
    const res = await POST(makeRequest({
      creditReport: "report",
      disputeReason: "Wrong balance",
      userInfo: { name: "Jane Doe", address: "123 Main St" },
      allBureaus: true,
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.mode).toBe("ai");
    expect(mockCheckCredits).toHaveBeenCalledWith(fakeUser.id, 150);
  });

  // ── (d) Template mode: missing templateId → 400 ───────────────────────────
  it("returns 400 when template mode has no templateId", async () => {
    const res = await POST(makeRequest({ mode: "template" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing required field: templateId/i);
  });

  // ── (d) Template mode: unknown templateId → 404 ───────────────────────────
  it("returns 404 when templateId does not match any template", async () => {
    const res = await POST(makeRequest({ mode: "template", templateId: "does-not-exist" }));
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toMatch(/template not found/i);
  });

  // ── (d) Template mode: valid → 200 ───────────────────────────────────────
  it("returns 200 with filled template for valid template mode request", async () => {
    const res = await POST(makeRequest({
      mode: "template",
      templateId: fakeTemplate.id,
      placeholders: { YOUR_NAME: "Jane Doe", CREDITOR_NAME: "Bank Corp" },
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.mode).toBe("template");
    expect(json.data.disputeLetter).toContain("Bank Corp");
    expect(json.data.disputeLetter).toContain("Jane Doe");
    expect(mockGenerateDispute).not.toHaveBeenCalled();
  });

  // ── (e) Strategy mode: missing both → 400 ────────────────────────────────
  it("returns 400 when strategy mode has neither strategyId nor scenario", async () => {
    const res = await POST(makeRequest({ mode: "strategy" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing required field: strategyId or scenario/i);
  });

  // ── (e) Strategy mode: scenario only → 200 with recommendations ──────────
  it("returns 200 with strategy recommendations when only scenario is provided", async () => {
    const res = await POST(makeRequest({
      mode: "strategy",
      scenario: {
        disputeType: "late_payment",
        previousAttempts: 0,
        hasEvidence: true,
        accountAge: 24,
        isCollection: false,
        hasRelationship: true,
      },
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.recommendedStrategies).toHaveLength(1);
    expect(recommendStrategy).toHaveBeenCalled();
  });

  // ── (e) Strategy mode: valid strategyId → 200 ────────────────────────────
  it("returns 200 with AI-generated letter for valid strategy mode request", async () => {
    const res = await POST(makeRequest({
      mode: "strategy",
      strategyId: fakeStrategy.id,
      variables: {
        YOUR_NAME: "Jane Doe",
        YOUR_ADDRESS: "123 Main St",
        DISPUTE_DETAILS: "Account #12345 was paid on time",
      },
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.mode).toBe("strategy");
    expect(json.data.strategy.id).toBe(fakeStrategy.id);
    expect(mockGenerateDispute).toHaveBeenCalledTimes(1);
  });

  // ── (c) AI mode: object creditReport + compliance review ─────────────────
  it("accepts an object creditReport and runs compliance review when requested", async () => {
    const res = await POST(makeRequest({
      mode: "ai",
      creditReport: { accounts: [{ remarks: "late payment" }] },
      disputeReason: "Payment was on time",
      userInfo: { name: "Jane Doe", address: "123 Main St" },
      reviewCompliance: true,
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.complianceReview).toEqual({ passed: true });
    expect(mockReviewCompliance).toHaveBeenCalledTimes(1);
  });

  // ── (c) AI mode: credit deduction failure is swallowed, still 200 ────────
  it("returns 200 for ai mode even when credit deduction throws", async () => {
    mockDeductCredits.mockRejectedValue(new Error("ledger write failed"));
    const res = await POST(makeRequest({
      mode: "ai",
      creditReport: "report",
      disputeReason: "Wrong balance",
      userInfo: { name: "Jane Doe", address: "123 Main St" },
    }));
    expect(res.status).toBe(200);
    expect(mockDeductCredits).toHaveBeenCalledTimes(1);
  });

  // ── (e) Strategy mode: unknown strategyId → 404 ──────────────────────────
  it("returns 404 when strategyId does not match any strategy", async () => {
    const res = await POST(makeRequest({ mode: "strategy", strategyId: "does-not-exist" }));
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toMatch(/strategy not found/i);
  });

  // ── (e) Strategy mode: credit deduction failure is swallowed, still 200 ──
  it("returns 200 for strategy mode even when credit deduction throws", async () => {
    mockDeductCredits.mockRejectedValue(new Error("ledger write failed"));
    const res = await POST(makeRequest({
      mode: "strategy",
      strategyId: fakeStrategy.id,
      variables: { YOUR_NAME: "Jane Doe", YOUR_ADDRESS: "123 Main St" },
    }));
    expect(res.status).toBe(200);
    expect(mockDeductCredits).toHaveBeenCalledTimes(1);
  });

  // ── (f) Orchestrator throws → 500 ───────────────────────────────────────
  // The switch arms use `return await handler(body)`, so a rejection inside a
  // handler is caught by the outer try/catch and returned as a 500 response
  // instead of escaping as an unhandled rejection.
  it("returns 500 when AI orchestrator throws", async () => {
    mockGenerateDispute.mockRejectedValue(new Error("AIML API unavailable"));
    const res = await POST(makeRequest({
      mode: "ai",
      creditReport: "report",
      disputeReason: "Wrong balance",
      userInfo: { name: "Jane Doe", address: "123 Main St" },
    }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe("AIML API unavailable");
  });
});

// ── GET → API docs ────────────────────────────────────────────────────────────
describe("GET /api/disputes/generate", () => {
  it("returns 200 with API documentation", async () => {
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.modes).toBeDefined();
    expect(json.modes.ai).toBeDefined();
    expect(json.modes.template).toBeDefined();
    expect(json.modes.strategy).toBeDefined();
  });
});
