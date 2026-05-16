/**
 * Tests for Trading Modes API Routes
 *
 * Coverage:
 * - GET /api/trading/modes (mode status)
 * - POST /api/trading/modes/graduate (graduation)
 * - GET /api/trading/modes/progress (graduation progress)
 * - GET /api/trading/modes/permissions (mode permissions)
 * - GET /api/trading/modes/circuit-breakers (circuit breaker history)
 * - POST /api/trading/modes/downgrade (mode downgrade)
 * - Authentication failures across all routes
 * - Error handling across all routes
 */

import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

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

jest.mock("@/lib/trading/modes/operating-mode-manager", () => ({
  createOperatingModeManager: jest.fn(),
}));

import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

import { GET as getStatus } from "../route";
import { POST as postGraduate } from "../graduate/route";
import { GET as getProgress } from "../progress/route";
import { GET as getPermissions } from "../permissions/route";
import { GET as getCircuitBreakers } from "../circuit-breakers/route";
import { POST as postDowngrade } from "../downgrade/route";

// ============================================================================
// TEST DATA
// ============================================================================

const mockUser = { id: "user-123", email: "test@example.com" };

const mockModeStatus = {
  currentMode: "watch",
  modeStartDate: "2026-01-01T00:00:00.000Z",
  graduationProgress: {
    currentMode: "watch",
    nextMode: "guided",
    criteria: {
      paperTrades: { current: 10, required: 30, met: false },
      daysActive: { current: 5, required: 30, met: false },
      profitable: { current: false, required: true, met: false },
    },
    allCriteriaMet: false,
    summary: "3 criteria remaining: paperTrades, daysActive, profitable.",
  },
  nextModeAvailable: false,
  isActive: true,
};

const mockGraduationProgress = {
  currentMode: "watch",
  nextMode: "guided",
  criteria: {
    paperTrades: { current: 35, required: 30, met: true },
    daysActive: { current: 31, required: 30, met: true },
    profitable: { current: true, required: true, met: true },
  },
  allCriteriaMet: true,
  summary: "All criteria met for graduation to guided mode.",
};

const mockTransition = {
  fromMode: "watch",
  toMode: "guided",
  direction: "upgrade",
  reason: "Graduated from watch to guided",
  initiatedBy: "user",
  metricsSnapshot: {},
  timestamp: "2026-02-01T00:00:00.000Z",
};

const mockPermissions = {
  mode: "watch",
  canViewSignals: true,
  canPaperTrade: true,
  canPlaceLiveOrders: false,
  requiresConfirmation: false,
  canAutoExecute: false,
};

const mockCircuitBreakerEvents = [
  {
    id: "cb-001",
    userId: "user-123",
    type: "daily_loss",
    severity: "warning",
    triggerValue: 3.5,
    thresholdValue: 2.0,
    actionTaken: "Halted trading",
    details: {},
    resolved: false,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: "2026-02-01T12:00:00.000Z",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown },
): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

function setupAuth(authenticated: boolean) {
  if (authenticated) {
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  } else {
    mockValidateFromHeaders.mockResolvedValue({
      valid: false,
      user: null,
      error: "Invalid token",
    });
  }
}

// withAuth-wrapped handlers always receive a request argument.
const modesRequest = () =>
  createMockRequest("http://localhost:3000/api/trading/modes");

function createMockManager(overrides: Record<string, jest.Mock> = {}) {
  const manager = {
    getModeStatus: jest.fn(),
    getGraduationProgress: jest.fn(),
    canGraduate: jest.fn(),
    graduate: jest.fn(),
    downgrade: jest.fn(),
    getModePermissions: jest.fn(),
    getCircuitBreakerHistory: jest.fn(),
    ...overrides,
  };
  (createOperatingModeManager as jest.Mock).mockReturnValue(manager);
  return manager;
}

// ============================================================================
// TESTS
// ============================================================================

