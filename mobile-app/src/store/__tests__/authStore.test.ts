/**
 * Fynvita Auth Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import { useAuthStore } from "../authStore";

// Mock Supabase services
jest.mock("../../services/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    })),
  },
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
}));

const {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  supabase,
} = require("../../services/supabase");

describe("Auth Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("initialize", () => {
    it("should initialize with existing user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        user_metadata: { name: "Test User" },
        created_at: "2024-01-01",
      };

      getCurrentUser.mockResolvedValueOnce({ user: mockUser, error: null });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: "user-123",
            email: "test@example.com",
            name: "Test User",
            subscription_tier: "premium",
          },
        }),
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe("test@example.com");
      expect(state.isLoading).toBe(false);
    });

    it("should handle no user", async () => {
      getCurrentUser.mockResolvedValueOnce({ user: null, error: null });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it("should handle initialization error", async () => {
      getCurrentUser.mockResolvedValueOnce({
        user: null,
        error: new Error("Auth error"),
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe("Auth error");
      expect(state.isAuthenticated).toBe(false);
    });

    // FND-064 regression: __DEV__ auth bypass must not exist.
    // initialize() must always call getCurrentUser (real Supabase path),
    // never short-circuit with a hardcoded seedUser.
    it("always calls getCurrentUser — no hardcoded bypass (FND-064)", async () => {
      getCurrentUser.mockResolvedValueOnce({ user: null, error: null });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      // Supabase path was reached: getCurrentUser called exactly once
      expect(getCurrentUser).toHaveBeenCalledTimes(1);

      const state = useAuthStore.getState();
      // No hardcoded seed user leaked into auth state
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.user?.email).not.toBe("marcus.johnson@gmail.com");
    });

    it("never sets seedUser id when no real session exists (FND-064)", async () => {
      getCurrentUser.mockResolvedValueOnce({ user: null, error: null });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(useAuthStore.getState().user?.id).not.toBe("dev-user-001");
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("login", () => {
    it("should login successfully", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        user_metadata: { name: "Test User" },
        created_at: "2024-01-01",
      };

      signIn.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
      });

      let result;
      await act(async () => {
        result = await useAuthStore
          .getState()
          .login("test@example.com", "password123");
      });

      expect(result).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it("should handle login error", async () => {
      signIn.mockResolvedValueOnce({
        data: {},
        error: new Error("Invalid credentials"),
      });

      let result;
      await act(async () => {
        result = await useAuthStore
          .getState()
          .login("test@example.com", "wrong");
      });

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe("Invalid credentials");
    });
  });

  describe("register", () => {
    it("should register successfully", async () => {
      const mockUser = {
        id: "new-user-123",
        email: "new@example.com",
        created_at: "2024-01-01",
      };

      signUp.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
      supabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      let result;
      await act(async () => {
        result = await useAuthStore
          .getState()
          .register("new@example.com", "password123", "New User");
      });

      expect(result).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.name).toBe("New User");
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      useAuthStore.setState({
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test User",
          subscription_tier: "free" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        isAuthenticated: true,
      });

      signOut.mockResolvedValueOnce();

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useAuthStore.setState({ error: "Some error" });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
