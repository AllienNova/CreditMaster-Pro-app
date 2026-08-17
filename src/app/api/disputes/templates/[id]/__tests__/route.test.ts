/**
 * GET /api/disputes/templates/[id]
 *
 * The collection existed; this did not, so disputeTemplateApi.getTemplate(id)
 * 404'd and the template detail screen had nothing to render.
 *
 * The catalogue now lives in @/lib/disputes/letter-templates and is imported by
 * both routes. These tests deliberately exercise the REAL catalogue rather than
 * a mock: the thing worth pinning is that this route and the collection serve
 * the same array, and a mock would let them drift apart while both stayed
 * green — which is the whole reason the const was extracted.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));

import { GET } from "../route";
import { GET as LIST } from "../../route";
import { DISPUTE_TEMPLATES } from "@/lib/disputes/letter-templates";

function req(id: string): NextRequest {
  const url = `http://localhost:3000/api/disputes/templates/${id}`;
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function listReq(): NextRequest {
  const url = "http://localhost:3000/api/disputes/templates";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/disputes/templates/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(req("late-payment-goodwill"))).status).toBe(401);
  });

  it("returns every template the collection advertises", async () => {
    // If a future edit gives one route its own copy of the catalogue, this is
    // the test that fails.
    for (const known of DISPUTE_TEMPLATES) {
      const res = await GET(req(known.id));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(known);
    }
  });

  it("serves the SAME object the collection serves", async () => {
    const list = await (await LIST(listReq())).json();
    const first = list.templates[0];
    const detail = await (await GET(req(first.id))).json();
    expect(detail).toEqual(first);
  });

  it("includes the letter body and its variables", async () => {
    const body = await (await GET(req("late-payment-goodwill"))).json();
    expect(body.template).toContain("{{creditor_name}}");
    expect(body.variables).toContain("creditor_name");
  });

  describe("id validation", () => {
    it("returns 404 for a well-formed id that names no template", async () => {
      expect((await GET(req("no-such-template"))).status).toBe(404);
    });

    it.each([
      ["Late-Payment", "upper case"],
      ["late_payment", "an underscore"],
      ["late payment", "a space"],
      ["-leading", "a leading dash"],
    ])("rejects %j — %s", async (id, _why) => {
      expect((await GET(req(id))).status).toBe(400);
    });

    it("cannot be reached by path traversal, because URL parsing eats it first", async () => {
      // Measured, not assumed. new URL(".../templates/../../etc/passwd")
      // normalises pathname to "/api/etc/passwd", so the last segment this
      // route reads is "passwd" — an ordinary slug that simply names no
      // template. The traversal never reaches the lookup, and the answer is a
      // plain 404 rather than a 400.
      const res = await GET(req("../../etc/passwd"));
      expect(res.status).toBe(404);
    });

    it("distinguishes a malformed id from an unknown one", async () => {
      // 400 vs 404 tells a caller whether to fix the request or the id.
      expect((await GET(req("!!"))).status).toBe(400);
      expect((await GET(req("also-not-real"))).status).toBe(404);
    });
  });
});
