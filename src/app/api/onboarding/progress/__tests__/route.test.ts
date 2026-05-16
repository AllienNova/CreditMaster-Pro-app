/**
 * Tests for Onboarding Progress API
 *
 * Route wrapped in withAuth (TASK-AUTH-03f); auth resolves via
 * jwtValidation.validateFromHeaders + resolveRoleFromDb.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockSingle = jest.fn();
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
jest.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: (...args: unknown[]) => mockSingle(...args),
          }),
        }),
        upsert: () => ({
          select: () => ({
            single: (...args: unknown[]) => mockUpsertSingle(...args),
          }),
        }),
      }),
    }),
}));

import { GET, POST } from "../route";

const mockUser = { id: "test-user-id", email: "test@example.com" };

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

describe("/api/onboarding/progress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      const response = await GET(makeRequest("GET"));
      expect(response.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      const response = await POST(
        makeRequest("POST", {
          current_step: 2,
          completed_steps: [1],
          form_data: {},
        }),
      );
      expect(response.status).toBe(401);
    });
  });

  describe("GET", () => {
    it("should return default progress if no saved progress exists", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const response = await GET(makeRequest("GET"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current_step).toBe(1);
      expect(data.completed_steps).toEqual([]);
      expect(data.form_data).toEqual({});
    });

    it("should return saved progress if it exists", async () => {
      const mockProgress = {
        id: "progress-id",
        user_id: mockUser.id,
        current_step: 3,
        completed_steps: [1, 2],
        form_data: { step_1: { name: "John" } },
        last_updated: "2026-01-07T12:00:00Z",
      };
      mockSingle.mockResolvedValue({ data: mockProgress, error: null });

      const response = await GET(makeRequest("GET"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockProgress);
    });
  });

  describe("POST", () => {
    it("should validate current_step is between 1 and 5", async () => {
      const response = await POST(
        makeRequest("POST", {
          current_step: 10,
          completed_steps: [],
          form_data: {},
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid current_step");
    });
  });
});
