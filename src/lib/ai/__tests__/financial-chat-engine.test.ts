/**
 * Financial Chat Engine Tests
 *
 * Phase 6.1.5: Comprehensive test suite for FinancialChatEngine
 * Tests session management, intent detection, response generation, and action execution
 */

// Use global jest instead of @jest/globals to avoid type issues with mocked functions
import { FinancialChatEngine } from '../financial-chat-engine';
import {
  ChatContext,
  ChatIntent,
  MessageRole,
  IntentType,
  ActionType,
} from '../types/financial-chat.types';

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

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Mock AIML service - must be defined before the mock
const mockChat = jest.fn();
const mockAIML = {
  chat: mockChat,
};

jest.mock('@/lib/aiml-service', () => ({
  getAIMLService: () => ({
    chat: mockChat,
  }),
}));

// ============================================================================
// TEST DATA
// ============================================================================

const mockUserId = 'user-123';
const mockSessionId = 'session-456';
const mockMessageId = 'message-789';

const mockSessionDB = {
  id: mockSessionId,
  user_id: mockUserId,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  title: 'Investment Discussion',
  metadata: { tags: ['investing'] },
  message_count: 5,
  last_message_at: '2024-01-15T10:30:00Z',
  archived: false,
};

const mockMessageDB = {
  id: mockMessageId,
  session_id: mockSessionId,
  role: 'user',
  content: 'How is my portfolio performing?',
  timestamp: '2024-01-15T10:30:00Z',
  metadata: {},
  intent_type: 'portfolio_analysis',
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
  'Your portfolio is performing well with a total value of $50,000.';

// ============================================================================
// TEST SUITE
// ============================================================================

describe('FinancialChatEngine', () => {
  let chatEngine: FinancialChatEngine;

  beforeEach(() => {
    // Don't use jest.clearAllMocks() as it clears mock implementations
    // Clear individual mocks instead
    (mockSupabase.from as jest.Mock).mockClear();
    (mockSupabase.rpc as jest.Mock).mockClear();
    (mockChat as jest.Mock).mockClear();

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
    // Mock chat to return OpenAI-style response format
    (mockChat as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: mockAIResponse } }],
    });

    chatEngine = new FinancialChatEngine();

    // Inject the mock Supabase client into the engine instance
    (chatEngine as any).supabase = mockSupabase;
  });

  afterEach(() => {
    // Don't clear all mocks in afterEach
  });

  // ==========================================================================
  // SESSION MANAGEMENT TESTS
  // ==========================================================================

  describe('Session Management', () => {
    it('should create a new chat session', async () => {
      const session = await chatEngine.createSession(
        mockUserId,
        'Test Session'
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe(mockUserId);
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_sessions');
    });

    it('should create a session without title', async () => {
      const session = await chatEngine.createSession(mockUserId);

      expect(session).toBeDefined();
      expect(session.userId).toBe(mockUserId);
    });

    it('should get user sessions', async () => {
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

    it('should delete session', async () => {
      await chatEngine.deleteSession(mockSessionId);

      expect(mockSupabase.from).toHaveBeenCalledWith('chat_sessions');
    });

    it('should get session history', async () => {
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

  describe('Intent Detection', () => {
    it('should detect portfolio analysis intent', async () => {
      mockAIML.chat.mockResolvedValue({
        choices: [{ message: { content: mockIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        'How is my portfolio performing?',
        context
      );

      expect(intent).toBeDefined();
      expect(intent.type).toBe(IntentType.PORTFOLIO_ANALYSIS);
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it('should detect investment advice intent', async () => {
      const investmentIntentResponse = `\`\`\`json
{
  "type": "investment_advice",
  "confidence": 0.92,
  "entities": [{"type": "symbol", "value": "AAPL"}],
  "action": "analyze_investment",
  "parameters": {"symbol": "AAPL"}
}
\`\`\``;

      mockAIML.chat.mockResolvedValue({
        choices: [{ message: { content: investmentIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        'Should I buy AAPL?',
        context
      );

      expect(intent.type).toBe(IntentType.INVESTMENT_ADVICE);
      expect(intent.entities).toBeDefined();
      expect(intent.action).toBe(ActionType.ANALYZE_INVESTMENT);
    });

    it('should detect budget planning intent', async () => {
      const budgetIntentResponse = `\`\`\`json
{
  "type": "budget_planning",
  "confidence": 0.88,
  "entities": [],
  "action": "create_budget",
  "parameters": {}
}
\`\`\``;

      mockAIML.chat.mockResolvedValue({
        choices: [{ message: { content: budgetIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        'Help me create a budget',
        context
      );

      expect(intent.type).toBe(IntentType.BUDGET_PLANNING);
      expect(intent.action).toBe(ActionType.CREATE_BUDGET);
    });

    it('should detect debt strategy intent', async () => {
      const debtIntentResponse = `\`\`\`json
{
  "type": "debt_strategy",
  "confidence": 0.90,
  "entities": [],
  "action": "optimize_debt",
  "parameters": {}
}
\`\`\``;

      mockAIML.chat.mockResolvedValue({
        choices: [{ message: { content: debtIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        'How can I pay off my debt faster?',
        context
      );

      expect(intent.type).toBe(IntentType.DEBT_STRATEGY);
      expect(intent.action).toBe(ActionType.OPTIMIZE_DEBT);
    });

    it('should handle malformed AI response gracefully', async () => {
      mockAIML.chat.mockResolvedValue({
        choices: [{ message: { content: 'Invalid JSON response' } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent('Test message', context);

      expect(intent).toBeDefined();
      expect(intent.type).toBe(IntentType.QUESTION);
      expect(intent.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should extract entities from user message', async () => {
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

      mockAIML.chat.mockResolvedValue({
        choices: [{ message: { content: entityIntentResponse } }],
      });

      const context = { userId: mockUserId };
      const intent = await chatEngine.detectIntent(
        'Should I invest $5000 in TSLA?',
        context
      );

      expect(intent.entities).toBeDefined();
      expect(intent.entities?.length).toBe(2);
      expect(intent.entities?.[0].type).toBe('symbol');
      expect(intent.entities?.[0].value).toBe('TSLA');
    });
  });

  // ==========================================================================
  // RESPONSE GENERATION TESTS
  // ==========================================================================

  describe('Response Generation', () => {
    it('should generate response for portfolio analysis', async () => {
      const intent: ChatIntent = {
        type: IntentType.PORTFOLIO_ANALYSIS,
        confidence: 0.95,
        action: ActionType.VIEW_PORTFOLIO,
      };

      const context = { userId: mockUserId };
      const response = await chatEngine.generateResponse(intent, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should generate contextual response with user data', async () => {
      const intent: ChatIntent = {
        type: IntentType.INVESTMENT_ADVICE,
        confidence: 0.92,
      };

      const context: ChatContext = {
        userId: mockUserId,
        userPreferences: {
          riskTolerance: 'moderate',
          investmentHorizon: 'medium',
          preferredAssets: ['stocks', 'bonds'],
          communicationStyle: 'detailed',
          notificationPreferences: {
            marketAlerts: true,
            portfolioUpdates: true,
            educationalContent: false,
          },
        },
      };

      const response = await chatEngine.generateResponse(intent, context);

      expect(response).toBeDefined();
      expect(mockAIML.chat).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ACTION EXECUTION TESTS
  // ==========================================================================

  describe('Action Execution', () => {
    it('should execute VIEW_PORTFOLIO action', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.VIEW_PORTFOLIO,
        {},
        context
      );

      expect(result).toBeDefined();
    });

    it('should execute ANALYZE_INVESTMENT action', async () => {
      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.ANALYZE_INVESTMENT,
        { symbol: 'AAPL' },
        context
      );

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
    });

    it('should execute GET_TRADING_SIGNAL action', async () => {
      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.GET_TRADING_SIGNAL,
        { symbol: 'TSLA' },
        context
      );

      expect(result).toBeDefined();
      expect(result.symbol).toBe('TSLA');
    });

    it('should execute CREATE_BUDGET action', async () => {
      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.CREATE_BUDGET,
        { monthlyIncome: 5000 },
        context
      );

      expect(result).toBeDefined();
      expect(result.created).toBe(true);
    });

    it('should execute OPTIMIZE_DEBT action', async () => {
      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.OPTIMIZE_DEBT,
        {},
        context
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
    });

    it('should execute TRACK_GOALS action', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const context = { userId: mockUserId };
      const result = await chatEngine.executeAction(
        ActionType.TRACK_GOALS,
        {},
        context
      );

      expect(result).toBeDefined();
      expect(result.goals).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle database errors when creating session', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      await expect(chatEngine.createSession(mockUserId)).rejects.toThrow();
    });

    it('should handle session not found error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Session not found' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      await expect(
        chatEngine.getSessionHistory('invalid-session-id', 50)
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should complete full message flow', async () => {
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
      mockAIML.chat
        .mockResolvedValueOnce({
          choices: [{ message: { content: mockIntentResponse } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: mockAIResponse } }],
        });

      const response = await chatEngine.sendMessage(
        mockSessionId,
        'How is my portfolio?',
        false
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.intent).toBeDefined();
      expect(response.suggestedActions).toBeDefined();
      expect(response.metadata).toBeDefined();
    });
  });
});
