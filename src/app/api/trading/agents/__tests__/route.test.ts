/**
 * Tests for Trading Agents API Routes
 *
 * Coverage:
 * - GET /api/trading/agents (retrieve agent logs)
 * - POST /api/trading/agents (execute agent)
 * - Authentication failures
 * - Input validation (agentType, symbol, currentPrice)
 * - Agent execution success/failure
 * - Error handling
 */

import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/trading/agents", () => ({
  createSentimentAgent: jest.fn(),
  createRegimeConfirmationAgent: jest.fn(),
  createEarningsAgent: jest.fn(),
  createSignalExplainerAgent: jest.fn(),
  createRiskNarrativeAgent: jest.fn(),
  createConsensusArbiterAgent: jest.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  createSentimentAgent,
  createRegimeConfirmationAgent,
  createEarningsAgent,
  createSignalExplainerAgent,
  createRiskNarrativeAgent,
  createConsensusArbiterAgent,
} from "@/lib/trading/agents";

import { GET, POST } from "../route";

// Module-level mock state
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();
const mockExecute = jest.fn();

// ============================================================================
// TEST DATA
// ============================================================================

const mockUser = { id: "user-123", email: "test@example.com" };

const mockAgentLog = {
  id: "log-001",
  user_id: "user-123",
  agent_type: "sentiment",
  symbol: "AAPL",
  decision: { bias: "bullish", confidence: 0.85 },
  metrics: { latencyMs: 1200, tokensUsed: 450 },
  created_at: "2026-02-25T12:00:00.000Z",
};

const mockAgentResult = {
  success: true,
  decision: {
    agentType: "sentiment",
    bias: "bullish",
    confidence: 0.85,
    confidenceLevel: "high",
    reasoning: "Strong positive sentiment across social media",
    timestamp: "2026-02-25T12:00:00.000Z",
    sentimentScore: 0.72,
    sources: [{ name: "Twitter", sentiment: 0.8, weight: 0.4 }],
  },
  metrics: {
    agentType: "sentiment",
    latencyMs: 1200,
    tokensUsed: 450,
    retries: 0,
    success: true,
    model: "gpt-4o-mini",
    provider: "aiml",
  },
  error: undefined,
};

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
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  } else {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    });
  }
  (createClient as jest.Mock).mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  });
}

function setupAgentFactories() {
  const factories = [
    createSentimentAgent,
    createRegimeConfirmationAgent,
    createEarningsAgent,
    createSignalExplainerAgent,
    createRiskNarrativeAgent,
    createConsensusArbiterAgent,
  ];
  for (const factory of factories) {
    (factory as jest.Mock).mockReturnValue({ execute: mockExecute });
  }
}

