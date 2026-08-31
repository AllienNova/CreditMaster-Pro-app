/**
 * POST /api/trading/paper/positions/close
 *
 * The route did not exist, so the mobile "close position" control posted into
 * a 404: the position stayed open, and the screen moved on as though it had
 * been flattened.
 *
 * What these pin, beyond the happy path:
 *
 *  - The account comes from the AUTHENTICATED user, never from the body. That
 *    is the whole ownership boundary — closePosition filters on account_id, so
 *    another user's positionId simply finds nothing.
 *  - "Not yours", "no such position" and "already flat" all answer 404. Any
 *    other split would confirm the existence of someone else's position to a
 *    caller probing uuids.
 *  - realizedPL is whatever the engine reports, including a loss and including
 *    zero. A route that coerced or defaulted it would be inventing a number
 *    about the user's money.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetAccount = jest.fn();
const mockClosePosition = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/trading/paper/PaperTradingEngine", () => ({
  getPaperTradingEngine: () => ({
    getAccount: (...a: unknown[]) => mockGetAccount(...a),
    closePosition: (...a: unknown[]) => mockClosePosition(...a),
  }),
}));

import { POST } from "../route";

const OWNER = "user-1";
const ACCOUNT = "acct-1";
const POSITION = "3a289fa1-857e-443d-be92-45c01968eca8";

function req(body: unknown = { positionId: POSITION }): NextRequest {
  const url = "http://localhost:3000/api/trading/paper/positions/close";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("POST /api/trading/paper/positions/close", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("premium");
    mockGetAccount.mockResolvedValue({ id: ACCOUNT, user_id: OWNER });
    mockClosePosition.mockResolvedValue({
      order: { id: "order-1", symbol: "AAPL", side: "sell", quantity: 10 },
      realizedPL: 125.5,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await POST(req())).status).toBe(401);
  });

  describe("positionId validation", () => {
    it.each([
      [{}, "missing"],
      [{ positionId: "" }, "empty"],
      [{ positionId: "not-a-uuid" }, "not a uuid"],
      [{ positionId: 42 }, "not a string"],
      [{ positionId: null }, "null"],
    ])("rejects %j — %s", async (body, _why) => {
      expect((await POST(req(body))).status).toBe(400);
      expect(mockClosePosition).not.toHaveBeenCalled();
    });

    it("returns 400 for an unparseable body rather than a 500", async () => {
      const bad = req();
      (bad.json as jest.Mock).mockRejectedValue(new SyntaxError("bad json"));
      expect((await POST(bad)).status).toBe(400);
    });
  });

  it("looks the account up from the AUTHENTICATED user", async () => {
    await POST(req());
    expect(mockGetAccount).toHaveBeenCalledWith(OWNER);
  });

  it("closes against that account, never an id from the body", async () => {
    await POST(req({ positionId: POSITION, accountId: "someone-elses" }));
    expect(mockClosePosition).toHaveBeenCalledWith(ACCOUNT, POSITION);
  });

  it("returns 404 when the caller has no paper account", async () => {
    mockGetAccount.mockResolvedValue(null);
    expect((await POST(req())).status).toBe(404);
    expect(mockClosePosition).not.toHaveBeenCalled();
  });

  describe("results", () => {
    it("reports the realized P&L from the engine", async () => {
      const res = await POST(req());
      expect(res.status).toBe(200);
      expect((await res.json()).realizedPL).toBe(125.5);
    });

    it("reports a LOSS unchanged", async () => {
      mockClosePosition.mockResolvedValue({
        order: { id: "order-1" },
        realizedPL: -87.25,
      });
      expect((await (await POST(req())).json()).realizedPL).toBe(-87.25);
    });

    it("reports a break-even close as 0, not as a missing value", async () => {
      mockClosePosition.mockResolvedValue({
        order: { id: "order-1" },
        realizedPL: 0,
      });
      expect((await (await POST(req())).json()).realizedPL).toBe(0);
    });
  });

  describe("when the position cannot be closed", () => {
    beforeEach(() => mockClosePosition.mockResolvedValue(null));

    it("returns 404", async () => {
      expect((await POST(req())).status).toBe(404);
    });

    it("does NOT report success for a close that did not happen", async () => {
      const body = await (await POST(req())).json();
      expect(body.success).toBeUndefined();
      expect(body.realizedPL).toBeUndefined();
    });
  });

  describe("engine failures", () => {
    it("turns an order validation failure into 400, not 500", async () => {
      // A 500 would send the app into a retry on a request that can never
      // succeed.
      mockClosePosition.mockRejectedValue(
        new Error("Order validation failed: Insufficient shares to sell"),
      );
      const res = await POST(req());
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("Insufficient shares");
    });

    it("returns 500 for an unexpected failure, with no realizedPL", async () => {
      mockClosePosition.mockRejectedValue(new Error("connection reset"));
      const res = await POST(req());
      expect(res.status).toBe(500);
      expect((await res.json()).realizedPL).toBeUndefined();
    });
  });
});
