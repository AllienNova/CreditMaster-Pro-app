/**
 * @jest-environment node
 */

/**
 * GET/POST /api/financial/transaction-rules.
 *
 * The route is new; everything behind it was not. `transaction_rules` is a
 * real table with RLS and transactionRulesService has full user-scoped CRUD.
 * Only the HTTP surface was missing, so the mobile screen shipped a "Coffee
 * Shops" rule the user never wrote, carrying matchCount 47.
 *
 * These tests pin the two properties that matter for a per-user resource: the
 * caller's id comes from the guard and never from the body, and a failed read
 * is reported rather than replaced with an empty list.
 */

import { NextRequest } from "next/server";

const mockGetRules = jest.fn();
const mockCreateRule = jest.fn();
jest.mock("@/lib/financial/transaction-rules-service", () => ({
  transactionRulesService: {
    getRules: (...a: unknown[]) => mockGetRules(...a),
    createRule: (...a: unknown[]) => mockCreateRule(...a),
  },
}));

const AUTHED_USER = { id: "user-1", email: "a@b.c", role: "user" };
jest.mock("@/lib/auth/api-guard", () => ({
  withAuth:
    (handler: (req: unknown, user: unknown) => unknown) => (req: unknown) =>
      handler(req, AUTHED_USER),
}));

import { GET, POST } from "../route";

/**
 * A real NextRequest does not carry its body through this jest environment —
 * `request.json()` resolves to {} regardless of what was passed. Mocking
 * `json()` on a cast object is the pattern the rest of this repo's route tests
 * use (see src/app/api/credit/analyze/__tests__/route.test.ts:32).
 */
const post = (body: unknown) =>
  ({
    url: "http://localhost/api/financial/transaction-rules",
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
  }) as unknown as NextRequest;

/** A body that cannot be parsed, for the malformed-input path. */
const postUnparseable = () =>
  ({
    url: "http://localhost/api/financial/transaction-rules",
    method: "POST",
    json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    headers: new Headers(),
  }) as unknown as NextRequest;

const VALID_RULE = {
  name: "Coffee Shops",
  conditions: [{ type: "merchant_contains", value: "coffee" }],
  conditionLogic: "OR",
  actions: [{ type: "set_category", value: "Food & Dining" }],
};

beforeEach(() => jest.clearAllMocks());

describe("GET /api/financial/transaction-rules", () => {
  it("returns the caller's rules", async () => {
    mockGetRules.mockResolvedValue([{ id: "r1", name: "Coffee Shops" }]);

    const res = await GET(
      new NextRequest("http://localhost/api/financial/transaction-rules"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.rules).toHaveLength(1);
    // From the guard, not from a query parameter.
    expect(mockGetRules).toHaveBeenCalledWith("user-1");
  });

  it("reports a failed read instead of returning an empty list", async () => {
    // "You have no rules" and "we could not read your rules" are different
    // statements, and the screen this serves used to make the substitution.
    mockGetRules.mockRejectedValue(new Error("boom"));

    const res = await GET(
      new NextRequest("http://localhost/api/financial/transaction-rules"),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
  });
});

describe("POST /api/financial/transaction-rules", () => {
  it("creates a rule for the authenticated caller", async () => {
    mockCreateRule.mockResolvedValue({ id: "r1", ...VALID_RULE });

    const res = await POST(post(VALID_RULE));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.rule.id).toBe("r1");
    expect(mockCreateRule).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ name: "Coffee Shops" }),
    );
  });

  it("ignores a userId in the body", async () => {
    // The one property worth guarding hardest on a per-user resource.
    mockCreateRule.mockResolvedValue({ id: "r1" });

    await POST(post({ ...VALID_RULE, userId: "someone-else" }));

    expect(mockCreateRule).toHaveBeenCalledWith("user-1", expect.anything());
    const [, input] = mockCreateRule.mock.calls[0];
    expect(input).not.toHaveProperty("userId");
  });

  it("rejects an action the engine cannot execute", async () => {
    // `mark_reviewed` is not in ActionType. An earlier draft of this route
    // accepted it, which would have saved a rule that then did nothing.
    const res = await POST(
      post({ ...VALID_RULE, actions: [{ type: "mark_reviewed", value: true }] }),
    );

    expect(res.status).toBe(400);
    expect(mockCreateRule).not.toHaveBeenCalled();
  });

  it.each([
    ["no conditions", { ...VALID_RULE, conditions: [] }],
    ["no actions", { ...VALID_RULE, actions: [] }],
    ["no name", { ...VALID_RULE, name: "" }],
  ])("rejects a rule with %s", async (_label, payload) => {
    const res = await POST(post(payload));
    expect(res.status).toBe(400);
    expect(mockCreateRule).not.toHaveBeenCalled();
  });

  it("rejects a malformed body without throwing", async () => {
    const res = await POST(postUnparseable());
    expect(res.status).toBe(400);
  });

  it("reports a failed write", async () => {
    mockCreateRule.mockRejectedValue(new Error("boom"));
    const res = await POST(post(VALID_RULE));
    expect(res.status).toBe(500);
  });
});
