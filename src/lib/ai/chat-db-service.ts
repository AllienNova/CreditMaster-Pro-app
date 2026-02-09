/**
 * Financial Chat Database Service
 *
 * Handles all database operations for chat sessions and messages
 * Integrates with Supabase tables: financial_chat_sessions and financial_chat_messages
 */

import { supabase } from '@/lib/supabase';
import type {
  ChatSession,
  ChatMessage,
  SessionType,
  SessionStatus,
  MessageRole,
  IntentType,
  ExtractedEntities,
  ActionTaken,
  ActionResult,
  FinancialSnapshot,
  CreateSessionRequest,
  ListSessionsRequest,
  UpdateSessionRequest,
  Paginated,
} from './types/chat.types';

// ============================================================================
// TYPES
// ============================================================================

interface DatabaseChatSession {
  id: string;
  user_id: string;
  title: string;
  session_type: SessionType;
  context: Record<string, any>;
  financial_snapshot: FinancialSnapshot | null;
  message_count: number;
  total_tokens_used: number;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

interface DatabaseChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  intent: IntentType | null;
  entities: ExtractedEntities | null;
  action_taken: ActionTaken | null;
  action_result: ActionResult | null;
  referenced_data: Record<string, any> | null;
  tokens_used: number;
  model_used: string | null;
  latency_ms: number;
  feedback_rating: number | null;
  feedback_text: string | null;
  created_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database session to application format
 */
function dbSessionToSession(dbSession: DatabaseChatSession): ChatSession {
  return {
    id: dbSession.id,
    userId: dbSession.user_id,
    title: dbSession.title,
    sessionType: dbSession.session_type,
    context: dbSession.context,
    financialSnapshot: dbSession.financial_snapshot,
    messageCount: dbSession.message_count,
    totalTokensUsed: dbSession.total_tokens_used,
    status: dbSession.status,
    createdAt: new Date(dbSession.created_at),
    updatedAt: new Date(dbSession.updated_at),
    lastMessageAt: dbSession.last_message_at ? new Date(dbSession.last_message_at) : null,
  };
}

/**
 * Convert database message to application format
 */
function dbMessageToMessage(dbMessage: DatabaseChatMessage): ChatMessage {
  return {
    id: dbMessage.id,
    sessionId: dbMessage.session_id,
    userId: dbMessage.user_id,
    role: dbMessage.role,
    content: dbMessage.content,
    intent: dbMessage.intent,
    entities: dbMessage.entities,
    actionTaken: dbMessage.action_taken,
    actionResult: dbMessage.action_result,
    referencedData: dbMessage.referenced_data,
    tokensUsed: dbMessage.tokens_used,
    modelUsed: dbMessage.model_used,
    latencyMs: dbMessage.latency_ms,
    feedbackRating: dbMessage.feedback_rating,
    feedbackText: dbMessage.feedback_text,
    createdAt: new Date(dbMessage.created_at),
  };
}

// ============================================================================
// CHAT DATABASE SERVICE
// ============================================================================

class ChatDatabaseService {
  // ==========================================================================
  // SESSION OPERATIONS
  // ==========================================================================

  /**
   * Create a new chat session
   */
  async createSession(
    userId: string,
    request: CreateSessionRequest
  ): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('financial_chat_sessions')
      .insert({
        user_id: userId,
        title: this.generateSessionTitle(request.sessionType),
        session_type: request.sessionType,
        context: request.context || {},
        financial_snapshot: null,
        message_count: 0,
        total_tokens_used: 0,
        status: 'active' as SessionStatus,
        last_message_at: null,
      })
      .select()
      .single();

    if (error) {
      // Database error:('Failed to create chat session:', error);
      throw new Error(`Failed to create chat session: ${error.message}`);
    }

    return dbSessionToSession(data as DatabaseChatSession);
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from('financial_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      // Database error:('Failed to get chat session:', error);
      throw new Error(`Failed to get chat session: ${error.message}`);
    }

    return dbSessionToSession(data as DatabaseChatSession);
  }

