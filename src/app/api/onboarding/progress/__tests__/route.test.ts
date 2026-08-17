/**
 * Tests for Onboarding Progress API
 *
 * Route wrapped in withAuth (TASK-AUTH-03f); auth resolves via
 * jwtValidation.validateFromHeaders + resolveRoleFromDb, which reads BOTH the
 * Authorization header (mobile) and the sb-<ref>-auth-token cookie (browser).
 *
 * WHY THIS FILE WAS REWRITTEN. It used to mock `createClient` — the
 * cookie-scoped client — and assert the PGRST116 "no progress yet" branch. Both
 * GET and POST passed. Against a real server with a real ES256 bearer token
 * both returned HTTP 500 and wrote nothing:
 *
 *     GET  /api/onboarding/progress -> 500 {"error":"Failed to fetch progress"}
 *     POST /api/onboarding/progress -> 500 {"error":"Failed to save progress"}
 *
 * A bearer caller carries no cookie, so the cookie-scoped client degraded to
 * the `anon` role, which holds no GRANT on the table:
 *
 *     42501  permission denied for table onboarding_progress
 *
 * 42501 is not PGRST116, so the "return the default" branch never fired and
 * every request fell through to the generic 500. The table, its RLS policies
 * and the `authenticated` grants were all fine — the route simply never carried
 * the caller's identity. The fix reads with the service-role client and scopes
 * every query to the JWT-verified user.id, so the tests below pin the scoping
 * rather than trusting RLS that is no longer in play.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();
const mockUpsertSingle = jest.fn();

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
      select: () => ({
        eq: (...a: unknown[]) => {
          mockEq(...a);
          return { maybeSingle: () => mockMaybeSingle() };
        },
      }),
      upsert: (...u: unknown[]) => {
        mockUpsert(...u);
        return { select: () => ({ single: () => mockUpsertSingle() }) };
      },
    }),
  }),
}));

import { GET, POST } from "../route";

const OWNER = "test-user-id";
const mockUser = { id: OWNER, email: "test@example.com" };

function makeRequest(method = "GET", body?: unknown): NextRequest {
  const url = "http://localhost:3000/api/onboarding/progress";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue(body ?? {}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const validBody = {
  current_step: 3,
  completed_steps: [1, 2],
  form_data: { firstName: "Dog" },
};

describe("/api/onboarding/progress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsertSingle.mockResolvedValue({
      data: { user_id: OWNER, ...validBody },
      error: null,
    });
  });

  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      expect((await GET(makeRequest("GET"))).status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      expect((await POST(makeRequest("POST", validBody))).status).toBe(401);
    });
  });

  describe("GET", () => {
    it("reads only the AUTHENTICATED user's row", async () => {
      // Service-role bypasses RLS, so this filter is the entire ownership
      // boundary. Without it the route would serve whichever row came first.
      await GET(makeRequest("GET"));
      expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
    });

    it("returns default progress when the user has no saved row", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const response = await GET(makeRequest("GET"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current_step).toBe(1);
      expect(data.completed_steps).toEqual([]);
      expect(data.form_data).toEqual({});
    });

    it("returns saved progress when it exists", async () => {
      const saved = {
        id: "progress-id",
        user_id: OWNER,
        current_step: 3,
        completed_steps: [1, 2],
        form_data: { step_1: { name: "John" } },
        last_updated: "2026-01-07T12:00:00Z",
      };
      mockMaybeSingle.mockResolvedValue({ data: saved, error: null });

      const response = await GET(makeRequest("GET"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(saved);
    });

    it("returns 500 on a read error rather than pretending progress is empty", async () => {
      // This is the case the old suite could not see: a permission error must
      // NOT be laundered into "you have not started yet", which would silently
      // restart a user's onboarding from step 1.
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { code: "42501", message: "permission denied" },
      });

      const response = await GET(makeRequest("GET"));
      expect(response.status).toBe(500);
      expect((await response.json()).current_step).toBeUndefined();
    });
  });

  describe("POST", () => {
    describe("current_step", () => {
      it.each([
        [0, "below the first step"],
        [6, "past the last step"],
        [10, "far past the last step"],
        [2.5, "not an integer"],
        ["3", "a string"],
        [null, "null"],
        [undefined, "missing"],
      ])("rejects %j — %s", async (current_step, _why) => {
        const response = await POST(
          makeRequest("POST", { ...validBody, current_step }),
        );
        expect(response.status).toBe(400);
        expect(mockUpsert).not.toHaveBeenCalled();
      });

      it.each([1, 5])("accepts the boundary step %i", async (current_step) => {
        // The table's CHECK constraint is (current_step >= 1 AND <= 5); these
        // two are the exact edges it permits.
        const response = await POST(
          makeRequest("POST", { ...validBody, current_step }),
        );
        expect(response.status).toBe(200);
      });
    });

    describe("completed_steps", () => {
      it("rejects a non-array", async () => {
        const response = await POST(
          makeRequest("POST", { ...validBody, completed_steps: "1,2" }),
        );
        expect(response.status).toBe(400);
        expect(mockUpsert).not.toHaveBeenCalled();
      });

      it("rejects non-integer members, because the column is INT4[]", async () => {
        // Postgres answers a string here with `invalid input syntax for type
        // integer`, which the caller would see as an opaque 500. Same family as
        // the transactions.category TEXT[] mistake: the mocked client cannot
        // enforce a column type, so the validation has to.
        const response = await POST(
          makeRequest("POST", { ...validBody, completed_steps: ["one"] }),
        );
        expect(response.status).toBe(400);
        expect(mockUpsert).not.toHaveBeenCalled();
      });

      it("rejects members outside the 1-5 step range", async () => {
        const response = await POST(
          makeRequest("POST", { ...validBody, completed_steps: [1, 9] }),
        );
        expect(response.status).toBe(400);
      });

      it("rejects more entries than there are steps", async () => {
        const response = await POST(
          makeRequest("POST", {
            ...validBody,
            completed_steps: [1, 1, 1, 1, 1, 1, 1],
          }),
        );
        expect(response.status).toBe(400);
      });

      it("accepts an empty array", async () => {
        const response = await POST(
          makeRequest("POST", { ...validBody, completed_steps: [] }),
        );
        expect(response.status).toBe(200);
      });
    });

    describe("form_data", () => {
      it.each([
        [null, "null"],
        ["a string", "a string"],
        [42, "a number"],
        [[1, 2], "an array"],
      ])("rejects %j — %s", async (form_data, _why) => {
        const response = await POST(
          makeRequest("POST", { ...validBody, form_data }),
        );
        expect(response.status).toBe(400);
        expect(mockUpsert).not.toHaveBeenCalled();
      });

      it("rejects a payload too large for a wizard's worth of answers", async () => {
        const response = await POST(
          makeRequest("POST", {
            ...validBody,
            form_data: { blob: "x".repeat(70_000) },
          }),
        );
        expect(response.status).toBe(413);
        expect(mockUpsert).not.toHaveBeenCalled();
      });
    });

    it("writes user_id from the AUTHENTICATED user, never from the body", async () => {
      await POST(
        makeRequest("POST", { ...validBody, user_id: "somebody-else" }),
      );
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: OWNER }),
        { onConflict: "user_id" },
      );
    });

    it("persists the step, the completed steps and the form data", async () => {
      await POST(makeRequest("POST", validBody));
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          current_step: 3,
          completed_steps: [1, 2],
          form_data: { firstName: "Dog" },
        }),
        { onConflict: "user_id" },
      );
    });

    it("returns 500 when the write fails, rather than reporting a save that did not happen", async () => {
      mockUpsertSingle.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });
      const response = await POST(makeRequest("POST", validBody));
      expect(response.status).toBe(500);
      expect((await response.json()).success).toBeUndefined();
    });
  });
});
