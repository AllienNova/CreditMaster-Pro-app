/**
 * POST /api/financial/budgets/apply-recommendation
 *
 * The route did not exist; the call fell through to budgets/[id] with
 * id="apply-recommendation" and Next.js answered 405, so "Apply" in the AI
 * budget optimiser has never done anything.
 *
 * The behaviour worth pinning is what it REFUSES to do: it must not create a
 * budget for a category the user does not have, and it must report the before
 * and after amounts rather than a bare success.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
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
jest.mock("@/lib/financial/budget-service", () => ({
  budgetService: {
    getBudgetsByUser: (...args: unknown[]) => mockGetBudgetsByUser(...args),
    updateBudget: (...args: unknown[]) => mockUpdateBudget(...args),
  },
}));

import { POST } from "../route";

const USER = "user-1";

function req(body: unknown): NextRequest {
  const url = "http://localhost:3000/api/financial/budgets/apply-recommendation";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("POST /api/financial/budgets/apply-recommendation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: USER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockGetBudgetsByUser.mockResolvedValue([
      { id: "b-1", category: "groceries", budgetedAmount: 400 },
    ]);
    mockUpdateBudget.mockResolvedValue({ id: "b-1", budgetedAmount: 550 });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(req({ category: "groceries", amount: 550 }));
    expect(res.status).toBe(401);
  });

  describe("validation", () => {
    it.each<[unknown, string]>([
      [{}, "nothing"],
      [{ category: "groceries" }, "no amount"],
      [{ amount: 550 }, "no category"],
      [{ category: "not-a-category", amount: 550 }, "unknown category"],
      [{ category: "groceries", amount: 0 }, "zero"],
      [{ category: "groceries", amount: -50 }, "negative"],
      [{ category: "groceries", amount: 10_000_001 }, "absurdly large"],
      [{ category: "groceries", amount: "550" }, "amount as a string"],
    ])("rejects %j — %s", async (body, _why) => {
      const res = await POST(req(body));
      expect(res.status).toBe(400);
      expect(mockUpdateBudget).not.toHaveBeenCalled();
    });
  });

  it("looks the budget up scoped to the AUTHENTICATED user", async () => {
    await POST(req({ category: "groceries", amount: 550 }));
    expect(mockGetBudgetsByUser).toHaveBeenCalledWith(USER, {
      activeOnly: true,
      category: "groceries",
    });
  });

  describe("when the user has no budget in that category", () => {
    beforeEach(() => mockGetBudgetsByUser.mockResolvedValue([]));

    it("returns 404", async () => {
      const res = await POST(req({ category: "groceries", amount: 550 }));
      expect(res.status).toBe(404);
    });

    it("does NOT create one", async () => {
      // Inventing a budget line from an AI suggestion would be this endpoint
      // deciding what the user budgets for.
      await POST(req({ category: "groceries", amount: 550 }));
      expect(mockUpdateBudget).not.toHaveBeenCalled();
    });
  });

  describe("applying", () => {
    it("updates only the amount, on the caller's own budget", async () => {
      await POST(req({ category: "groceries", amount: 550 }));
      expect(mockUpdateBudget).toHaveBeenCalledWith("b-1", USER, {
        budgetedAmount: 550,
      });
    });

    it("reports the before and after amounts, not a bare success", async () => {
      const body = await (
        await POST(req({ category: "groceries", amount: 550 }))
      ).json();
      expect(body.applied.previousAmount).toBe(400);
      expect(body.applied.newAmount).toBe(550);
      expect(body.applied.category).toBe("groceries");
    });

    it("returns 500 when the write fails", async () => {
      mockUpdateBudget.mockRejectedValue(new Error("db down"));
      const res = await POST(req({ category: "groceries", amount: 550 }));
      expect(res.status).toBe(500);
    });
  });
});
