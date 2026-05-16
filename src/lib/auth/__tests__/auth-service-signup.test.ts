/**
 * @jest-environment node
 */

const mockSignUp = jest.fn();
const mockProfilesInsert = jest.fn();
const mockFrom = jest.fn();
const mockDeleteUser = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    auth: { signUp: mockSignUp },
    from: mockFrom,
  }),
}));

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    auth: { admin: { deleteUser: mockDeleteUser } },
  },
}));

jest.mock("@/lib/monitoring/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { authService } from "../auth-service";

const VALID_SIGNUP = {
  name: "Jane Tester",
  email: "jane@example.com",
  password: "Str0ng-Passw0rd!",
};

describe("AuthService.signUp atomicity (FND-009)", () => {
  beforeEach(() => {
    // jest.config has resetMocks: true — re-establish implementations.
    mockFrom.mockReturnValue({ insert: mockProfilesInsert });
  });

  it("deletes the auth user when the profile insert fails (no orphan)", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: { access_token: "tok" } },
      error: null,
    });
    mockProfilesInsert.mockResolvedValue({
      error: { message: "profiles insert failed" },
    });
    mockDeleteUser.mockResolvedValue({ error: null });

    const result = await authService.signUp(VALID_SIGNUP);

    expect(result.success).toBe(false);
    // The orphaned auth user must be rolled back.
    expect(mockDeleteUser).toHaveBeenCalledWith("user-1");
  });

  it("does not delete the auth user on a successful signup", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-2" }, session: { access_token: "tok" } },
      error: null,
    });
    mockProfilesInsert.mockResolvedValue({ error: null });

    const result = await authService.signUp(VALID_SIGNUP);

    expect(result.success).toBe(true);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("logs an error when the orphan-cleanup deleteUser itself fails", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-3" }, session: { access_token: "tok" } },
      error: null,
    });
    mockProfilesInsert.mockResolvedValue({
      error: { message: "profiles insert failed" },
    });
    mockDeleteUser.mockResolvedValue({
      error: new Error("admin deleteUser failed"),
    });

    const result = await authService.signUp(VALID_SIGNUP);

    expect(result.success).toBe(false);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining("roll back orphaned auth user"),
      expect.any(Error),
      { userId: "user-3" },
    );
  });
});