function setupSupabaseQuery(data: unknown[] | null, error: unknown = null) {
  const finalResult = { data, error };
  // Supabase query builder returns itself from every method — mock the same behavior.
  // The object is also thenable so `await query` resolves to the final result.
  const chainable: Record<string, unknown> = {};
  chainable.from = mockFrom;
  chainable.select = mockSelect;
  chainable.eq = mockEq;
  chainable.order = mockOrder;
  chainable.range = mockRange;
  chainable.then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(finalResult).then(resolve, reject);

  mockFrom.mockReturnValue(chainable);
  mockSelect.mockReturnValue(chainable);
  mockEq.mockReturnValue(chainable);
  mockOrder.mockReturnValue(chainable);
  mockRange.mockReturnValue(chainable);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Trading Agents API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
    setupAgentFactories();
  });

  // --------------------------------------------------------------------------
  // Authentication Tests
  // --------------------------------------------------------------------------

  describe("Authentication", () => {
    it("GET returns 401 when not authenticated", async () => {
      setupAuth(false);
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("POST returns 401 when not authenticated", async () => {
      setupAuth(false);
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "sentiment",
            symbol: "AAPL",
            currentPrice: 150,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/agents (Retrieve Agent Logs)
  // --------------------------------------------------------------------------

  describe("GET /api/trading/agents", () => {
    it("returns agent logs with default pagination", async () => {
      setupSupabaseQuery([mockAgentLog]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.logs).toEqual([mockAgentLog]);
      expect(data.data.count).toBe(1);
      expect(data.data.offset).toBe(0);
      expect(data.data.limit).toBe(20);
      expect(data.timestamp).toBeDefined();
    });

    it("filters by agentType", async () => {
      setupSupabaseQuery([mockAgentLog]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents?agentType=sentiment",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEq).toHaveBeenCalledWith("agent_type", "sentiment");
    });

    it("filters by symbol", async () => {
      setupSupabaseQuery([mockAgentLog]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents?symbol=AAPL",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEq).toHaveBeenCalledWith("symbol", "AAPL");
    });

    it("applies custom pagination", async () => {
      setupSupabaseQuery([]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents?limit=5&offset=10",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.offset).toBe(10);
      expect(data.data.limit).toBe(5);
      expect(mockRange).toHaveBeenCalledWith(10, 14);
    });

    it("returns empty array when no logs found", async () => {
      setupSupabaseQuery([]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.logs).toEqual([]);
      expect(data.data.count).toBe(0);
    });

    it("returns 500 when database query fails", async () => {
      setupSupabaseQuery(null, { message: "DB error" });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to retrieve agent logs");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Unexpected crash");
      });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to retrieve agent logs");
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/trading/agents (Execute Agent)
  // --------------------------------------------------------------------------

  describe("POST /api/trading/agents", () => {
    it("executes sentiment agent successfully", async () => {
      mockExecute.mockResolvedValue(mockAgentResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "sentiment",
            symbol: "AAPL",
            currentPrice: 150.25,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.decision).toEqual(mockAgentResult.decision);
      expect(data.data.metrics).toEqual(mockAgentResult.metrics);
      expect(data.data.error).toBeNull();
      expect(data.timestamp).toBeDefined();
      expect(createSentimentAgent).toHaveBeenCalled();
    });

    it("executes regime_confirmation agent", async () => {
      mockExecute.mockResolvedValue(mockAgentResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "regime_confirmation",
            symbol: "TSLA",
            currentPrice: 200,
          },
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(createRegimeConfirmationAgent).toHaveBeenCalled();
    });

    it("executes earnings_analysis agent", async () => {
      mockExecute.mockResolvedValue(mockAgentResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "earnings_analysis",
            symbol: "MSFT",
            currentPrice: 400,
          },
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(createEarningsAgent).toHaveBeenCalled();
    });

    it("executes signal_explainer agent", async () => {
      mockExecute.mockResolvedValue(mockAgentResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "signal_explainer",
            symbol: "NVDA",
            currentPrice: 850,
          },
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(createSignalExplainerAgent).toHaveBeenCalled();
    });

    it("executes risk_narrative agent", async () => {
      mockExecute.mockResolvedValue(mockAgentResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "risk_narrative",
            symbol: "META",
            currentPrice: 500,
          },
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(createRiskNarrativeAgent).toHaveBeenCalled();
    });

    it("executes consensus_arbiter agent", async () => {
      mockExecute.mockResolvedValue(mockAgentResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "consensus_arbiter",
            symbol: "GOOG",
            currentPrice: 170,
          },
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(createConsensusArbiterAgent).toHaveBeenCalled();
    });

    it("passes all optional context fields to agent", async () => {
      mockExecute.mockResolvedValue(mockAgentResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "sentiment",
            symbol: "AAPL",
            currentPrice: 150,
            operatingMode: "guided",
            signalId: "sig-001",
            priceChange24h: 2.5,
            volume24h: 1000000,
            signalType: "buy",
            signalStrength: 75,
            regimeType: "trending",
            additionalContext: { customData: true },
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "AAPL",
          userId: "user-123",
          operatingMode: "guided",
          currentPrice: 150,
          signalId: "sig-001",
          priceChange24h: 2.5,
          volume24h: 1000000,
          signalType: "buy",
          signalStrength: 75,
          regimeType: "trending",
          additionalContext: { customData: true },
        }),
      );
    });

    it("defaults operatingMode to watch", async () => {
      mockExecute.mockResolvedValue(mockAgentResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "sentiment",
            symbol: "AAPL",
            currentPrice: 150,
          },
        },
      );
      await POST(request);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          operatingMode: "watch",
        }),
      );
    });

    it("returns agent error when execution fails", async () => {
      mockExecute.mockResolvedValue({
        success: false,
        decision: undefined,
        metrics: { agentType: "sentiment", latencyMs: 500, success: false },
        error: "LLM timeout",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "sentiment",
            symbol: "AAPL",
            currentPrice: 150,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.data.decision).toBeNull();
      expect(data.data.error).toBe("LLM timeout");
    });

    // Validation errors

    it("returns 400 for missing agentType", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: { symbol: "AAPL", currentPrice: 150 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid agentType");
    });

    it("returns 400 for invalid agentType", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "nonexistent_agent",
            symbol: "AAPL",
            currentPrice: 150,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid agentType");
    });

    it("returns 400 for missing symbol", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: { agentType: "sentiment", currentPrice: 150 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("symbol is required");
    });

    it("returns 400 for missing currentPrice", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: { agentType: "sentiment", symbol: "AAPL" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("currentPrice must be a positive number");
    });

    it("returns 400 for negative currentPrice", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: { agentType: "sentiment", symbol: "AAPL", currentPrice: -10 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("currentPrice must be a positive number");
    });

    it("returns 400 for zero currentPrice", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: { agentType: "sentiment", symbol: "AAPL", currentPrice: 0 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("currentPrice must be a positive number");
    });

    it("returns 400 for non-numeric currentPrice", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/agents",
        {
          method: "POST",
          body: {
            agentType: "sentiment",
            symbol: "AAPL",
            currentPrice: "abc",
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("currentPrice must be a positive number");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      // Force the request.json() to throw
      const request = {
        url: "http://localhost:3000/api/trading/agents",
        method: "POST",
        json: jest.fn().mockRejectedValue(new Error("JSON parse error")),
        headers: new Headers(),
        nextUrl: new URL("http://localhost:3000/api/trading/agents"),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to execute agent");
    });
  });
});
