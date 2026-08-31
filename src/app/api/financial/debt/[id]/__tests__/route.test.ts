/**
 * PATCH and DELETE /api/financial/debt/[id]
 *
 * Neither existed — the family had only the collection — so editing a debt's
 * balance and deleting a debt both did nothing.
 *
 * The case worth the most attention is the cross-user DELETE. deleteDebt()
 * filters on id AND user_id, so a debt belonging to someone else matches zero
 * rows — and deleting zero rows is NOT a Postgres error, so the service
 * resolves cleanly. That is correct at the service layer and is deliberately
 * pinned by its own test ("idor: resolves without error for cross-user id").
 * A route that reported that silence as {success: true} would tell someone
 * their debt was deleted when it was not, so this one checks ownership first.
 */

import { NextRequest } from "next/server";
import { ZodError } from "zod";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockUpdateDebt = jest.fn();
const mockDeleteDebt = jest.fn();
const mockGetDebt = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/financial/debt-service", () => ({
  debtService: {
    updateDebt: (...args: unknown[]) => mockUpdateDebt(...args),
    deleteDebt: (...args: unknown[]) => mockDeleteDebt(...args),
    getDebt: (...args: unknown[]) => mockGetDebt(...args),
  },
}));

import { PATCH, DELETE } from "../route";

const OWNER = "user-1";
const DEBT = "debt-123";

function req(method: string, body?: unknown): NextRequest {
  const url = `http://localhost:3000/api/financial/debt/${DEBT}`;
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue(body ?? {}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("/api/financial/debt/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockUpdateDebt.mockResolvedValue({ id: DEBT, balance: 900 });
    mockGetDebt.mockResolvedValue({ id: DEBT, balance: 900 });
    mockDeleteDebt.mockResolvedValue(undefined);
  });

  describe("PATCH", () => {
    it("returns 401 when not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      expect((await PATCH(req("PATCH", { balance: 900 }))).status).toBe(401);
    });

    it("passes the AUTHENTICATED user id to the service", async () => {
      await PATCH(req("PATCH", { balance: 900 }));
      expect(mockUpdateDebt).toHaveBeenCalledWith(DEBT, OWNER, { balance: 900 });
    });

    it("returns the updated debt", async () => {
      const res = await PATCH(req("PATCH", { balance: 900 }));
      expect(res.status).toBe(200);
      expect((await res.json()).data.balance).toBe(900);
    });

    it("turns the service's validation error into a 400, not a 500", async () => {
      // debtPatchSchema runs inside updateDebt, so an invalid field arrives
      // here as a ZodError rather than as a bad request the route detected.
      mockUpdateDebt.mockRejectedValue(
        new ZodError([
          { code: "custom", path: ["balance"], message: "Expected number" },
        ]),
      );
      const res = await PATCH(req("PATCH", { balance: "lots" }));
      expect(res.status).toBe(400);
      expect((await res.json()).issues).toHaveLength(1);
    });

    it("returns 404 for a debt that is not the caller's", async () => {
      mockUpdateDebt.mockRejectedValue(new Error("Debt not found"));
      expect((await PATCH(req("PATCH", { balance: 900 }))).status).toBe(404);
    });

    it("returns 500 for an unexpected service failure", async () => {
      mockUpdateDebt.mockRejectedValue(new Error("connection reset"));
      expect((await PATCH(req("PATCH", { balance: 900 }))).status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      expect((await DELETE(req("DELETE"))).status).toBe(401);
    });

    it("deletes and reports success for the caller's own debt", async () => {
      const res = await DELETE(req("DELETE"));
      expect(res.status).toBe(200);
      expect(mockDeleteDebt).toHaveBeenCalledWith(DEBT, OWNER);
    });

    describe("when the debt is not the caller's", () => {
      beforeEach(() => mockGetDebt.mockResolvedValue(null));

      it("returns 404", async () => {
        expect((await DELETE(req("DELETE"))).status).toBe(404);
      });

      it("does NOT report success for a delete that removed nothing", async () => {
        // Without the ownership check this is the failure: deleteDebt resolves
        // cleanly on zero rows, so the route would answer {success: true}.
        const body = await (await DELETE(req("DELETE"))).json();
        expect(body.success).toBeUndefined();
      });

      it("does not even attempt the delete", async () => {
        await DELETE(req("DELETE"));
        expect(mockDeleteDebt).not.toHaveBeenCalled();
      });
    });

    it("returns 500 when the delete itself fails", async () => {
      mockDeleteDebt.mockRejectedValue(
        new Error("Failed to delete debt: foreign key violation"),
      );
      expect((await DELETE(req("DELETE"))).status).toBe(500);
    });
  });
});
