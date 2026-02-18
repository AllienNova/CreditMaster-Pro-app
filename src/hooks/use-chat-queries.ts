/**
 * Chat React Query Hooks
 * Phase 6.5.2: Client-side caching with React Query
 *
 * Custom hooks for chat data fetching and mutations with optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  cacheInvalidation,
} from "@/lib/react-query/query-client-config";

// ============================================================================
// TYPES
// ============================================================================

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt?: string;
  archived: boolean;
}

interface ChatMessageMetadata {
  intentType?: string;
  intentConfidence?: number;
  actionExecuted?: boolean;
  suggestedActions?: Array<{ label: string; action: string }>;
  educationalContent?: Array<{ title: string; content: string }>;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: ChatMessageMetadata;
}

interface CreateSessionInput {
  userId: string;
  title?: string;
}

interface SendMessageInput {
  sessionId: string;
  content: string;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch chat sessions for a user
 */
export function useChatSessions(userId: string) {
  return useQuery({
    queryKey: queryKeys.chatSessions(userId),
    queryFn: async () => {
      const response = await fetch(
        `/api/chat/financial/sessions?userId=${userId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch chat sessions");
      }
      return response.json() as Promise<{ sessions: ChatSession[] }>;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch a specific chat session
 */
export function useChatSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.chatSession(sessionId),
    queryFn: async () => {
      const response = await fetch(`/api/chat/financial/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch chat session");
      }
      return response.json() as Promise<ChatSession>;
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch messages for a chat session
 */
export function useChatMessages(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.chatMessages(sessionId),
    queryFn: async () => {
      const response = await fetch(
        `/api/chat/financial/sessions/${sessionId}/messages`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch chat messages");
      }
      return response.json() as Promise<{ messages: ChatMessage[] }>;
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new chat session
 */
export function useCreateChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const response = await fetch("/api/chat/financial/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to create chat session");
      }

      return response.json() as Promise<ChatSession>;
    },
    onSuccess: (data, variables) => {
      // Invalidate sessions list
      cacheInvalidation.invalidateChatSessions(variables.userId);
    },
  });
}

/**
 * Hook to send a message in a chat session
 */
export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const response = await fetch(
        `/api/chat/financial/sessions/${input.sessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: input.content }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return response.json() as Promise<{
        userMessage: ChatMessage;
        assistantMessage: ChatMessage;
      }>;
    },
    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.chatMessages(input.sessionId),
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(
        queryKeys.chatMessages(input.sessionId),
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.chatMessages(input.sessionId),
        (old: { messages: ChatMessage[] } | undefined) => {
          const optimisticMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            sessionId: input.sessionId,
            role: "user",
            content: input.content,
            timestamp: new Date().toISOString(),
          };

          return {
            messages: [...(old?.messages || []), optimisticMessage],
          };
        },
      );

      return { previousMessages };
    },
    onError: (err, input, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.chatMessages(input.sessionId),
          context.previousMessages,
        );
      }
    },
    onSuccess: (data, input) => {
      // Invalidate messages to refetch with server data
      cacheInvalidation.invalidateChatMessages(input.sessionId);
      cacheInvalidation.invalidateChatSession(input.sessionId);
    },
  });
}

/**
 * Hook to delete a chat session
 */
export function useDeleteChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(
        `/api/chat/financial/sessions/${sessionId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete chat session");
      }

      return { sessionId };
    },
    onMutate: async (sessionId) => {
      // Get session to find user ID
      const session = queryClient.getQueryData(
        queryKeys.chatSession(sessionId),
      ) as ChatSession | undefined;

      if (session) {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey: queryKeys.chatSessions(session.userId),
        });

        // Snapshot previous value
        const previousSessions = queryClient.getQueryData(
          queryKeys.chatSessions(session.userId),
        );

        // Optimistically remove from list
        queryClient.setQueryData(
          queryKeys.chatSessions(session.userId),
          (old: { sessions: ChatSession[] } | undefined) => {
            return {
              sessions:
                old?.sessions?.filter((s: ChatSession) => s.id !== sessionId) ||
                [],
            };
          },
        );

        return { previousSessions, userId: session.userId };
      }

      return {};
    },
    onError: (err, sessionId, context) => {
      // Rollback on error
      if (context?.previousSessions && context?.userId) {
        queryClient.setQueryData(
          queryKeys.chatSessions(context.userId),
          context.previousSessions,
        );
      }
    },
    onSuccess: (data, sessionId, context) => {
      // Invalidate queries
      if (context?.userId) {
        cacheInvalidation.invalidateChatSessions(context.userId);
      }
      cacheInvalidation.invalidateChatSession(sessionId);
    },
  });
}

/**
 * Hook to update a chat session title
 */
export function useUpdateChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      title,
    }: {
      sessionId: string;
      title: string;
    }) => {
      const response = await fetch(
        `/api/chat/financial/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update chat session");
      }

      return response.json() as Promise<ChatSession>;
    },
    onSuccess: (data, variables) => {
      // Update cache with new data
      queryClient.setQueryData(
        queryKeys.chatSession(variables.sessionId),
        data,
      );

      // Invalidate sessions list to reflect changes
      cacheInvalidation.invalidateChatSessions(data.userId);
    },
  });
}
