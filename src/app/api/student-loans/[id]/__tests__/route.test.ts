/**
 * GET / PATCH / DELETE /api/student-loans/[id]
 *
 * The collection existed; this did not, so app/student-loans/[id].tsx read,
 * edited and deleted into a 404.
 *
 * Three things these pin beyond the happy path:
 *
 *  1. The disclosed column list. account_number is stored in the clear and is
 *     NOT NULL, and the four *_eligible flags are written by a service that has
 *     never contacted NSLDS. Neither is selected — the collection route made
 *     that call deliberately and this must not quietly widen it.
 *  2. Ownership. Service-role bypasses RLS, so .eq("user_id", user.id) is the
 *     whole boundary, and zero rows updated or deleted is NOT a Postgres error
 *     — it is the only signal that a row was not the caller's.
 *  3. Unsupported edits are refused, not dropped. UpdateLoanInput carries
 *     monthlyPayment and repaymentPlan; student_loans has no column for either.
 *     Accepting and discarding them would report an edit that did not happen.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/server", () => {
  const node: Record<string, unknown> = {};
  node.select = (...a: unknown[]) => {
    mockSelect(...a);
    return node;
  };
  node.update = (...a: unknown[]) => {
    mockUpdate(...a);
    return node;
  };
  node.delete = (...a: unknown[]) => {
    mockDelete(...a);
    return node;
  };
  node.eq = (...a: unknown[]) => {
    mockEq(...a);
    return node;
  };
  node.maybeSingle = () => mockMaybeSingle();
  return { supabaseAdmin: { from: () => node } };
});

import { GET, PATCH, DELETE } from "../route";

const OWNER = "user-1";
const LOAN = "3a289fa1-857e-443d-be92-45c01968eca8";

const ROW = {
  id: LOAN,
  loan_id: "L-1",
  loan_type: "federal_unsubsidized",
  servicer_name: "Nelnet",
  current_balance: "12500.50",
  original_amount: "20000",
  interest_rate: "5.5",
  loan_status: "repayment",
  disbursement_date: "2019-09-01T00:00:00Z",
  updated_at: "2026-08-17T00:00:00Z",
};

function req(method: string, body?: unknown, id = LOAN): NextRequest {
  const url = `http://localhost:3000/api/student-loans/${id}`;
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue(body ?? {}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("/api/student-loans/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockMaybeSingle.mockResolvedValue({ data: ROW, error: null });
  });

  describe("negative-auth", () => {
    it.each([
      ["GET", () => GET(req("GET"))],
      ["PATCH", () => PATCH(req("PATCH", { currentBalance: 100 }))],
      ["DELETE", () => DELETE(req("DELETE"))],
    ])("%s returns 401 when not authenticated", async (_verb, call) => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      expect((await call()).status).toBe(401);
    });
  });

  describe("id validation", () => {
    it.each(["not-a-uuid", "1", "../../etc/passwd"])(
      "rejects %j before it reaches the database",
      async (id) => {
        expect((await GET(req("GET", undefined, id))).status).toBe(400);
        expect(mockSelect).not.toHaveBeenCalled();
      },
    );
  });

  describe("GET", () => {
    it("scopes the read to the AUTHENTICATED user", async () => {
      await GET(req("GET"));
      expect(mockEq).toHaveBeenCalledWith("id", LOAN);
      expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
    });

    it("does NOT disclose the account number", async () => {
      // NOT NULL and stored in the clear. The collection route excludes it
      // deliberately; a new endpoint must not widen that.
      await GET(req("GET"));
      const columns = String(mockSelect.mock.calls[0][0]);
      expect(columns).not.toContain("account_number");
    });

    it("does NOT disclose the federal eligibility flags", async () => {
      // Written by a service that has never contacted NSLDS.
      await GET(req("GET"));
      const columns = String(mockSelect.mock.calls[0][0]);
      expect(columns).not.toContain("fresh_start_eligible");
      expect(columns).not.toContain("rehabilitation_eligible");
      expect(columns).not.toContain("discharge_eligible");
      expect(columns).not.toContain("borrower_defense_eligible");
    });

    it("converts Postgres numerics from strings once, at the boundary", async () => {
      const body = await (await GET(req("GET"))).json();
      expect(body.loan.currentBalance).toBe(12500.5);
      expect(body.loan.interestRate).toBe(5.5);
      expect(body.loan.originalPrincipal).toBe(20000);
    });

    it("omits fields nothing stores rather than inventing them", async () => {
      // No column records a monthly payment, and the term length needed to
      // derive one is not stored either.
      const body = await (await GET(req("GET"))).json();
      expect(body.loan.monthlyPayment).toBeUndefined();
      expect(body.loan.repaymentPlan).toBeUndefined();
      expect(body.loan.pslf_eligible).toBeUndefined();
      expect(body.loan.accountNumber).toBeUndefined();
    });

    it("returns 404 when the loan is not the caller's", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      expect((await GET(req("GET"))).status).toBe(404);
    });

    it("returns 500 on a read error rather than an empty loan", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });
      const res = await GET(req("GET"));
      expect(res.status).toBe(500);
      expect((await res.json()).loan).toBeUndefined();
    });
  });

  describe("PATCH", () => {
    it("scopes the update to the AUTHENTICATED user", async () => {
      await PATCH(req("PATCH", { currentBalance: 900 }));
      expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
    });

    it("maps client field names to their columns", async () => {
      await PATCH(
        req("PATCH", { currentBalance: 900, servicer: "MOHELA" }),
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_balance: 900,
          servicer_name: "MOHELA",
        }),
      );
    });

    it.each(["monthlyPayment", "repaymentPlan", "remainingPayments"])(
      "REFUSES %s rather than accepting and discarding it",
      async (field) => {
        // The client type offers these; no column stores them. Dropping them
        // silently would report an edit that never happened.
        const res = await PATCH(req("PATCH", { [field]: 250 }));
        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      },
    );

    it("refuses an attempt to edit a column it does not expose", async () => {
      const res = await PATCH(req("PATCH", { accountNumber: "999" }));
      expect(res.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("refuses a user_id in the body", async () => {
      const res = await PATCH(req("PATCH", { user_id: "somebody-else" }));
      expect(res.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    describe("numeric bounds", () => {
      it.each([
        [{ currentBalance: -1 }, "a negative balance"],
        [{ currentBalance: 10_000_001 }, "a balance past the ceiling"],
        [{ interestRate: -0.5 }, "a negative rate"],
        [{ interestRate: 101 }, "a rate over 100%"],
        [{ currentBalance: "lots" }, "a non-numeric balance"],
      ])("rejects %j — %s", async (body, _why) => {
        expect((await PATCH(req("PATCH", body))).status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it.each([0, 100])("accepts the boundary rate %i", async (rate) => {
        expect(
          (await PATCH(req("PATCH", { interestRate: rate }))).status,
        ).toBe(200);
      });
    });

    it("rejects a blank servicer", async () => {
      expect((await PATCH(req("PATCH", { servicer: "   " }))).status).toBe(400);
    });

    it("rejects an empty patch rather than touching the row", async () => {
      expect((await PATCH(req("PATCH", {}))).status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("stamps updated_at", async () => {
      await PATCH(req("PATCH", { currentBalance: 900 }));
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty("updated_at");
    });

    it("returns 404 — not a false success — when it matched no row", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      const res = await PATCH(req("PATCH", { currentBalance: 900 }));
      expect(res.status).toBe(404);
      expect((await res.json()).loan).toBeUndefined();
    });

    it("returns 400 for an unparseable body", async () => {
      const bad = req("PATCH");
      (bad.json as jest.Mock).mockRejectedValue(new SyntaxError("bad"));
      expect((await PATCH(bad)).status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("scopes the delete to the AUTHENTICATED user", async () => {
      await DELETE(req("DELETE"));
      expect(mockEq).toHaveBeenCalledWith("id", LOAN);
      expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
    });

    it("reports success for the caller's own loan", async () => {
      mockMaybeSingle.mockResolvedValue({ data: { id: LOAN }, error: null });
      const res = await DELETE(req("DELETE"));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    describe("when the loan is not the caller's", () => {
      beforeEach(() =>
        mockMaybeSingle.mockResolvedValue({ data: null, error: null }),
      );

      it("returns 404", async () => {
        expect((await DELETE(req("DELETE"))).status).toBe(404);
      });

      it("does NOT report success for a delete that removed nothing", async () => {
        // Deleting zero rows resolves cleanly; without this check the screen
        // would drop the loan from the list while it is still stored.
        const body = await (await DELETE(req("DELETE"))).json();
        expect(body.success).toBeUndefined();
      });
    });

    it("returns 500 when the delete errors", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });
      expect((await DELETE(req("DELETE"))).status).toBe(500);
    });
  });
});
