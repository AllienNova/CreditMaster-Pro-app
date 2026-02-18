/**
 * React Query Client Configuration
 * Phase 6.5.2: Client-side caching strategy
 *
 * Configures React Query for optimal caching and data synchronization
 */

import { QueryClient, DefaultOptions } from "@tanstack/react-query";

/**
 * Default query options for React Query
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Cache time: How long data stays in cache after becoming unused
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)

    // Stale time: How long data is considered fresh
    staleTime: 1000 * 60 * 2, // 2 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch configuration
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,

    // Network mode
    networkMode: "online",
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
    retryDelay: 1000,

    // Network mode
    networkMode: "online",
  },
};

/**
 * Create a new QueryClient instance with custom configuration
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryConfig,
  });
}

/**
 * Singleton QueryClient instance for the application
 */
export const queryClient = createQueryClient();

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  // Chat sessions
  chatSessions: (userId: string) => ["chat", "sessions", userId] as const,
  chatSession: (sessionId: string) => ["chat", "session", sessionId] as const,

  // Chat messages
  chatMessages: (sessionId: string) => ["chat", "messages", sessionId] as const,
  chatMessage: (messageId: string) => ["chat", "message", messageId] as const,

  // Portfolio
  portfolio: (userId: string) => ["portfolio", userId] as const,
  portfolioHoldings: (userId: string) =>
    ["portfolio", "holdings", userId] as const,

  // Financial goals
  financialGoals: (userId: string) => ["financial", "goals", userId] as const,

  // User preferences
  userPreferences: (userId: string) => ["user", "preferences", userId] as const,

  // Risk profile
  riskProfile: (userId: string) => ["risk", "profile", userId] as const,
};

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  /**
   * Invalidate all chat sessions for a user
   */
  invalidateChatSessions: (userId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.chatSessions(userId),
    });
  },

  /**
   * Invalidate a specific chat session
   */
  invalidateChatSession: (sessionId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.chatSession(sessionId),
    });
  },

  /**
   * Invalidate chat messages for a session
   */
  invalidateChatMessages: (sessionId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.chatMessages(sessionId),
    });
  },

  /**
   * Invalidate all chat-related queries for a user
   */
  invalidateAllChat: (userId: string) => {
    return queryClient.invalidateQueries({
      queryKey: ["chat"],
    });
  },

  /**
   * Invalidate portfolio data
   */
  invalidatePortfolio: (userId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.portfolio(userId),
    });
  },

  /**
   * Invalidate all user-specific data
   */
  invalidateUserData: (userId: string) => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatSessions(userId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(userId) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.financialGoals(userId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences(userId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.riskProfile(userId),
      }),
    ]);
  },
};

/**
 * Prefetch helpers for improved UX
 */
export const prefetchHelpers = {
  /**
   * Prefetch chat sessions for a user
   */
  prefetchChatSessions: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.chatSessions(userId),
      queryFn: async () => {
        const response = await fetch(
          `/api/chat/financial/sessions?userId=${userId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch sessions");
        return response.json();
      },
    });
  },

  /**
   * Prefetch chat messages for a session
   */
  prefetchChatMessages: async (sessionId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.chatMessages(sessionId),
      queryFn: async () => {
        const response = await fetch(
          `/api/chat/financial/sessions/${sessionId}/messages`,
        );
        if (!response.ok) throw new Error("Failed to fetch messages");
        return response.json();
      },
    });
  },
};
