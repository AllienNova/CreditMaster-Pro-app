/**
 * POST /api/tax/recommendations/[id]/dismiss
 *
 * The route did not exist. Mobile posted /tax/tips/{id}/dismiss — a 404 — and
 * the optimizer screen removed the tip from local state whether or not the call
 * worked, so a dismissal lasted until the next launch and then came back.
 *
 * Dismissed is deliberately a different status from completed: one means "not
 * for me", the other "I did this", and merging them would credit a user with
 * acting on advice they rejected.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockUpdate = jest.fn();
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
jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      update: (...u: unknown[]) => {
        mockUpdate(...u);
        return {
          eq: (...a: unknown[]) => {
            mockEq(...a);
            return {
              eq: (...b: unknown[]) => {
                mockEq(...b);
                return {
                  select: () => ({ maybeSingle: () => mockMaybeSingle() }),
                };
              },
            };
          },
        };
      },
    }),
  }),
}));

import { POST } from "../route";

const OWNER = "user-1";
const REC = "3a289fa1-857e-443d-be92-45c01968eca8";

function req(id = REC): NextRequest {
  const url = `http://localhost:3000/api/tax/recommendations/${id}/dismiss`;
  return {
    url,
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("POST /api/tax/recommendations/[id]/dismiss", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockMaybeSingle.mockResolvedValue({ data: { id: REC }, error: null });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await POST(req())).status).toBe(401);
  });

  describe("id validation", () => {
    it.each(["not-a-uuid", "1", "../../etc/passwd", ""])(
      "rejects %j before it reaches the database",
      async (id) => {
        expect((await POST(req(id))).status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      },
    );
  });

  it("reads the id from the second-to-last path segment, not the last", async () => {
    // The path ends in /dismiss, so taking the last segment would try to
    // dismiss a recommendation with the id "dismiss".
    await POST(req());
    expect(mockEq).toHaveBeenCalledWith("id", REC);
  });

  it("sets status to dismissed, not completed", async () => {
    await POST(req());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dismissed" }),
    );
  });

  it("scopes the update to the AUTHENTICATED user", async () => {
    // Service-role bypasses RLS, so this filter is the whole boundary.
    await POST(req());
    expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
  });

  describe("when the recommendation is not the caller's", () => {
    beforeEach(() =>
      mockMaybeSingle.mockResolvedValue({ data: null, error: null }),
    );

    it("returns 404 rather than 403, so uuids cannot be probed", async () => {
      const res = await POST(req());
      expect(res.status).toBe(404);
    });

    it("does not report success for an update that changed nothing", async () => {
      expect((await (await POST(req())).json()).success).toBeUndefined();
    });
  });

  it("returns 500 when the write fails, rather than a false success", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect((await res.json()).success).toBeUndefined();
  });
});