  /**
   * List sessions for a user
   */
  async listSessions(
    userId: string,
    request: ListSessionsRequest = {}
  ): Promise<Paginated<ChatSession>> {
    const {
      status,
      sessionType,
      limit = 20,
      offset = 0,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = request;

    // Build query
    let query = supabase
      .from('financial_chat_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (sessionType) {
      query = query.eq('session_type', sessionType);
    }

    // Apply sorting
    const sortColumn =
      sortBy === 'createdAt'
        ? 'created_at'
        : sortBy === 'updatedAt'
        ? 'updated_at'
        : 'last_message_at';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      // Database error:('Failed to list chat sessions:', error);
      throw new Error(`Failed to list chat sessions: ${error.message}`);
    }

    const sessions = (data as DatabaseChatSession[]).map(dbSessionToSession);

    return {
      items: sessions,
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  /**
   * Update a session
   */
  async updateSession(
    sessionId: string,
    userId: string,
    update: UpdateSessionRequest
  ): Promise<ChatSession> {
    const updateData: Partial<DatabaseChatSession> = {};

    if (update.title !== undefined) {
      updateData.title = update.title;
    }
    if (update.status !== undefined) {
      updateData.status = update.status;
    }
    if (update.context !== undefined) {
      updateData.context = update.context;
    }

    const { data, error } = await supabase
      .from('financial_chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      // Database error:('Failed to update chat session:', error);
      throw new Error(`Failed to update chat session: ${error.message}`);
    }

    return dbSessionToSession(data as DatabaseChatSession);
  }

  /**
   * Delete a session (soft delete - sets status to 'deleted')
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('financial_chat_sessions')
      .update({ status: 'deleted' as SessionStatus })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      // Database error:('Failed to delete chat session:', error);
      throw new Error(`Failed to delete chat session: ${error.message}`);
    }
  }

  /**
   * Archive a session
   */
  async archiveSession(sessionId: string, userId: string): Promise<ChatSession> {
    return this.updateSession(sessionId, userId, { status: 'archived' });
  }

  /**
   * Update financial snapshot for a session
   */
  async updateFinancialSnapshot(
    sessionId: string,
    userId: string,
    snapshot: FinancialSnapshot
  ): Promise<void> {
    const { error } = await supabase
      .from('financial_chat_sessions')
      .update({ financial_snapshot: snapshot })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      // Database error:('Failed to update financial snapshot:', error);
      throw new Error(`Failed to update financial snapshot: ${error.message}`);
    }
  }

  // ==========================================================================
  // MESSAGE OPERATIONS
  // ==========================================================================

  /**
   * Create a new message
   */
  async createMessage(
    sessionId: string,
    userId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<ChatMessage> {
    // Insert message
    const { data: messageData, error: messageError } = await supabase
      .from('financial_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: message.role,
        content: message.content,
        intent: message.intent,
        entities: message.entities,
        action_taken: message.actionTaken,
        action_result: message.actionResult,
        referenced_data: message.referencedData,
        tokens_used: message.tokensUsed,
        model_used: message.modelUsed,
        latency_ms: message.latencyMs,
        feedback_rating: message.feedbackRating,
        feedback_text: message.feedbackText,
      })
      .select()
      .single();

    if (messageError) {
      // Database error:('Failed to create message:', messageError);
      throw new Error(`Failed to create message: ${messageError.message}`);
    }

    // Update session stats
    const { error: updateError } = await supabase.rpc('increment_session_stats', {
      p_session_id: sessionId,
      p_tokens: message.tokensUsed,
    });

    if (updateError) {
      // Database error:('Failed to update session stats:', updateError);
      // Don't throw - message was created successfully
    }

    return dbMessageToMessage(messageData as DatabaseChatMessage);
  }

  /**
   * Get a message by ID
   */
  async getMessage(
    messageId: string,
    userId: string
  ): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('financial_chat_messages')
      .select('*')
      .eq('id', messageId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      // Database error:('Failed to get message:', error);
      throw new Error(`Failed to get message: ${error.message}`);
    }

    return dbMessageToMessage(data as DatabaseChatMessage);
  }