describe("Trading Modes API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
  });

  // --------------------------------------------------------------------------
  // Authentication Tests (shared across all routes)
  // --------------------------------------------------------------------------

  describe("Authentication", () => {
    it("GET /modes returns 401 when not authenticated", async () => {
      setupAuth(false);
      const response = await getStatus(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      // withAuth guard 401 body is { error: "Unauthorized" } (no success field)
      expect(data.error).toBe("Unauthorized");
    });

    it("POST /modes/graduate returns 401 when not authenticated", async () => {
      setupAuth(false);
      const response = await postGraduate(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      // withAuth guard 401 body is { error: "Unauthorized" } (no success field)
      expect(data.error).toBe("Unauthorized");
    });

    it("GET /modes/progress returns 401 when not authenticated", async () => {
      setupAuth(false);
      const response = await getProgress(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      // withAuth guard 401 body is { error: "Unauthorized" } (no success field)
      expect(data.error).toBe("Unauthorized");
    });

    it("GET /modes/permissions returns 401 when not authenticated", async () => {
      setupAuth(false);
      const response = await getPermissions(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      // withAuth guard 401 body is { error: "Unauthorized" } (no success field)
      expect(data.error).toBe("Unauthorized");
    });

    it("GET /modes/circuit-breakers returns 401 when not authenticated", async () => {
      setupAuth(false);
      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/circuit-breakers",
      );
      const response = await getCircuitBreakers(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      // withAuth guard 401 body is { error: "Unauthorized" } (no success field)
      expect(data.error).toBe("Unauthorized");
    });

    it("POST /modes/downgrade returns 401 when not authenticated", async () => {
      setupAuth(false);
      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/downgrade",
        { method: "POST", body: { reason: "test" } },
      );
      const response = await postDowngrade(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      // withAuth guard 401 body is { error: "Unauthorized" } (no success field)
      expect(data.error).toBe("Unauthorized");
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/modes (Mode Status)
  // --------------------------------------------------------------------------

  describe("GET /api/trading/modes", () => {
    it("returns mode status successfully", async () => {
      const manager = createMockManager();
      manager.getModeStatus.mockResolvedValue({
        success: true,
        data: mockModeStatus,
      });

      const response = await getStatus(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockModeStatus);
      expect(data.timestamp).toBeDefined();
      expect(createOperatingModeManager).toHaveBeenCalledWith("user-123");
    });

    it("returns 500 when mode manager fails", async () => {
      const manager = createMockManager();
      manager.getModeStatus.mockResolvedValue({
        success: false,
        error: "Database connection failed",
      });

      const response = await getStatus(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Database connection failed");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      const manager = createMockManager();
      manager.getModeStatus.mockRejectedValue(new Error("Unexpected crash"));

      const response = await getStatus(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/trading/modes/graduate
  // --------------------------------------------------------------------------

  describe("POST /api/trading/modes/graduate", () => {
    it("graduates successfully when all criteria met", async () => {
      const manager = createMockManager();
      manager.canGraduate.mockResolvedValue({ success: true, data: true });
      manager.graduate.mockResolvedValue({
        success: true,
        data: mockTransition,
      });
      manager.getModeStatus.mockResolvedValue({
        success: true,
        data: { ...mockModeStatus, currentMode: "guided" },
      });

      const response = await postGraduate(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transition).toEqual(mockTransition);
      expect(data.data.newStatus).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it("returns 400 when not eligible for graduation", async () => {
      const manager = createMockManager();
      manager.canGraduate.mockResolvedValue({ success: true, data: false });
      manager.getGraduationProgress.mockResolvedValue({
        success: true,
        data: {
          ...mockGraduationProgress,
          allCriteriaMet: false,
          criteria: {
            paperTrades: { current: 5, required: 30, met: false },
          },
        },
      });

      const response = await postGraduate(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Not eligible for graduation");
      expect(data.details).toBeDefined();
    });

    it("returns 400 with no details when progress fetch also fails", async () => {
      const manager = createMockManager();
      manager.canGraduate.mockResolvedValue({ success: true, data: false });
      manager.getGraduationProgress.mockResolvedValue({
        success: false,
        error: "Failed to load",
      });

      const response = await postGraduate(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Not eligible for graduation");
      expect(data.details).toBeUndefined();
    });

    it("returns 500 when canGraduate check fails", async () => {
      const manager = createMockManager();
      manager.canGraduate.mockResolvedValue({
        success: false,
        error: "Account not found",
      });

      const response = await postGraduate(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Account not found");
    });

    it("returns 500 when graduate operation fails", async () => {
      const manager = createMockManager();
      manager.canGraduate.mockResolvedValue({ success: true, data: true });
      manager.graduate.mockResolvedValue({
        success: false,
        error: "Already at maximum mode (autonomous)",
      });

      const response = await postGraduate(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Already at maximum mode (autonomous)");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      const manager = createMockManager();
      manager.canGraduate.mockRejectedValue(new Error("Unexpected"));

      const response = await postGraduate(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/modes/progress
  // --------------------------------------------------------------------------

  describe("GET /api/trading/modes/progress", () => {
    it("returns graduation progress successfully", async () => {
      const manager = createMockManager();
      manager.getGraduationProgress.mockResolvedValue({
        success: true,
        data: mockGraduationProgress,
      });

      const response = await getProgress(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockGraduationProgress);
      expect(data.timestamp).toBeDefined();
    });

    it("returns 500 when progress fetch fails", async () => {
      const manager = createMockManager();
      manager.getGraduationProgress.mockResolvedValue({
        success: false,
        error: "Account not found",
      });

      const response = await getProgress(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Account not found");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      const manager = createMockManager();
      manager.getGraduationProgress.mockRejectedValue(
        new Error("DB timeout"),
      );

      const response = await getProgress(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/modes/permissions
  // --------------------------------------------------------------------------

  describe("GET /api/trading/modes/permissions", () => {
    it("returns permissions successfully", async () => {
      const manager = createMockManager();
      manager.getModePermissions.mockResolvedValue({
        success: true,
        data: mockPermissions,
      });

      const response = await getPermissions(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPermissions);
      expect(data.timestamp).toBeDefined();
    });

    it("returns 500 when permissions fetch fails", async () => {
      const manager = createMockManager();
      manager.getModePermissions.mockResolvedValue({
        success: false,
        error: "Account is inactive",
      });

      const response = await getPermissions(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Account is inactive");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      const manager = createMockManager();
      manager.getModePermissions.mockRejectedValue(new Error("Crash"));

      const response = await getPermissions(modesRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/modes/circuit-breakers
  // --------------------------------------------------------------------------

  describe("GET /api/trading/modes/circuit-breakers", () => {
    it("returns circuit breaker history with default limit", async () => {
      const manager = createMockManager();
      manager.getCircuitBreakerHistory.mockResolvedValue({
        success: true,
        data: mockCircuitBreakerEvents,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/circuit-breakers",
      );
      const response = await getCircuitBreakers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCircuitBreakerEvents);
      expect(data.timestamp).toBeDefined();
      expect(manager.getCircuitBreakerHistory).toHaveBeenCalledWith(50);
    });

    it("returns circuit breaker history with custom limit", async () => {
      const manager = createMockManager();
      manager.getCircuitBreakerHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/circuit-breakers?limit=10",
      );
      const response = await getCircuitBreakers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(manager.getCircuitBreakerHistory).toHaveBeenCalledWith(10);
    });

    it("returns 400 for invalid limit parameter", async () => {
      createMockManager();

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/circuit-breakers?limit=abc",
      );
      const response = await getCircuitBreakers(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid limit parameter");
    });

    it("returns 400 for limit exceeding maximum", async () => {
      createMockManager();

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/circuit-breakers?limit=1000",
      );
      const response = await getCircuitBreakers(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid limit parameter");
    });

    it("returns 400 for limit of zero", async () => {
      createMockManager();

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/circuit-breakers?limit=0",
      );
      const response = await getCircuitBreakers(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("returns 500 when circuit breaker fetch fails", async () => {
      const manager = createMockManager();
      manager.getCircuitBreakerHistory.mockResolvedValue({
        success: false,
        error: "Failed to load circuit breaker history",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/circuit-breakers",
      );
      const response = await getCircuitBreakers(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to load circuit breaker history");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      const manager = createMockManager();
      manager.getCircuitBreakerHistory.mockRejectedValue(
        new Error("Network failure"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/circuit-breakers",
      );
      const response = await getCircuitBreakers(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/trading/modes/downgrade
  // --------------------------------------------------------------------------

  describe("POST /api/trading/modes/downgrade", () => {
    it("downgrades successfully with valid reason", async () => {
      const manager = createMockManager();
      const downgradeTransition = {
        fromMode: "guided",
        toMode: "watch",
        direction: "downgrade",
        reason: "Risk management concern",
        initiatedBy: "user",
        metricsSnapshot: {},
        timestamp: "2026-02-01T00:00:00.000Z",
      };
      manager.downgrade.mockResolvedValue({
        success: true,
        data: downgradeTransition,
      });
      manager.getModeStatus.mockResolvedValue({
        success: true,
        data: { ...mockModeStatus, currentMode: "watch" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/downgrade",
        { method: "POST", body: { reason: "Risk management concern" } },
      );
      const response = await postDowngrade(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transition).toEqual(downgradeTransition);
      expect(data.data.newStatus).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(manager.downgrade).toHaveBeenCalledWith(
        "Risk management concern",
        "user",
      );
    });

    it("returns 400 when reason is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/downgrade",
        { method: "POST", body: {} },
      );
      const response = await postDowngrade(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Reason is required for downgrade");
    });

    it("returns 400 when reason is empty string", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/downgrade",
        { method: "POST", body: { reason: "   " } },
      );
      const response = await postDowngrade(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Reason is required for downgrade");
    });

    it("returns 400 when reason is not a string", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/downgrade",
        { method: "POST", body: { reason: 42 } },
      );
      const response = await postDowngrade(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Reason is required for downgrade");
    });

    it("returns 400 when request body is invalid JSON", async () => {
      const request = {
        url: "http://localhost:3000/api/trading/modes/downgrade",
        method: "POST",
        json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
        headers: new Headers(),
        nextUrl: new URL("http://localhost:3000/api/trading/modes/downgrade"),
      } as unknown as NextRequest;

      const response = await postDowngrade(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid request body");
    });

    it("returns 500 when downgrade operation fails", async () => {
      const manager = createMockManager();
      manager.downgrade.mockResolvedValue({
        success: false,
        error: "Already at minimum mode (watch)",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/downgrade",
        { method: "POST", body: { reason: "Testing" } },
      );
      const response = await postDowngrade(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Already at minimum mode (watch)");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      const manager = createMockManager();
      manager.downgrade.mockRejectedValue(new Error("Crash"));

      const request = createMockRequest(
        "http://localhost:3000/api/trading/modes/downgrade",
        { method: "POST", body: { reason: "Testing" } },
      );
      const response = await postDowngrade(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });
  });

  // --------------------------------------------------------------------------
  // Factory Function Integration
  // --------------------------------------------------------------------------

  describe("Factory function integration", () => {
    it("creates mode manager with authenticated user ID", async () => {
      const manager = createMockManager();
      manager.getModeStatus.mockResolvedValue({
        success: true,
        data: mockModeStatus,
      });

      await getStatus(modesRequest());

      expect(createOperatingModeManager).toHaveBeenCalledWith("user-123");
    });
  });
});
