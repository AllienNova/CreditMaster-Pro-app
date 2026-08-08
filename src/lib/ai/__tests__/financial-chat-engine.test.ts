/**
 * Financial Chat Engine Tests
 *
 * Phase 6.1.5: Comprehensive test suite for FinancialChatEngine
 * Tests session management, intent detection, response generation, and action execution
 */

// Use global jest instead of @jest/globals to avoid type issues with mocked functions
import { FinancialChatEngine } from "../financial-chat-engine";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import {
  ChatContext,
  ChatIntent,
  MessageRole,
  IntentType,
  ActionType,
} from "../types/financial-chat.types";

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
  rpc: jest.fn(),
};

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => mockSupabase),
}));

// Mock ModelRouter - must be defined before the mock
const mockComplete = jest.fn();

jest.mock("@/lib/model-router", () => ({
  getModelRouter: () => ({
    complete: mockComplete,
    getModel: jest.fn().mockReturnValue("anthropic/claude-financial-advice"),
  }),
  TaskType: {
    FINANCIAL_ADVICE: "FINANCIAL_ADVICE",
  },
}));

// ============================================================================
// TEST DATA
// ============================================================================

const mockUserId = "user-123";
const mockSessionId = "session-456";
const mockMessageId = "message-789";

const mockSessionDB = {
  id: mockSessionId,
  user_id: mockUserId,
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:30:00Z",
  title: "Investment Discussion",
  metadata: { tags: ["investing"] },
  message_count: 5,
  last_message_at: "2024-01-15T10:30:00Z",
  archived: false,
};

const mockMessageDB = {
  id: mockMessageId,
  session_id: mockSessionId,
  role: "user",
  content: "How is my portfolio performing?",
  timestamp: "2024-01-15T10:30:00Z",
  metadata: {},
  intent_type: "portfolio_analysis",
  intent_confidence: 0.95,
};

const mockIntentResponse = `\`\`\`json
{
  "type": "portfolio_analysis",
  "confidence": 0.95,
  "entities": [],
  "action": "view_portfolio",
  "parameters": {}
}
\`\`\``;

const mockAIResponse =
  "Your portfolio is performing well with a total value of $50,000.";

/**
 * Builds a Supabase query-builder-like mock that is thenable at every step —
 * matches postgrest-js's real contract, where resolution comes from the
 * builder's own .then(), not from a specific terminal call like .single().
 * One shape correctly models every call pattern in financial-chat-engine.ts
 * (some queries end in .single(), some end in .in()/.order(), some are
 * awaited straight after .eq()) without special-casing "the last method."
 */
function makeThenableChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
    then: (
      onResolve: (value: typeof result) => unknown,
      onReject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onResolve, onReject),
  };
  return chain;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("FinancialChatEngine", () => {
  let chatEngine: FinancialChatEngine;

  beforeEach(() => {
    // resetMocks:true wipes jest.fn(() => ...) implementations — re-apply.
    (getServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase);
    // Don't use jest.clearAllMocks() as it clears mock implementations
    // Clear individual mocks instead
    (mockSupabase.from as jest.Mock).mockClear();
    (mockSupabase.rpc as jest.Mock).mockClear();
    (mockComplete as jest.Mock).mockClear();

    // Setup default mock implementations
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSessionDB, error: null }),
    };

    (mockSupabase.from as jest.Mock).mockReturnValue(mockChain);
    (mockSupabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });
    // Mock complete to return OpenAI-style response format
    (mockComplete as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: mockAIResponse } }],
    });

    chatEngine = new FinancialChatEngine();
  });

  afterEach(() => {
    // Don't clear all mocks in afterEach
  });

  // ==========================================================================
  // SESSION MANAGEMENT TESTS
  // ==========================================================================

  describe("Session Management", () => {
    it("should create a new chat session", async () => {
      const session = await chatEngine.createSession(
        mockUserId,
        "Test Session",
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe(mockUserId);
      expect(mockSupabase.from).toHaveBeenCalledWith("chat_sessions");
    });

    it("should create a session without title", async () => {
      const session = await chatEngine.createSession(mockUserId);

      expect(session).toBeDefined();
      expect(session.userId).toBe(mockUserId);
    });

    it("should get user sessions", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValue({ data: [mockSessionDB], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const sessions = await chatEngine.getUserSessions(mockUserId, 20);

      expect(sessions).toBeDefined();
      expect(Array.isArray(sessions)).toBe(true);
    });

    it("should delete session", async () => {
      await chatEngine.deleteSession(mockSessionId);

      expect(mockSupabase.from).toHaveBeenCalledWith("chat_sessions");
    });

    it("should get session history", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValue({ data: [mockMessageDB], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const messages = await chatEngine.getSessionHistory(mockSessionId, 50);

      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);
    });
  });

  // ==========================================================================
  // INTENT DETECTION TESTS
  // ==========================================================================

  describe("Intent Detection", () => {
    it("should detect portfolio analysis intent", async () => {
      mockComplete.mockResolvedValue({
        choices: [{ message: { content: mockIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        "How is my portfolio performing?",
        context,
      );

      expect(intent).toBeDefined();
      expect(intent.type).toBe(IntentType.PORTFOLIO_ANALYSIS);
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it("should detect investment advice intent", async () => {
      const investmentIntentResponse = `\`\`\`json
{
  "type": "investment_advice",
  "confidence": 0.92,
  "entities": [{"type": "symbol", "value": "AAPL"}],
  "action": "analyze_investment",
  "parameters": {"symbol": "AAPL"}
}
\`\`\``;

      mockComplete.mockResolvedValue({
        choices: [{ message: { content: investmentIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        "Should I buy AAPL?",
        context,
      );

      expect(intent.type).toBe(IntentType.INVESTMENT_ADVICE);
      expect(intent.entities).toBeDefined();
      expect(intent.action).toBe(ActionType.ANALYZE_INVESTMENT);
    });

    it("should detect budget planning intent", async () => {
      const budgetIntentResponse = `\`\`\`json
{
  "type": "budget_planning",
  "confidence": 0.88,
  "entities": [],
  "action": "create_budget",
  "parameters": {}
}
\`\`\``;

      mockComplete.mockResolvedValue({
        choices: [{ message: { content: budgetIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        "Help me create a budget",
        context,
      );

      expect(intent.type).toBe(IntentType.BUDGET_PLANNING);
      expect(intent.action).toBe(ActionType.CREATE_BUDGET);
    });

    it("should detect debt strategy intent", async () => {
      const debtIntentResponse = `\`\`\`json
{
  "type": "debt_strategy",
  "confidence": 0.90,
  "entities": [],
  "action": "optimize_debt",
  "parameters": {}
}
\`\`\``;

      mockComplete.mockResolvedValue({
        choices: [{ message: { content: debtIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        "How can I pay off my debt faster?",
        context,
      );

      expect(intent.type).toBe(IntentType.DEBT_STRATEGY);
      expect(intent.action).toBe(ActionType.OPTIMIZE_DEBT);
    });

    it("should handle malformed AI response gracefully", async () => {
      mockComplete.mockResolvedValue({
        choices: [{ message: { content: "Invalid JSON response" } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent("Test message", context);

      expect(intent).toBeDefined();
      expect(intent.type).toBe(IntentType.QUESTION);
      expect(intent.confidence).toBeLessThanOrEqual(0.5);
    });

    it("should extract entities from user message", async () => {
      const entityIntentResponse = `\`\`\`json
{
  "type": "investment_advice",
  "confidence": 0.93,
  "entities": [
    {"type": "symbol", "value": "TSLA"},
    {"type": "amount", "value": "5000"}
  ],
  "action": "analyze_investment",
  "parameters": {"symbol": "TSLA", "amount": 5000}
}
\`\`\``;

      mockComplete.mockResolvedValue({
        choices: [{ message: { content: entityIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        "Should I invest $5000 in TSLA?",
        context,
      );

      expect(intent.entities).toBeDefined();
      expect(intent.entities?.length).toBe(2);
      expect(intent.entities?.[0].type).toBe("symbol");
      expect(intent.entities?.[0].value).toBe("TSLA");
    });
  });

  // ==========================================================================
  // RESPONSE GENERATION TESTS
  // ==========================================================================

  describe("Response Generation", () => {
    it("should generate response for portfolio analysis", async () => {
      const intent: ChatIntent = {
        type: IntentType.PORTFOLIO_ANALYSIS,
        confidence: 0.95,
        action: ActionType.VIEW_PORTFOLIO,
      };

      const context = { userId: mockUserId };
      const response = await chatEngine.generateResponse(intent, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    });

    it("should generate contextual response with user data", async () => {
      const intent: ChatIntent = {
        type: IntentType.INVESTMENT_ADVICE,
        confidence: 0.92,
      };

      const context: ChatContext = {
        userId: mockUserId,
        userPreferences: {
          riskTolerance: "moderate",
          investmentHorizon: "medium",
          preferredAssets: ["stocks", "bonds"],
          communicationStyle: "detailed",
          notificationPreferences: {
            marketAlerts: true,
            portfolioUpdates: true,
            educationalContent: false,
          },
        },
      };

      const response = await chatEngine.generateResponse(intent, context);

      expect(response).toBeDefined();
      expect(mockComplete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ACTION EXECUTION TESTS
  // ==========================================================================

  describe("Action Execution", () => {
    it("should execute VIEW_PORTFOLIO action", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.VIEW_PORTFOLIO,
        {},
        context,
      );

      expect(result).toBeDefined();
    });

    it("should execute ANALYZE_INVESTMENT action", async () => {
      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.ANALYZE_INVESTMENT,
        { symbol: "AAPL" },
        context,
      );

      expect(result).toBeDefined();
      expect(result.symbol).toBe("AAPL");
    });

    it("should execute GET_TRADING_SIGNAL action", async () => {
      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.GET_TRADING_SIGNAL,
        { symbol: "TSLA" },
        context,
      );

      expect(result).toBeDefined();
      expect(result.symbol).toBe("TSLA");
    });

    it("should execute CREATE_BUDGET action", async () => {
      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.CREATE_BUDGET,
        { monthlyIncome: 5000 },
        context,
      );

      expect(result).toBeDefined();
      expect(result.created).toBe(true);
    });

    it("should execute OPTIMIZE_DEBT action", async () => {
      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.OPTIMIZE_DEBT,
        {},
        context,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
    });

    it("should execute TRACK_GOALS action", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.TRACK_GOALS,
        {},
        context,
      );

      expect(result).toBeDefined();
      expect(result.goals).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe("Error Handling", () => {
    it("should handle database errors when creating session", async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      await expect(chatEngine.createSession(mockUserId)).rejects.toThrow();
    });

    it("should handle session not found error", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Session not found" },
        }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      await expect(
        chatEngine.getSessionHistory("invalid-session-id", 50),
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe("Integration Tests", () => {
    it("should complete full message flow", async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockSessionDB, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);
      mockComplete
        .mockResolvedValueOnce({
          choices: [{ message: { content: mockIntentResponse } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: mockAIResponse } }],
        });

      const response = await chatEngine.sendMessage(
        mockSessionId,
        "How is my portfolio?",
        false,
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.intent).toBeDefined();
      expect(response.suggestedActions).toBeDefined();
      expect(response.metadata).toBeDefined();
    });
  });

  // ==========================================================================
  // FABRICATION GUARDS — investment holdings (Wave 7 remediation)
  //
  // Root cause: these methods queried a table named "portfolio_holdings",
  // which does not exist. Because postgrest-js resolves {data: null, error}
  // rather than throwing, and the pre-fix code never checked `error`, a
  // relation-does-not-exist failure was indistinguishable from "no position"
  // — producing a confident {recommendation: "HOLD", confidence: 0.5,
  // targetPrice: 0} for any symbol, for any user, always.
  // ==========================================================================

  describe("Investment holdings — no fabricated recommendations", () => {
    describe("ANALYZE_INVESTMENT", () => {
      it("does not fabricate a confident HOLD/0-target recommendation when the holdings query fails", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({
            data: null,
            error: {
              code: "42P01",
              message: 'relation "investment_holdings" does not exist',
            },
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.ANALYZE_INVESTMENT,
          { symbol: "AAPL" },
          { userId: mockUserId },
        );

        expect(result.recommendation).not.toBe("HOLD");
        expect(result.confidence).toBe(0);
        expect(result.targetPrice).toBeNull();
        expect(result.analysis).toMatch(/unable to analyze/i);
      });

      it("treats a genuine 'no holding' result (PGRST116) as no-data, not a system failure", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({
            data: null,
            error: { code: "PGRST116", message: "no rows returned" },
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.ANALYZE_INVESTMENT,
          { symbol: "ZZZZ" },
          { userId: mockUserId },
        );

        expect(result.confidence).toBe(0);
        expect(result.targetPrice).toBeNull();
        expect(result.analysis).toMatch(/no position data available/i);
      });

      it("computes a recommendation from real investment_holdings columns when a holding exists", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({
            data: {
              current_value: 1500,
              current_price: 150,
              quantity: 10,
              gain_loss: 300,
              gain_loss_percent: 25,
            },
            error: null,
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.ANALYZE_INVESTMENT,
          { symbol: "AAPL" },
          { userId: mockUserId },
        );

        expect(result.recommendation).toBe("HOLD");
        expect(result.confidence).toBe(0.7);
        expect(result.currentPrice).toBe(150);
        expect(result.returnPct).toBe(25);
      });
    });

    describe("GET_TRADING_SIGNAL", () => {
      it("does not fabricate a confident HOLD signal with fake strength when the holdings query fails", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({
            data: null,
            error: {
              code: "42P01",
              message: 'relation "investment_holdings" does not exist',
            },
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.GET_TRADING_SIGNAL,
          { symbol: "TSLA" },
          { userId: mockUserId },
        );

        expect(result.strength).toBe(0);
        expect(result.reason).toMatch(/insufficient data/i);
      });

      it("treats a genuine 'no position' result as no-data, not a system failure", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({
            data: null,
            error: { code: "PGRST116", message: "no rows returned" },
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.GET_TRADING_SIGNAL,
          { symbol: "ZZZZ" },
          { userId: mockUserId },
        );

        expect(result.strength).toBe(0);
        expect(result.reason).toMatch(/no current position/i);
      });

      it("computes a signal from the real gain_loss_percent column when a holding exists", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({ data: { gain_loss_percent: -20 }, error: null }),
        );

        const result = await chatEngine.executeAction(
          ActionType.GET_TRADING_SIGNAL,
          { symbol: "AAPL" },
          { userId: mockUserId },
        );

        expect(result.signal).toBe("SELL");
        expect(result.strength).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // FABRICATION GUARDS — debt & risk (Wave 7 remediation)
  //
  // Root cause: optimizeDebt/assessRisk/generateReport("networth") queried a
  // table named "financial_accounts", which does not exist under any name.
  // The pre-fix code never checked `error` either, so a failed query and a
  // genuinely-empty debt list were indistinguishable — every user with debt
  // was told "No debt accounts found. Great job being debt-free!" and every
  // risk/net-worth figure silently treated missing debt as zero debt.
  // ==========================================================================

  describe("Debt & risk — no fabricated debt-free or risk claims", () => {
    describe("OPTIMIZE_DEBT", () => {
      it("does not congratulate the user on being debt-free when the debt query fails", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({
            data: null,
            error: {
              code: "42P01",
              message: 'relation "debt_accounts" does not exist',
            },
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.OPTIMIZE_DEBT,
          {},
          { userId: mockUserId },
        );

        expect(result.message).not.toMatch(/debt-free/i);
      });

      it("still reports debt-free when the user genuinely has zero debt accounts", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({ data: [], error: null }),
        );

        const result = await chatEngine.executeAction(
          ActionType.OPTIMIZE_DEBT,
          {},
          { userId: mockUserId },
        );

        expect(result.message).toMatch(/debt-free/i);
      });

      it("computes real interest rates from debt_accounts.interest_rate (not the nonexistent apr column)", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({
            data: [
              {
                id: "d1",
                user_id: mockUserId,
                name: "Card",
                type: "credit_card",
                balance: 5000,
                interest_rate: 24,
                minimum_payment: 150,
                is_active: true,
                created_at: "2026-01-01",
                updated_at: "2026-01-01",
              },
              {
                id: "d2",
                user_id: mockUserId,
                name: "Auto",
                type: "auto_loan",
                balance: 10000,
                interest_rate: 8,
                minimum_payment: 200,
                is_active: true,
                created_at: "2026-01-01",
                updated_at: "2026-01-01",
              },
            ],
            error: null,
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.OPTIMIZE_DEBT,
          {},
          { userId: mockUserId },
        );

        expect(result.totalDebt).toBe(15000);
        expect(result.avgApr).toBe(16);
      });

      it("excludes inactive (paid-off/closed) debts from the current-debt calculation", async () => {
        mockSupabase.from.mockReturnValue(
          makeThenableChain({
            data: [
              {
                id: "d1",
                user_id: mockUserId,
                name: "Active card",
                type: "credit_card",
                balance: 5000,
                interest_rate: 20,
                minimum_payment: 100,
                is_active: true,
                created_at: "2026-01-01",
                updated_at: "2026-01-01",
              },
              {
                id: "d2",
                user_id: mockUserId,
                name: "Paid-off loan",
                type: "auto_loan",
                balance: 99999,
                interest_rate: 5,
                minimum_payment: 0,
                is_active: false,
                created_at: "2026-01-01",
                updated_at: "2026-01-01",
              },
            ],
            error: null,
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.OPTIMIZE_DEBT,
          {},
          { userId: mockUserId },
        );

        expect(result.totalDebt).toBe(5000);
        expect(result.accountCount).toBe(1);
      });
    });

    describe("ASSESS_RISK", () => {
      it("does not silently compute a risk score from null portfolio/debt data on a real query failure", async () => {
        mockSupabase.from.mockImplementation(() =>
          makeThenableChain({
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          }),
        );

        const result = await chatEngine.executeAction(
          ActionType.ASSESS_RISK,
          {},
          { userId: mockUserId },
        );

        expect(result.category).not.toBe("moderate");
        expect(result.riskScore).not.toBe(50);
      });

      it("does not silently treat a failed debt lookup as zero debt in risk assessment", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "investment_holdings") {
            return makeThenableChain({
              data: [{ current_value: 20000 }],
              error: null,
            });
          }
          return makeThenableChain({
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          });
        });

        const result = await chatEngine.executeAction(
          ActionType.ASSESS_RISK,
          {},
          { userId: mockUserId },
        );

        expect(result.category).not.toBe("moderate");
        expect(result.riskScore).not.toBe(50);
      });

      it("computes risk score from real investment_holdings + debt_accounts data when both succeed", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "investment_holdings") {
            return makeThenableChain({
              data: [{ current_value: 10000 }, { current_value: 5000 }],
              error: null,
            });
          }
          if (table === "debt_accounts") {
            return makeThenableChain({
              data: [
                {
                  id: "d1",
                  user_id: mockUserId,
                  name: "Card",
                  type: "credit_card",
                  balance: 3000,
                  interest_rate: 22,
                  minimum_payment: 50,
                  is_active: true,
                  created_at: "2026-01-01",
                  updated_at: "2026-01-01",
                },
              ],
              error: null,
            });
          }
          return makeThenableChain({ data: [], error: null });
        });

        const result = await chatEngine.executeAction(
          ActionType.ASSESS_RISK,
          {},
          { userId: mockUserId },
        );

        expect(result.factors.highInterestDebt).toBe(3000);
        expect(result.category).not.toBe("unavailable");
        expect(typeof result.riskScore).toBe("number");
      });
    });

    describe("GENERATE_REPORT (networth)", () => {
      it("does not silently zero out liabilities in the net worth report when debt data fails to load", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "investment_holdings") {
            return makeThenableChain({
              data: [{ current_value: 10000, asset_type: "stock", gain_loss: 0 }],
              error: null,
            });
          }
          return makeThenableChain({
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          });
        });

        const result = await chatEngine.executeAction(
          ActionType.GENERATE_REPORT,
          { type: "networth" },
          { userId: mockUserId },
        );

        expect(result.data.totalLiabilities).not.toBe(0);
        expect(result.data.netWorth).toBeNull();
      });

      it("computes net worth from real investment_holdings and debt_accounts data", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "investment_holdings") {
            return makeThenableChain({
              data: [{ current_value: 20000 }],
              error: null,
            });
          }
          if (table === "debt_accounts") {
            return makeThenableChain({
              data: [
                {
                  id: "d1",
                  user_id: mockUserId,
                  name: "Card",
                  type: "credit_card",
                  balance: 4000,
                  interest_rate: 10,
                  minimum_payment: 100,
                  is_active: true,
                  created_at: "2026-01-01",
                  updated_at: "2026-01-01",
                },
              ],
              error: null,
            });
          }
          return makeThenableChain({ data: [], error: null });
        });

        const result = await chatEngine.executeAction(
          ActionType.GENERATE_REPORT,
          { type: "networth" },
          { userId: mockUserId },
        );

        expect(result.data.totalAssets).toBe(20000);
        expect(result.data.totalLiabilities).toBe(4000);
        expect(result.data.netWorth).toBe(16000);
      });
    });
  });
});
