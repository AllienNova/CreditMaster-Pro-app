/**
 * @jest-environment node
 *
 * GET /api/tax/documents/checklist
 *
 * The behaviour under test is that REQUIRED is derived from the user's own
 * income, not from a fixed list of every tax form. A generic checklist would
 * tell a W-2 employee with no investments that they are missing a 1099-B and a
 * K-1 — wrong, and alarming enough that someone might go hunting for forms
 * that do not exist.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const mockValidateFromHeaders = jest.fn();
const mockFetchTaxProfile = jest.fn();
const eqCalls: Array<[string, unknown]> = [];
let documentsResult: { data: unknown; error: unknown } = {
  data: [],
  error: null,
};

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...a: unknown[]) => mockValidateFromHeaders(...a),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn(async () => "user"),
}));
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({})),
}));
jest.mock("@/lib/tax/tax-profile-repository", () => ({
  fetchTaxProfile: (...a: unknown[]) => mockFetchTaxProfile(...a),
}));

function chain() {
  const c: Record<string, unknown> = {};
  c.select = jest.fn(() => c);
  c.eq = jest.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return c;
  });
  c.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(documentsResult).then(resolve);
  return c;
}

const mockFrom = jest.fn(() => chain());

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => ({ from: mockFrom })),
}));

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const CALLER = "user-doc-3";

const W2_ONLY_PROFILE = {
  w2Income: 90000,
  interestIncome: 0,
  dividendIncome: 0,
  capitalGainsShortTerm: 0,
  capitalGainsLongTerm: 0,
  selfEmploymentIncome: 0,
  retirementIncome: 0,
};

function get(url = "http://localhost:3000/api/tax/documents/checklist") {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const types = (items: { type: string }[]) => items.map((i) => i.type);

beforeEach(() => {
  jest.clearAllMocks();
  eqCalls.length = 0;
  documentsResult = { data: [], error: null };
  (createClient as jest.Mock).mockResolvedValue({});
  mockFrom.mockImplementation(() => chain());
  (getServiceRoleClient as jest.Mock).mockReturnValue({ from: mockFrom });
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
  mockFetchTaxProfile.mockResolvedValue({ ...W2_ONLY_PROFILE });
});

describe("GET /api/tax/documents/checklist", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../route");

    expect((await GET(get())).status).toBe(401);
  });

  it("requires only what the profile's income implies", async () => {
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // W-2 income only: a 1099-B is not missing, it is irrelevant.
    expect(types(body.data.required)).toEqual(["w2"]);
    expect(types(body.data.optional)).toContain("1099_b");
  });

  it("adds investment forms when the profile has investment income", async () => {
    mockFetchTaxProfile.mockResolvedValue({
      ...W2_ONLY_PROFILE,
      interestIncome: 300,
      dividendIncome: 1200,
      capitalGainsLongTerm: 5000,
    });
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(types(body.data.required)).toEqual(
      expect.arrayContaining(["w2", "1099_int", "1099_div", "1099_b"]),
    );
  });

  it("requires a 1099-NEC for self-employment income", async () => {
    mockFetchTaxProfile.mockResolvedValue({
      ...W2_ONLY_PROFILE,
      w2Income: 0,
      selfEmploymentIncome: 40000,
    });
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(types(body.data.required)).toEqual(["1099_nec"]);
  });

  it("marks a document received once it has been uploaded", async () => {
    documentsResult = { data: [{ document_type: "w2" }], error: null };
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(body.data.required[0]).toMatchObject({ type: "w2", received: true });
  });

  it("scopes the upload lookup to the caller and the year", async () => {
    const { GET } = await import("../route");
    await GET(get("http://localhost:3000/api/tax/documents/checklist?year=2024"));

    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).toContainEqual(["tax_year", 2024]);
  });

  it("requires nothing, and says so, when there is no profile", async () => {
    mockFetchTaxProfile.mockResolvedValue(null);
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // Inventing a requirement set from a default filer would send someone
    // looking for forms their situation does not call for.
    expect(body.data.required).toEqual([]);
    expect(body.data.profileMissing).toBe(true);
  });

  it("carries a human label for every item", async () => {
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    for (const item of [...body.data.required, ...body.data.optional]) {
      expect(item.label).toBeTruthy();
      expect(item.label).not.toBe(item.type);
    }
  });

  it("never lists the same type as both required and optional", async () => {
    mockFetchTaxProfile.mockResolvedValue({
      ...W2_ONLY_PROFILE,
      dividendIncome: 500,
    });
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    const overlap = types(body.data.required).filter((t) =>
      types(body.data.optional).includes(t),
    );
    expect(overlap).toEqual([]);
  });

  it("rejects a non-numeric year", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      get("http://localhost:3000/api/tax/documents/checklist?year=soon"),
    );

    expect(res.status).toBe(400);
  });

  it("errors rather than reporting nothing uploaded when the read fails", async () => {
    documentsResult = { data: null, error: { message: "connection reset" } };
    const { GET } = await import("../route");

    // "You have uploaded nothing" would tell someone to re-upload documents
    // they already hold.
    expect((await GET(get())).status).toBe(500);
  });
});
