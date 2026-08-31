/**
 * POST /api/financial/budgets/adjust — apply every suggested adjustment.
 *
 * The module exported GET alone, so RecommendationsContent.tsx:10 has always
 * POSTed { applyAll: true } into a 405 and "Apply budget recommendations" has
 * never applied anything. The GET half worked, so the screen looked fine.
 *
 * This writes to EVERY budget the engine names, in one request, so the tests
 * below care most about what it declines to touch and whether it says what it
 * did.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockSuggest = jest.fn();
const mockGetBudgetsByUser = jest.fn();
const mockUpdateBudget = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/financial/smart-budget-engine", () => ({
  getSmartBudgetEngine: () => ({
    suggestCategoryAdjustments: (...args: unknown[]) => mockSuggest(...args),
  }),
}));
jest.mock("@/lib/financial/budget-service", () => ({
  budgetService: {
    getBudgetsByUser: (...args: unknown[]) => mockGetBudgetsByUser(...args),
    updateBudget: (...args: unknown[]) => mockUpdateBudget(...args),
  },
}));
jest.mock("@/lib/api/financial-api-middleware", () => ({
  applyFinancialAPIMiddleware: jest.fn().mockResolvedValue(null),
  finalizeResponse: (res: unknown) => res,
}));

import { POST } from "../route";

const USER = "user-1";

function req(body: unknown = { applyAll: true }): NextRequest {
  const url = "http://localhost:3000/api/financial/budgets/adjust";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("POST /api/financial/budgets/adjust", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: USER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("premium");
    mockSuggest.mockResolvedValue([
      { id: "r1", category: "groceries", currentAmount: 400, suggestedAmount: 550 },
    ]);
    mockGetBudgetsByUser.mockResolvedValue([
      { id: "b-1", category: "groceries", budgetedAmount: 400 },
    ]);
    mockUpdateBudget.mockResolvedValue({ id: "b-1", budgetedAmount: 550 });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await POST(req())).status).toBe(401);
  });

  it("asks the engine for the CALLER's suggestions", async () => {
    await POST(req());
    expect(mockSuggest).toHaveBeenCalledWith(USER);
  });

  it("applies a suggestion and reports before and after", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.appliedCount).toBe(1);
    expect(body.applied[0]).toMatchObject({
      category: "groceries",
      previousAmount: 400,
      newAmount: 550,
    });
    expect(mockUpdateBudget).toHaveBeenCalledWith("b-1", USER, {
      budgetedAmount: 550,
    });
  });

  describe("what it refuses to touch", () => {
    it("skips a category the user has no budget for, and does NOT create one", async () => {
      mockGetBudgetsByUser.mockResolvedValue([]);
      const body = await (await POST(req())).json();
      expect(mockUpdateBudget).not.toHaveBeenCalled();
      expect(body.appliedCount).toBe(0);
      expect(body.skipped[0].reason).toMatch(/not created/i);
    });

    it("skips a recommendation with no category", async () => {
      mockSuggest.mockResolvedValue([
        { id: "r1", currentAmount: 400, suggestedAmount: 550 },
      ]);
      const body = await (await POST(req())).json();
      expect(mockUpdateBudget).not.toHaveBeenCalled();
      expect(body.skipped[0].reason).toMatch(/no category/i);
    });

    it.each([0, -10, Number.NaN, undefined])(
      "skips a suggested amount of %s rather than writing it",
      async (amount) => {
        mockSuggest.mockResolvedValue([
          { id: "r1", category: "groceries", currentAmount: 400, suggestedAmount: amount },
        ]);
        const body = await (await POST(req())).json();
        expect(mockUpdateBudget).not.toHaveBeenCalled();
        expect(body.skipped[0].reason).toMatch(/positive/i);
      },
    );
  });

  it("applies each of several suggestions and counts them", async () => {
    mockSuggest.mockResolvedValue([
      { id: "r1", category: "groceries", currentAmount: 400, suggestedAmount: 550 },
      { id: "r2", category: "dining_out", currentAmount: 200, suggestedAmount: 120 },
    ]);
    mockGetBudgetsByUser
      .mockResolvedValueOnce([{ id: "b-1", category: "groceries", budgetedAmount: 400 }])
      .mockResolvedValueOnce([{ id: "b-2", category: "dining_out", budgetedAmount: 200 }]);
    mockUpdateBudget
      .mockResolvedValueOnce({ id: "b-1", budgetedAmount: 550 })
      .mockResolvedValueOnce({ id: "b-2", budgetedAmount: 120 });

    const body = await (await POST(req())).json();
    expect(body.appliedCount).toBe(2);
    expect(body.applied.map((a: { category: string }) => a.category)).toEqual([
      "groceries",
      "dining_out",
    ]);
  });

  describe("when the user has no active budget at all", () => {
    // suggestCategoryAdjustments THROWS "No active budget found" for this, and
    // my first draft let it fall through to the catch — so a user with no
    // budget yet got "Could not apply the budget adjustments", a failure
    // message for a situation where there was simply nothing to apply. Live
    // testing caught it; these mocks had always resolved successfully. GET
    // already treats it as an empty state and POST now matches.
    beforeEach(() =>
      mockSuggest.mockRejectedValue(new Error("No active budget found")),
    );

    it("returns 200, not a server error", async () => {
      expect((await POST(req())).status).toBe(200);
    });

    it("reports nothing applied and says why", async () => {
      const body = await (await POST(req())).json();
      expect(body.appliedCount).toBe(0);
      expect(body.hasBudget).toBe(false);
      expect(body.message).toMatch(/no active budget/i);
      expect(mockUpdateBudget).not.toHaveBeenCalled();
    });
  });

  it("returns 500 when the engine throws, without claiming a partial success", async () => {
    mockSuggest.mockRejectedValue(new Error("engine down"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.appliedCount).toBeUndefined();
  });
});
