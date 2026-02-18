/**
 * Chat Database Service Tests
 *
 * Comprehensive test suite for chat database operations
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { chatDbService } from "../chat-db-service";
import type {
  ChatSession,
  ChatMessage,
  SessionType,
  CreateSessionRequest,
} from "../types/chat.types";

// Mock Supabase — define inside factory to avoid TDZ with jest.mock hoisting
jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn(), rpc: jest.fn() };
  return { getSupabase: () => _client };
});

import { getSupabase } from "@/lib/supabase/client";
const supabase = getSupabase() as any;

describe("ChatDatabaseService", () => {
  const mockUserId = "user-123";
  const mockSessionId = "session-456";
  const mockMessageId = "message-789";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // SESSION CREATION TESTS
  // ============================================================================

  describe("createSession", () => {
    it("should create a new chat session", async () => {
      const request: CreateSessionRequest = {
        sessionType: "budget",
        context: { source: "mobile" },
      };

      const mockDbSession = {
        id: mockSessionId,
        user_id: mockUserId,
        title: "Budget Planning - Dec 18",
        session_type: "budget",
        context: { source: "mobile" },
        financial_snapshot: null,
        message_count: 0,
        total_tokens_used: 0,
        status: "active",
        created_at: "2025-12-18T00:00:00Z",
        updated_at: "2025-12-18T00:00:00Z",
        last_message_at: null,
      };

      const mockFrom = {
        insert: jest.fn<any>().mockReturnThis(),
        select: jest.fn<any>().mockReturnThis(),
        single: jest
          .fn<any>()
          .mockResolvedValue({ data: mockDbSession, error: null }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const session = await chatDbService.createSession(mockUserId, request);

      expect(session).toBeDefined();
      expect(session.id).toBe(mockSessionId);
      expect(session.userId).toBe(mockUserId);
      expect(session.sessionType).toBe("budget");
      expect(session.status).toBe("active");
      expect(session.messageCount).toBe(0);
      expect(supabase.from).toHaveBeenCalledWith("financial_chat_sessions");
    });

    it("should throw error if session creation fails", async () => {
      const request: CreateSessionRequest = {
        sessionType: "general",
      };

      const mockFrom = {
        insert: jest.fn<any>().mockReturnThis(),
        select: jest.fn<any>().mockReturnThis(),
        single: jest
          .fn<any>()
          .mockResolvedValue({ data: null, error: { message: "DB error" } }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      await expect(
        chatDbService.createSession(mockUserId, request),
      ).rejects.toThrow("Failed to create chat session");
    });

    it("should generate appropriate title for different session types", async () => {
      const sessionTypes: SessionType[] = [
        "general",
        "budget",
        "goals",
        "debt",
        "investing",
        "credit_repair",
        "tax_planning",
      ];

      for (const sessionType of sessionTypes) {
        const mockFrom = {
          insert: jest.fn<any>().mockReturnThis(),
          select: jest.fn<any>().mockReturnThis(),
          single: jest.fn<any>().mockResolvedValue({
            data: {
              id: mockSessionId,
              user_id: mockUserId,
              title: `${sessionType} - Dec 18`,
              session_type: sessionType,
              context: {},
              financial_snapshot: null,
              message_count: 0,
              total_tokens_used: 0,
              status: "active",
              created_at: "2025-12-18T00:00:00Z",
              updated_at: "2025-12-18T00:00:00Z",
              last_message_at: null,
            },
            error: null,
          }),
        };

        (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

        const session = await chatDbService.createSession(mockUserId, {
          sessionType,
        });

        expect(session.title).toContain(sessionType);
      }
    });
  });

  // ============================================================================
  // SESSION RETRIEVAL TESTS
  // ============================================================================

  describe("getSession", () => {
    it("should retrieve a session by ID", async () => {
      const mockDbSession = {
        id: mockSessionId,
        user_id: mockUserId,
        title: "Budget Planning",
        session_type: "budget",
        context: {},
        financial_snapshot: null,
        message_count: 5,
        total_tokens_used: 1500,
        status: "active",
        created_at: "2025-12-18T00:00:00Z",
        updated_at: "2025-12-18T00:00:00Z",
        last_message_at: "2025-12-18T01:00:00Z",
      };

      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        single: jest
          .fn<any>()
          .mockResolvedValue({ data: mockDbSession, error: null }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const session = await chatDbService.getSession(mockSessionId, mockUserId);

      expect(session).toBeDefined();
      expect(session!.id).toBe(mockSessionId);
      expect(session!.messageCount).toBe(5);
      expect(session!.totalTokensUsed).toBe(1500);
    });

    it("should return null if session not found", async () => {
      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        single: jest
          .fn<any>()
          .mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const session = await chatDbService.getSession(mockSessionId, mockUserId);

      expect(session).toBeNull();
    });

    it("should throw error for database errors", async () => {
      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        single: jest
          .fn<any>()
          .mockResolvedValue({ data: null, error: { message: "DB error" } }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      await expect(
        chatDbService.getSession(mockSessionId, mockUserId),
      ).rejects.toThrow("Failed to get chat session");
    });
  });

  // ============================================================================
  // SESSION LISTING TESTS
  // ============================================================================

  describe("listSessions", () => {
    it("should list all sessions for a user", async () => {
      const mockSessions = [
        {
          id: "session-1",
          user_id: mockUserId,
          title: "Session 1",
          session_type: "general",
          context: {},
          financial_snapshot: null,
          message_count: 3,
          total_tokens_used: 500,
          status: "active",
          created_at: "2025-12-18T00:00:00Z",
          updated_at: "2025-12-18T00:00:00Z",
          last_message_at: null,
        },
        {
          id: "session-2",
          user_id: mockUserId,
          title: "Session 2",
          session_type: "budget",
          context: {},
          financial_snapshot: null,
          message_count: 5,
          total_tokens_used: 1000,
          status: "active",
          created_at: "2025-12-17T00:00:00Z",
          updated_at: "2025-12-17T00:00:00Z",
          last_message_at: null,
        },
      ];

      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        order: jest.fn<any>().mockReturnThis(),
        range: jest.fn<any>().mockResolvedValue({
          data: mockSessions,
          error: null,
          count: 2,
        }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const result = await chatDbService.listSessions(mockUserId);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it("should filter by session type", async () => {
      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        order: jest.fn<any>().mockReturnThis(),
        range: jest.fn<any>().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      await chatDbService.listSessions(mockUserId, {
        sessionType: "budget",
      });

      expect(mockFrom.eq).toHaveBeenCalledWith("session_type", "budget");
    });

    it("should filter by status", async () => {
      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        order: jest.fn<any>().mockReturnThis(),
        range: jest.fn<any>().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      await chatDbService.listSessions(mockUserId, {
        status: "archived",
      });

      expect(mockFrom.eq).toHaveBeenCalledWith("status", "archived");
    });

    it("should support pagination", async () => {
      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        order: jest.fn<any>().mockReturnThis(),
        range: jest.fn<any>().mockResolvedValue({
          data: [],
          error: null,
          count: 50,
        }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const result = await chatDbService.listSessions(mockUserId, {
        limit: 10,
        offset: 20,
      });

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(mockFrom.range).toHaveBeenCalledWith(20, 29);
    });
  });

  // ============================================================================
  // SESSION UPDATE TESTS
  // ============================================================================

  describe("updateSession", () => {
    it("should update session title", async () => {
      const mockFrom = {
        update: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        select: jest.fn<any>().mockReturnThis(),
        single: jest.fn<any>().mockResolvedValue({
          data: {
            id: mockSessionId,
            user_id: mockUserId,
            title: "New Title",
            session_type: "general",
            context: {},
            financial_snapshot: null,
            message_count: 0,
            total_tokens_used: 0,
            status: "active",
            created_at: "2025-12-18T00:00:00Z",
            updated_at: "2025-12-18T00:00:00Z",
            last_message_at: null,
          },
          error: null,
        }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const session = await chatDbService.updateSession(
        mockSessionId,
        mockUserId,
        { title: "New Title" },
      );

      expect(session.title).toBe("New Title");
    });

    it("should update session status", async () => {
      const mockFrom = {
        update: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        select: jest.fn<any>().mockReturnThis(),
        single: jest.fn<any>().mockResolvedValue({
          data: {
            id: mockSessionId,
            user_id: mockUserId,
            title: "Session",
            session_type: "general",
            context: {},
            financial_snapshot: null,
            message_count: 0,
            total_tokens_used: 0,
            status: "archived",
            created_at: "2025-12-18T00:00:00Z",
            updated_at: "2025-12-18T00:00:00Z",
            last_message_at: null,
          },
          error: null,
        }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const session = await chatDbService.updateSession(
        mockSessionId,
        mockUserId,
        { status: "archived" },
      );

      expect(session.status).toBe("archived");
    });
  });

  // ============================================================================
  // MESSAGE CREATION TESTS
  // ============================================================================

  describe("createMessage", () => {
    it("should create a new message", async () => {
      const mockDbMessage = {
        id: mockMessageId,
        session_id: mockSessionId,
        user_id: mockUserId,
        role: "user",
        content: "Hello, I need help with budgeting",
        intent: "create_budget",
        entities: null,
        action_taken: null,
        action_result: null,
        referenced_data: null,
        tokens_used: 50,
        model_used: null,
        latency_ms: 0,
        feedback_rating: null,
        feedback_text: null,
        created_at: "2025-12-18T00:00:00Z",
      };

      const mockFrom = {
        insert: jest.fn<any>().mockReturnThis(),
        select: jest.fn<any>().mockReturnThis(),
        single: jest
          .fn<any>()
          .mockResolvedValue({ data: mockDbMessage, error: null }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);
      (supabase.rpc as jest.Mock<any>).mockResolvedValue({ error: null });

      const message = await chatDbService.createMessage(
        mockSessionId,
        mockUserId,
        {
          sessionId: mockSessionId,
          userId: mockUserId,
          role: "user",
          content: "Hello, I need help with budgeting",
          intent: "create_budget",
          entities: null,
          actionTaken: null,
          actionResult: null,
          referencedData: null,
          tokensUsed: 50,
          modelUsed: null,
          latencyMs: 0,
          feedbackRating: null,
          feedbackText: null,
        },
      );

      expect(message).toBeDefined();
      expect(message.content).toBe("Hello, I need help with budgeting");
      expect(message.intent).toBe("create_budget");
      expect(supabase.rpc).toHaveBeenCalledWith("increment_session_stats", {
        p_session_id: mockSessionId,
        p_tokens: 50,
      });
    });
  });

  // ============================================================================
  // MESSAGE RETRIEVAL TESTS
  // ============================================================================

  describe("listMessages", () => {
    it("should list messages for a session", async () => {
      const mockMessages = [
        {
          id: "msg-1",
          session_id: mockSessionId,
          user_id: mockUserId,
          role: "user",
          content: "Message 1",
          intent: null,
          entities: null,
          action_taken: null,
          action_result: null,
          referenced_data: null,
          tokens_used: 10,
          model_used: null,
          latency_ms: 0,
          feedback_rating: null,
          feedback_text: null,
          created_at: "2025-12-18T00:00:00Z",
        },
        {
          id: "msg-2",
          session_id: mockSessionId,
          user_id: mockUserId,
          role: "assistant",
          content: "Message 2",
          intent: null,
          entities: null,
          action_taken: null,
          action_result: null,
          referenced_data: null,
          tokens_used: 20,
          model_used: "gpt-4o",
          latency_ms: 500,
          feedback_rating: null,
          feedback_text: null,
          created_at: "2025-12-18T00:01:00Z",
        },
      ];

      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        order: jest.fn<any>().mockReturnThis(),
        range: jest.fn<any>().mockResolvedValue({
          data: mockMessages,
          error: null,
          count: 2,
        }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const result = await chatDbService.listMessages(
        mockSessionId,
        mockUserId,
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0].role).toBe("user");
      expect(result.items[1].role).toBe("assistant");
    });
  });

  describe("getRecentMessages", () => {
    it("should retrieve recent messages in chronological order", async () => {
      const mockMessages = [
        {
          id: "msg-2",
          session_id: mockSessionId,
          user_id: mockUserId,
          role: "assistant",
          content: "Recent message",
          intent: null,
          entities: null,
          action_taken: null,
          action_result: null,
          referenced_data: null,
          tokens_used: 20,
          model_used: "gpt-4o",
          latency_ms: 500,
          feedback_rating: null,
          feedback_text: null,
          created_at: "2025-12-18T00:01:00Z",
        },
        {
          id: "msg-1",
          session_id: mockSessionId,
          user_id: mockUserId,
          role: "user",
          content: "Older message",
          intent: null,
          entities: null,
          action_taken: null,
          action_result: null,
          referenced_data: null,
          tokens_used: 10,
          model_used: null,
          latency_ms: 0,
          feedback_rating: null,
          feedback_text: null,
          created_at: "2025-12-18T00:00:00Z",
        },
      ];

      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        order: jest.fn<any>().mockReturnThis(),
        limit: jest
          .fn<any>()
          .mockResolvedValue({ data: mockMessages, error: null }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      const messages = await chatDbService.getRecentMessages(
        mockSessionId,
        mockUserId,
        10,
      );

      // Should be reversed to chronological order
      expect(messages[0].content).toBe("Older message");
      expect(messages[1].content).toBe("Recent message");
    });
  });

  // ============================================================================
  // SEARCH & ANALYTICS TESTS
  // ============================================================================

  describe("searchMessages", () => {
    it("should search messages by content", async () => {
      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn<any>().mockReturnThis(),
        limit: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      await chatDbService.searchMessages(mockUserId, "budget");

      expect(mockFrom.ilike).toHaveBeenCalledWith("content", "%budget%");
    });

    it("should filter search by session ID", async () => {
      const mockFrom = {
        select: jest.fn<any>().mockReturnThis(),
        eq: jest.fn<any>().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn<any>().mockReturnThis(),
        limit: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock<any>).mockReturnValue(mockFrom);

      await chatDbService.searchMessages(mockUserId, "budget", mockSessionId);

      expect(mockFrom.eq).toHaveBeenCalledWith("session_id", mockSessionId);
    });
  });
});