  /**
   * List messages for a session
   */
  async listMessages(
    sessionId: string,
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<Paginated<ChatMessage>> {
    const { data, error, count } = await supabase
      .from('financial_chat_messages')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      // Database error:('Failed to list messages:', error);
      throw new Error(`Failed to list messages: ${error.message}`);
    }

    const messages = (data as DatabaseChatMessage[]).map(dbMessageToMessage);

    return {
      items: messages,
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  /**
   * Get recent messages for a session (for context)
   */
  async getRecentMessages(
    sessionId: string,
    userId: string,
    limit = 10
  ): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('financial_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Database error:('Failed to get recent messages:', error);
      throw new Error(`Failed to get recent messages: ${error.message}`);
    }

    // Reverse to chronological order
    return (data as DatabaseChatMessage[])
      .reverse()
      .map(dbMessageToMessage);
  }

  /**
   * Update message feedback
   */
  async updateMessageFeedback(
    messageId: string,
    userId: string,
    rating: number,
    text?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('financial_chat_messages')
      .update({
        feedback_rating: rating,
        feedback_text: text || null,
      })
      .eq('id', messageId)
      .eq('user_id', userId);

    if (error) {
      // Database error:('Failed to update message feedback:', error);
      throw new Error(`Failed to update message feedback: ${error.message}`);
    }
  }

  // ==========================================================================
  // ANALYTICS & UTILITIES
  // ==========================================================================

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string, userId: string) {
    const { data, error } = await supabase
      .from('financial_chat_sessions')
      .select('message_count, total_tokens_used')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Database error:('Failed to get session stats:', error);
      throw new Error(`Failed to get session stats: ${error.message}`);
    }

    return {
      messageCount: data.message_count,
      totalTokensUsed: data.total_tokens_used,
    };
  }

  /**
   * Search messages by content
   */
  async searchMessages(
    userId: string,
    query: string,
    sessionId?: string,
    limit = 20
  ): Promise<ChatMessage[]> {
    let dbQuery = supabase
      .from('financial_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .ilike('content', `%${query}%`);

    if (sessionId) {
      dbQuery = dbQuery.eq('session_id', sessionId);
    }

    dbQuery = dbQuery.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await dbQuery;

    if (error) {
      // Database error:('Failed to search messages:', error);
      throw new Error(`Failed to search messages: ${error.message}`);
    }

    return (data as DatabaseChatMessage[]).map(dbMessageToMessage);
  }

  /**
   * Get user's total chat statistics
   */
  async getUserChatStats(userId: string) {
    const { data, error } = await supabase.rpc('get_user_chat_stats', {
      p_user_id: userId,
    });

    if (error) {
      // Database error:('Failed to get user chat stats:', error);
      // Return defaults if RPC doesn't exist
      return {
        totalSessions: 0,
        activeSessions: 0,
        totalMessages: 0,
        totalTokens: 0,
      };
    }

    return data;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Generate a session title based on session type
   */
  private generateSessionTitle(sessionType: SessionType): string {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const typeLabels: Record<SessionType, string> = {
      general: 'Financial Chat',
      budget: 'Budget Planning',
      goals: 'Goal Discussion',
      debt: 'Debt Strategy',
      investing: 'Investment Advice',
      credit_repair: 'Credit Repair',
      tax_planning: 'Tax Planning',
    };

    return `${typeLabels[sessionType]} - ${date}`;
  }

  /**
   * Clean up old deleted sessions (optional maintenance)
   */
  async cleanupDeletedSessions(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from('financial_chat_sessions')
      .delete()
      .eq('status', 'deleted')
      .lt('updated_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      // Database error:('Failed to cleanup deleted sessions:', error);
      throw new Error(`Failed to cleanup deleted sessions: ${error.message}`);
    }

    return data?.length || 0;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const chatDbService = new ChatDatabaseService();
export default chatDbService;
