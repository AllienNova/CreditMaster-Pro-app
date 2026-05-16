/** @jest-environment node */
import { jwtValidation } from "@/lib/auth/jwt-validation";
jest.mock("@/lib/auth/jwt-validation");
const mockResolve = jest.fn();
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...a: unknown[]) => mockResolve(...a),
}));
import { withAuth, withRole, withPermission } from "../api-guard";
import { NextResponse } from "next/server";

const handler = withRole("admin", async () => NextResponse.json({ ok: true }));
const req = () => new Request("http://t/api/admin/x") as never;

describe("withRole — DB-sourced role", () => {
  beforeEach(() => jest.clearAllMocks());
  it("DENIES (403) a JWT that claims admin when profiles.role is 'user'", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "admin" }, // forged/stale claim
    });
    mockResolve.mockResolvedValue("user"); // DB truth
    expect((await handler(req())).status).toBe(403);
  });
  it("ALLOWS (200) when profiles.role is 'admin'", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "user" },
    });
    mockResolve.mockResolvedValue("admin");
    expect((await handler(req())).status).toBe(200);
  });
  it("returns 401 when the JWT is invalid", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    expect((await handler(req())).status).toBe(401);
  });
});

// withPermission must also use the DB role — real rbac, no rbac mock.
// "admin:analytics" is an admin-category permission granted to `admin`
// (and above) but never to `user` — verified against rbac.ts rolePermissions.
describe("withPermission — DB-sourced role", () => {
  const permHandler = withPermission("admin:analytics", async () =>
    NextResponse.json({ ok: true }),
  );
  beforeEach(() => jest.clearAllMocks());

  it("DENIES (403) a JWT claiming admin when profiles.role is 'user'", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "admin" },
    });
    mockResolve.mockResolvedValue("user");
    expect((await permHandler(req())).status).toBe(403);
  });
  it("ALLOWS (200) when profiles.role grants the permission", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "user" },
    });
    mockResolve.mockResolvedValue("admin");
    expect((await permHandler(req())).status).toBe(200);
  });
});

// A thrown resolveRoleFromDb (e.g. SUPABASE_SERVICE_ROLE_KEY unset) must
// fail closed: a clean 503, never an unhandled throw, never access.
describe("api-guard — role resolution failure", () => {
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("withRole returns 503 when resolveRoleFromDb rejects", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "user" },
    });
    mockResolve.mockRejectedValue(new Error("service-role key unset"));
    const res = await handler(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Authorization service unavailable");
  });

  it("withPermission returns 503 when resolveRoleFromDb rejects", async () => {
    const permHandler = withPermission("admin:analytics", async () =>
      NextResponse.json({ ok: true }),
    );
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "user" },
    });
    mockResolve.mockRejectedValue(new Error("db down"));
    expect((await permHandler(req())).status).toBe(503);
  });

  it("withAuth returns 503 when resolveRoleFromDb rejects", async () => {
    const authHandler = withAuth(async () => NextResponse.json({ ok: true }));
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "user" },
    });
    mockResolve.mockRejectedValue(new Error("db down"));
    expect((await authHandler(req())).status).toBe(503);
  });
});
