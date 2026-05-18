/**
 * Financial Chat Engine
 *
 * Phase 6.1.2: Conversational AI for financial planning
 * Provides intelligent chat interface with context-aware responses,
 * intent detection, and action execution
 */

import { v4 as uuidv4 } from "uuid";
import { getSupabase } from "@/lib/supabase/client";
import { getModelRouter, TaskType } from "@/lib/model-router";
import {
  ChatSession,
  ChatMessage,
  ChatContext,
  ChatIntent,
  ChatResponse,
  MessageRole,
  IntentType,
  ActionType,
  ChatSessionDB,
  ChatMessageDB,
  EntityExtraction,
  ActionSuggestion,
  EducationalContent,
  StreamOptions,
} from "./types/financial-chat.types";
import {
  chatCache,
  ChatMessage as CacheChatMessage,
  ChatSession as CacheChatSession,
} from "@/lib/cache/chat-cache";
import {
  CHAT_SYSTEM_PROMPT,
  INTENT_DETECTION_SYSTEM_PROMPT,
  RESPONSE_GENERATION_SYSTEM_PROMPT,
  ACTION_EXECUTION_PROMPT,
} from "./prompts/financial-chat-prompts";
import {
  sanitizeUserInput,
  sanitizeContextValue,
} from "@/lib/aiml/sanitizer";

/**
 * Financial Chat Engine
 *
 * Manages conversational AI interactions for financial planning,
 * investment advice, and portfolio management
 */
export class FinancialChatEngine {
  private get supabase() { return getSupabase(); }

  /**
   * Create a new chat session
   */
  async createSession(userId: string, title?: string): Promise<ChatSession> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from("chat_sessions")
      .insert({
        id: sessionId,
        user_id: userId,
        created_at: now,
        updated_at: now,
        title: title || "New Chat",
        metadata: {},
        message_count: 0,
        archived: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create chat session: ${error.message}`);
    }

    // Invalidate user sessions cache
    chatCache.invalidateUser(userId);

    return this.mapSessionFromDB(data);
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    sessionId: string,
    message: string,
    streaming: boolean = false,
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    // Save user message
    const userMessage = await this.saveMessage(
      sessionId,
      MessageRole.USER,
      message,
    );

    // Get chat context
    const context = await this.getChatContext(sessionId);

    // Detect intent
    const intent = await this.detectIntent(message, context);

    // Generate response
    const responseText = await this.generateResponse(intent, context);

    // Execute action if needed
    let actionResults: any = null;
    if (intent.action) {
      actionResults = await this.executeAction(
        intent.action,
        intent.parameters || {},
        context,
      );
    }

    // Save assistant message
    const assistantMessage = await this.saveMessage(
      sessionId,
      MessageRole.ASSISTANT,
      responseText,
      {
        intentType: intent.type,
        intentConfidence: intent.confidence,
        actionExecuted: !!intent.action,
      },
    );

    // Update session
    await this.updateSessionTimestamp(sessionId);

    // Build response
    const processingTime = Date.now() - startTime;
    const response: ChatResponse = {
      message: responseText,
      intent,
      suggestedActions: this.generateSuggestedActions(intent, context),
      educationalContent: this.generateEducationalContent(intent),
      metadata: {
        processingTime,
        model: getModelRouter().getModel(TaskType.FINANCIAL_ADVICE),
        tokensUsed: 0, // Will be populated by model router
        confidence: intent.confidence,
        disclaimer: this.getFinancialDisclaimer(),
      },
    };

    return response;
  }

  /**
   * Get session history
   */
  async getSessionHistory(
    sessionId: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    // Check cache first
    const cached = chatCache.getSessionMessages(sessionId);
    if (cached) {
      // Convert cached messages (string timestamps) to ChatMessage (Date timestamps)
      return cached.slice(0, limit).map((msg) => ({
        ...msg,
        role: msg.role as MessageRole,
        timestamp: new Date(msg.timestamp),
      }));
    }

    const { data, error } = await this.supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get session history: ${error.message}`);
    }

    const messages = data.map(this.mapMessageFromDB).reverse();

    // Cache the result (convert to cache format with string timestamps)
    const cacheMessages: CacheChatMessage[] = messages.map((msg) => ({
      id: msg.id,
      sessionId: msg.sessionId,
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      metadata: msg.metadata as Record<string, unknown> | undefined,
    }));
    chatCache.cacheSessionMessages(sessionId, cacheMessages);

    return messages;
  }

  /**
   * Detect user intent from message
   */
  async detectIntent(
    message: string,
    context: ChatContext,
  ): Promise<ChatIntent> {
    const sanitizedMessage = sanitizeUserInput(message);
    const sanitizedContext = sanitizeContextValue(JSON.stringify(context, null, 2));

    try {
      const response = await getModelRouter().complete(
        TaskType.FINANCIAL_ADVICE,
        [
          { role: "system", content: INTENT_DETECTION_SYSTEM_PROMPT },
          { role: "user", content: `User message:\n${sanitizedMessage}\n\nContext:\n${sanitizedContext}` },
        ],
        {
          max_tokens: 500,
          temperature: 0.3,
        },
      );

      // Parse AI response to extract intent
      const responseText = response.choices[0].message.content || "";
      const intentData = this.parseIntentResponse(responseText);
      return intentData;
    } catch (error) {
      // Chat engine error:('Intent detection failed:', error);
      // Fallback to basic intent
      return {
        type: IntentType.QUESTION,
        confidence: 0.5,
        entities: [],
      };
    }
  }

  /**
   * Generate contextual response
   */
  async generateResponse(
    intent: ChatIntent,
    context: ChatContext,
  ): Promise<string> {
    const sanitizedIntent = sanitizeContextValue(JSON.stringify(intent, null, 2));
    const sanitizedContext = sanitizeContextValue(JSON.stringify(context, null, 2));

    try {
      const response = await getModelRouter().complete(
        TaskType.FINANCIAL_ADVICE,
        [
          { role: "system", content: RESPONSE_GENERATION_SYSTEM_PROMPT },
          { role: "user", content: `Intent:\n${sanitizedIntent}\n\nContext:\n${sanitizedContext}` },
        ],
        {
          max_tokens: 1000,
          temperature: 0.7,
        },
      );

      return response.choices[0].message.content || "";
    } catch (error) {
      // Chat engine error:('Response generation failed:', error);
      return "I apologize, but I encountered an error processing your request. Please try again.";
    }
  }

  /**
   * Execute financial action
   */
  async executeAction(
    action: ActionType,
    parameters: any,
    context: ChatContext,
  ): Promise<any> {
    try {
      switch (action) {
        case ActionType.VIEW_PORTFOLIO:
          return await this.getPortfolioData(context.userId);

        case ActionType.ANALYZE_INVESTMENT:
          return await this.analyzeInvestment(parameters.symbol, context);

        case ActionType.GET_TRADING_SIGNAL:
          return await this.getTradingSignal(parameters.symbol, context);

        case ActionType.CREATE_BUDGET:
          return await this.createBudget(parameters, context);

        case ActionType.OPTIMIZE_DEBT:
          return await this.optimizeDebt(context.userId);

        case ActionType.ASSESS_RISK:
          return await this.assessRisk(context);

        case ActionType.GENERATE_REPORT:
          return await this.generateReport(parameters.type, context);

        case ActionType.TRACK_GOALS:
          return await this.trackGoals(context.userId);

        case ActionType.ANALYZE_SPENDING:
          return await this.analyzeSpending(context.userId, parameters);

        case ActionType.RECOMMEND_STRATEGY:
          return await this.recommendStrategy(context);

        default:
          throw new Error(`Unknown action type: ${action}`);
      }
    } catch (error) {
      // Chat engine error:(`Action execution failed for ${action}:`, error);
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(
    userId: string,
    limit: number = 20,
  ): Promise<ChatSession[]> {
    // Check cache first
    const cached = chatCache.getUserSessions(userId);
    if (cached) {
      // Convert cached sessions (string timestamps) to ChatSession (Date timestamps)
      return cached.slice(0, limit).map((session) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }

    const sessions = data.map(this.mapSessionFromDB);

    // Cache the result (convert to cache format with string timestamps)
    const cacheSessions: CacheChatSession[] = sessions.map(
      (session: ChatSession) => ({
        id: session.id,
        userId: session.userId,
        title: session.title || "New Chat",
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messageCount: 0,
        archived: false,
      }),
    );
    chatCache.cacheUserSessions(userId, cacheSessions);

    return sessions;
  }

  /**
   * Update session
   */
  async updateSession(
    sessionId: string,
    updates: { title?: string; metadata?: any },
  ): Promise<ChatSession> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from("chat_sessions")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return this.mapSessionFromDB(data);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Get session to find user ID for cache invalidation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (this.supabase as any)
      .from("chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.supabase as any)
      .from("chat_sessions")
      .update({ archived: true })
      .eq("id", sessionId);

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }

    // Invalidate caches
    chatCache.invalidateSession(sessionId);
    if (session) {
      chatCache.invalidateUser(session.user_id);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get chat context for a session
   */
  private async getChatContext(sessionId: string): Promise<ChatContext> {
    // Get session to find user ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (this.supabase as any)
      .from("chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found");
    }

    const userId = session.user_id;

    // Get recent messages for context
    const sessionHistory = await this.getSessionHistory(sessionId, 10);

    // Get portfolio data
    const portfolioData = await this.getPortfolioData(userId);

    // Get user preferences
    const userPreferences = await this.getUserPreferences(userId);

    // Get financial goals
    const financialGoals = await this.getFinancialGoals(userId);

    // Get risk profile
    const riskProfile = await this.getRiskProfile(userId);

    return {
      userId,
      portfolioData,
      sessionHistory,
      userPreferences,
      financialGoals,
      riskProfile,
    };
  }

  /**
   * Save a message to the database
   */
  private async saveMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: any,
  ): Promise<ChatMessage> {
    const messageId = uuidv4();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from("chat_messages")
      .insert({
        id: messageId,
        session_id: sessionId,
        role,
        content,
        timestamp: now,
        metadata: metadata || {},
        intent_type: metadata?.intentType || null,
        intent_confidence: metadata?.intentConfidence || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save message: ${error.message}`);
    }

    // Update session message count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any).rpc("increment_message_count", {
      session_id: sessionId,
    });

    return this.mapMessageFromDB(data);
  }

  /**
   * Update session timestamp
   */
  private async updateSessionTimestamp(sessionId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any)
      .from("chat_sessions")
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }

  /**
   * Parse intent response from AI
   */
  private parseIntentResponse(response: string): ChatIntent {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch =
        response.match(/```json\s*([\s\S]*?)\s*```/) ||
        response.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        type: parsed.type || IntentType.QUESTION,
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || [],
        action: parsed.action,
        parameters: parsed.parameters || {},
      };
    } catch (error) {
      // Chat engine error:('Failed to parse intent response:', error);
      return {
        type: IntentType.QUESTION,
        confidence: 0.5,
        entities: [],
      };
    }
  }

  /**
   * Generate suggested actions based on intent
   */
  private generateSuggestedActions(
    intent: ChatIntent,
    context: ChatContext,
  ): ActionSuggestion[] {
    const suggestions: ActionSuggestion[] = [];

    // Add context-aware suggestions based on intent type
    switch (intent.type) {
      case IntentType.PORTFOLIO_ANALYSIS:
        suggestions.push({
          type: ActionType.GENERATE_REPORT,
          label: "Generate Portfolio Report",
          description: "Get a detailed analysis of your portfolio performance",
          parameters: { type: "portfolio" },
          priority: "high",
        });
        break;

      case IntentType.INVESTMENT_ADVICE:
        if (intent.entities?.some((e) => e.type === "symbol")) {
          const symbol = intent.entities.find(
            (e) => e.type === "symbol",
          )?.value;
          suggestions.push({
            type: ActionType.GET_TRADING_SIGNAL,
            label: `Get Trading Signal for ${symbol}`,
            description: "AI-powered buy/sell recommendation",
            parameters: { symbol },
            priority: "high",
          });
        }
        break;

      case IntentType.BUDGET_PLANNING:
        suggestions.push({
          type: ActionType.ANALYZE_SPENDING,
          label: "Analyze Spending Patterns",
          description:
            "Review your spending habits and find savings opportunities",
          parameters: {},
          priority: "medium",
        });
        break;
    }

    return suggestions;
  }

  /**
   * Generate educational content based on intent
   */
  private generateEducationalContent(intent: ChatIntent): EducationalContent[] {
    const content: EducationalContent[] = [];

    // Add relevant educational content based on intent
    switch (intent.type) {
      case IntentType.INVESTMENT_ADVICE:
        content.push({
          title: "Understanding Investment Risk",
          summary:
            "Learn about different types of investment risks and how to manage them",
          category: "investing",
          difficulty: "beginner",
          readTime: 5,
          keyTakeaways: [
            "Diversification reduces risk",
            "Higher returns usually mean higher risk",
            "Time horizon affects risk tolerance",
          ],
        });
        break;

      case IntentType.BUDGET_PLANNING:
        content.push({
          title: "50/30/20 Budgeting Rule",
          summary:
            "A simple budgeting framework: 50% needs, 30% wants, 20% savings",
          category: "budgeting",
          difficulty: "beginner",
          readTime: 3,
          keyTakeaways: [
            "50% for essential needs",
            "30% for discretionary spending",
            "20% for savings and debt repayment",
          ],
        });
        break;

      case IntentType.DEBT_STRATEGY:
        content.push({
          title: "Debt Avalanche vs. Debt Snowball",
          summary: "Compare two popular debt repayment strategies",
          category: "debt",
          difficulty: "intermediate",
          readTime: 7,
          keyTakeaways: [
            "Avalanche: Pay highest interest first (saves money)",
            "Snowball: Pay smallest balance first (psychological wins)",
            "Choose based on your personality and situation",
          ],
        });
        break;
    }

    return content;
  }

  /**
   * Get financial disclaimer
   */
  private getFinancialDisclaimer(): string {
    return "This information is for educational purposes only and should not be considered as financial advice. Please consult with a licensed financial advisor before making investment decisions.";
  }

  /**
   * Map database session to ChatSession
   */
  private mapSessionFromDB(dbSession: ChatSessionDB): ChatSession {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      createdAt: new Date(dbSession.created_at),
      updatedAt: new Date(dbSession.updated_at),
      title: dbSession.title || undefined,
      metadata: dbSession.metadata || undefined,
    };
  }

  /**
   * Map database message to ChatMessage
   */
  private mapMessageFromDB(dbMessage: ChatMessageDB): ChatMessage {
    return {
      id: dbMessage.id,
      sessionId: dbMessage.session_id,
      role: dbMessage.role as MessageRole,
      content: dbMessage.content,
      timestamp: new Date(dbMessage.timestamp),
      metadata: dbMessage.metadata || undefined,
    };
  }

  // ============================================================================
  // ACTION IMPLEMENTATIONS
  // ============================================================================

  /**
   * Get portfolio data for user
   */
  private async getPortfolioData(userId: string): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (this.supabase as any)
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      // Calculate portfolio metrics
      const totalValue = data.reduce(
        (sum: number, holding: any) => sum + (holding.current_value || 0),
        0,
      );

      // Calculate allocation percentages from holdings
      const allocationTotals = data.reduce(
        (
          acc: { stocks: number; bonds: number; crypto: number; cash: number },
          h: any,
        ) => {
          const value = h.current_value || 0;
          const assetType = (h.asset_type || "stock").toLowerCase();
          if (assetType.includes("bond") || assetType.includes("fixed")) {
            acc.bonds += value;
          } else if (
            assetType.includes("crypto") ||
            assetType.includes("bitcoin") ||
            assetType.includes("eth")
          ) {
            acc.crypto += value;
          } else if (
            assetType.includes("cash") ||
            assetType.includes("money market")
          ) {
            acc.cash += value;
          } else {
            acc.stocks += value;
          }
          return acc;
        },
        { stocks: 0, bonds: 0, crypto: 0, cash: 0 },
      );

      // Convert to percentages
      const allocation = {
        stocks:
          totalValue > 0
            ? Math.round((allocationTotals.stocks / totalValue) * 100)
            : 0,
        bonds:
          totalValue > 0
            ? Math.round((allocationTotals.bonds / totalValue) * 100)
            : 0,
        crypto:
          totalValue > 0
            ? Math.round((allocationTotals.crypto / totalValue) * 100)
            : 0,
        cash:
          totalValue > 0
            ? Math.round((allocationTotals.cash / totalValue) * 100)
            : 0,
      };

      // Calculate performance from gain/loss data
      const totalGainLoss = data.reduce(
        (sum: number, h: any) => sum + (h.gain_loss || 0),
        0,
      );
      const totalCost = data.reduce(
        (sum: number, h: any) => sum + (h.cost_basis || h.current_value || 0),
        0,
      );
      const overallReturn =
        totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

      return {
        totalValue,
        holdings: data.map((h: any) => ({
          symbol: h.symbol,
          quantity: h.quantity,
          currentValue: h.current_value,
          gainLoss: h.gain_loss,
        })),
        performance: {
          daily: 0, // Requires historical price data - shown as 0 when unavailable
          weekly: 0,
          monthly: 0,
          yearly: Math.round(overallReturn * 100) / 100,
        },
        allocation,
      };
    } catch (error) {
      // Chat engine error:('Failed to get portfolio data:', error);
      return null;
    }
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Chat engine error:('Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Get financial goals
   */
  private async getFinancialGoals(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      // Chat engine error:('Failed to get financial goals:', error);
      return [];
    }
  }

  /**
   * Get risk profile
   */
  private async getRiskProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from("risk_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Chat engine error:('Failed to get risk profile:', error);
      return null;
    }
  }

  /**
   * Analyze investment using available market data.
   * Integrates with AI stock analyst when available.
   */
  private async analyzeInvestment(
    symbol: string,
    context: ChatContext,
  ): Promise<any> {
    try {
      // Attempt to fetch real market data for basic analysis
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: holding } = (await (this.supabase as any)
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", context.userId)
        .eq("symbol", symbol.toUpperCase())
        .single()) as {
        data: {
          current_value?: number;
          cost_basis?: number;
          quantity?: number;
        } | null;
      };

      const currentValue = holding?.current_value || 0;
      const costBasis = holding?.cost_basis || currentValue;
      const gainLoss = currentValue - costBasis;
      const returnPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      // Generate basic recommendation based on performance
      const recommendation =
        returnPct > 20
          ? "HOLD"
          : returnPct > 0
            ? "BUY"
            : returnPct > -10
              ? "HOLD"
              : "REVIEW";
      const confidence = holding ? 0.7 : 0.5;

      return {
        symbol: symbol.toUpperCase(),
        recommendation,
        confidence,
        targetPrice: currentValue * 1.1, // 10% upside target
        currentPrice: currentValue / (holding?.quantity || 1),
        returnPct: Math.round(returnPct * 100) / 100,
        analysis: holding
          ? `${symbol.toUpperCase()} shows ${returnPct >= 0 ? "positive" : "negative"} returns of ${Math.abs(returnPct).toFixed(1)}%. ${recommendation === "BUY" ? "Consider adding to position." : recommendation === "REVIEW" ? "Review position for potential exit." : "Maintain current position."}`
          : `No position data available for ${symbol.toUpperCase()}. Consider researching fundamentals before investing.`,
      };
    } catch (error) {
      // Chat engine error:('Investment analysis error:', error);
      return {
        symbol: symbol.toUpperCase(),
        recommendation: "RESEARCH",
        confidence: 0.5,
        targetPrice: 0,
        analysis: `Unable to analyze ${symbol.toUpperCase()} at this time. Please consult financial research sources.`,
      };
    }
  }

  /**
   * Get trading signal based on available data.
   * Returns signal with strength indicator.
   */
  private async getTradingSignal(
    symbol: string,
    context: ChatContext,
  ): Promise<any> {
    try {
      // Check if user has a position in this symbol
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: holding } = (await (this.supabase as any)
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", context.userId)
        .eq("symbol", symbol.toUpperCase())
        .single()) as {
        data: {
          current_value?: number;
          cost_basis?: number;
          quantity?: number;
        } | null;
      };

      // Generate signal based on position performance
      if (holding) {
        const gainLossPct =
          (holding.cost_basis || 0) > 0
            ? (((holding.current_value || 0) - (holding.cost_basis || 0)) /
                (holding.cost_basis || 1)) *
              100
            : 0;

        let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
        let strength = 50;

        if (gainLossPct < -15) {
          signal = "SELL";
          strength = Math.min(90, 60 + Math.abs(gainLossPct));
        } else if (gainLossPct > 25) {
          signal = "SELL"; // Take profits
          strength = 60;
        } else if (gainLossPct < 5) {
          signal = "BUY";
          strength = 65;
        }

        return {
          symbol: symbol.toUpperCase(),
          signal,
          strength: Math.round(strength),
          timeframe: "1d",
          reason:
            gainLossPct >= 0
              ? `Position up ${gainLossPct.toFixed(1)}%`
              : `Position down ${Math.abs(gainLossPct).toFixed(1)}%`,
        };
      }

      // No position - neutral signal suggesting research
      return {
        symbol: symbol.toUpperCase(),
        signal: "HOLD",
        strength: 50,
        timeframe: "1d",
        reason: "No current position - research before trading",
      };
    } catch (error) {
      // Chat engine error:('Trading signal error:', error);
      return {
        symbol: symbol.toUpperCase(),
        signal: "HOLD",
        strength: 50,
        timeframe: "1d",
        reason: "Insufficient data for signal generation",
      };
    }
  }

  /**
   * Create budget based on income and recommended allocations.
   * Uses 50/30/20 rule as default budget framework.
   */
  private async createBudget(
    parameters: any,
    context: ChatContext,
  ): Promise<any> {
    const monthlyIncome = parameters.monthlyIncome || 0;

    // Standard budget categories using 50/30/20 rule
    const categories =
      monthlyIncome > 0
        ? [
            {
              name: "Housing",
              amount: Math.round(monthlyIncome * 0.28),
              percentage: 28,
              type: "needs",
            },
            {
              name: "Utilities",
              amount: Math.round(monthlyIncome * 0.05),
              percentage: 5,
              type: "needs",
            },
            {
              name: "Food & Groceries",
              amount: Math.round(monthlyIncome * 0.12),
              percentage: 12,
              type: "needs",
            },
            {
              name: "Transportation",
              amount: Math.round(monthlyIncome * 0.05),
              percentage: 5,
              type: "needs",
            },
            {
              name: "Healthcare",
              amount: Math.round(monthlyIncome * 0.05),
              percentage: 5,
              type: "needs",
            },
            {
              name: "Entertainment",
              amount: Math.round(monthlyIncome * 0.1),
              percentage: 10,
              type: "wants",
            },
            {
              name: "Shopping",
              amount: Math.round(monthlyIncome * 0.1),
              percentage: 10,
              type: "wants",
            },
            {
              name: "Dining Out",
              amount: Math.round(monthlyIncome * 0.05),
              percentage: 5,
              type: "wants",
            },
            {
              name: "Savings",
              amount: Math.round(monthlyIncome * 0.1),
              percentage: 10,
              type: "savings",
            },
            {
              name: "Debt Payoff",
              amount: Math.round(monthlyIncome * 0.05),
              percentage: 5,
              type: "savings",
            },
            {
              name: "Investments",
              amount: Math.round(monthlyIncome * 0.05),
              percentage: 5,
              type: "savings",
            },
          ]
        : [];

    return {
      monthlyIncome,
      categories,
      totalNeeds: categories
        .filter((c) => c.type === "needs")
        .reduce((sum, c) => sum + c.amount, 0),
      totalWants: categories
        .filter((c) => c.type === "wants")
        .reduce((sum, c) => sum + c.amount, 0),
      totalSavings: categories
        .filter((c) => c.type === "savings")
        .reduce((sum, c) => sum + c.amount, 0),
      created: true,
      framework: "50/30/20 Budget Rule",
    };
  }

  /**
   * Optimize debt payoff strategy.
   * Analyzes debt accounts and recommends optimal payoff approach.
   */
  private async optimizeDebt(userId: string): Promise<any> {
    try {
      // Fetch user's debt accounts
      const { data: accounts } = await this.supabase
        .from("financial_accounts")
        .select("*")
        .eq("user_id", userId)
        .in("account_type", ["credit_card", "loan", "line_of_credit"]);

      if (!accounts || accounts.length === 0) {
        return {
          strategy: "none",
          estimatedPayoffTime: 0,
          totalInterestSaved: 0,
          message: "No debt accounts found. Great job being debt-free!",
        };
      }

      const totalDebt = accounts.reduce(
        (sum: number, acc: any) => sum + (acc.balance || 0),
        0,
      );
      const avgApr =
        accounts.reduce((sum: number, acc: any) => sum + (acc.apr || 0), 0) /
        accounts.length;

      // Recommend avalanche for high APR, snowball for motivation
      const strategy = avgApr > 15 ? "avalanche" : "snowball";
      const estimatedPayoffTime = Math.ceil(totalDebt / 500); // Assuming $500/month extra payment
      const totalInterestSaved = Math.round(
        totalDebt * (avgApr / 100) * (estimatedPayoffTime / 12) * 0.3,
      );

      return {
        strategy,
        estimatedPayoffTime,
        totalInterestSaved,
        totalDebt: Math.round(totalDebt),
        accountCount: accounts.length,
        avgApr: Math.round(avgApr * 100) / 100,
        recommendation:
          strategy === "avalanche"
            ? "Pay off highest interest rate debts first to minimize total interest paid."
            : "Pay off smallest balances first to build momentum and motivation.",
      };
    } catch (error) {
      // Chat engine error:('Debt optimization error:', error);
      return {
        strategy: "avalanche",
        estimatedPayoffTime: 24,
        totalInterestSaved: 0,
        message:
          "Unable to analyze debt accounts. Using default avalanche strategy recommendation.",
      };
    }
  }

  /**
   * Assess financial risk based on user's portfolio and accounts.
   * Returns risk score and recommendations.
   */
  private async assessRisk(context: ChatContext): Promise<any> {
    try {
      // Fetch portfolio data for risk assessment
      const { data: holdings } = await this.supabase
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", context.userId);

      const { data: debts } = await this.supabase
        .from("financial_accounts")
        .select("balance, apr")
        .eq("user_id", context.userId)
        .in("account_type", ["credit_card", "loan"]);

      const totalPortfolio =
        holdings?.reduce(
          (sum: number, h: any) => sum + (h.current_value || 0),
          0,
        ) || 0;
      const totalDebt =
        debts?.reduce((sum: number, d: any) => sum + (d.balance || 0), 0) || 0;
      const highAprdDebt =
        debts
          ?.filter((d: any) => (d.apr || 0) > 15)
          .reduce((sum: number, d: any) => sum + (d.balance || 0), 0) || 0;

      // Calculate risk factors
      const debtToAssetRatio =
        totalPortfolio > 0
          ? (totalDebt / totalPortfolio) * 100
          : totalDebt > 0
            ? 100
            : 0;
      const concentrationRisk = holdings && holdings.length < 5 ? 20 : 0;
      const highInterestRisk =
        highAprdDebt > 5000 ? 15 : highAprdDebt > 0 ? 8 : 0;

      const riskScore = Math.min(
        100,
        Math.max(
          0,
          50 +
            (debtToAssetRatio > 50 ? 20 : 0) +
            concentrationRisk +
            highInterestRisk,
        ),
      );

      const category =
        riskScore < 40
          ? "conservative"
          : riskScore < 70
            ? "moderate"
            : "aggressive";

      const recommendations: string[] = [];
      if (concentrationRisk > 0)
        recommendations.push(
          "Diversify portfolio across more holdings to reduce concentration risk",
        );
      if (highInterestRisk > 0)
        recommendations.push(
          "Prioritize paying down high-interest debt (>15% APR)",
        );
      if (debtToAssetRatio > 50)
        recommendations.push("Work on reducing debt-to-asset ratio below 50%");
      if (recommendations.length === 0)
        recommendations.push(
          "Maintain current balanced approach to risk management",
        );

      return {
        riskScore: Math.round(riskScore),
        category,
        recommendations,
        factors: {
          debtToAssetRatio: Math.round(debtToAssetRatio),
          portfolioDiversification: holdings?.length || 0,
          highInterestDebt: Math.round(highAprdDebt),
        },
      };
    } catch (error) {
      // Chat engine error:('Risk assessment error:', error);
      return {
        riskScore: 65,
        category: "moderate",
        recommendations: [
          "Complete your financial profile to get personalized risk assessment",
        ],
      };
    }
  }

  /**
   * Generate financial report of specified type.
   * Returns report metadata with data for rendering.
   */
  private async generateReport(
    type: string,
    context: ChatContext,
  ): Promise<any> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const generatedAt = new Date().toISOString();

    // Fetch relevant data based on report type
    const reportData: any = { type, reportId, generatedAt };

    try {
      switch (type.toLowerCase()) {
        case "portfolio":
        case "investment":
          const portfolio = await this.getPortfolioData(context.userId);
          reportData.data = portfolio;
          reportData.title = "Portfolio Performance Report";
          break;

        case "spending":
        case "expense":
          const { data: transactions } = await this.supabase
            .from("transactions")
            .select("*")
            .eq("user_id", context.userId)
            .gte(
              "date",
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            )
            .order("date", { ascending: false });

          const totalSpending =
            transactions?.reduce(
              (sum: number, t: any) => sum + Math.abs(t.amount || 0),
              0,
            ) || 0;
          reportData.data = {
            transactions: transactions?.slice(0, 50),
            totalSpending,
            period: "30 days",
          };
          reportData.title = "Monthly Spending Report";
          break;

        case "networth":
        case "net-worth":
          const assets = await this.getPortfolioData(context.userId);
          const { data: accounts } = await this.supabase
            .from("financial_accounts")
            .select("balance, account_type")
            .eq("user_id", context.userId);

          const totalAssets =
            (assets?.totalValue || 0) +
            (accounts
              ?.filter((a: any) => a.balance > 0)
              .reduce((sum: number, a: any) => sum + a.balance, 0) || 0);
          const totalLiabilities =
            accounts
              ?.filter(
                (a: any) =>
                  a.balance < 0 ||
                  ["credit_card", "loan"].includes(a.account_type),
              )
              .reduce(
                (sum: number, a: any) => sum + Math.abs(a.balance || 0),
                0,
              ) || 0;

          reportData.data = {
            totalAssets,
            totalLiabilities,
            netWorth: totalAssets - totalLiabilities,
          };
          reportData.title = "Net Worth Report";
          break;

        default:
          reportData.title = "Financial Summary Report";
          reportData.data = { message: "General financial overview" };
      }

      return {
        ...reportData,
        generated: true,
        url: `/reports/${reportId}`,
        downloadAvailable: true,
      };
    } catch (error) {
      // Chat engine error:('Report generation error:', error);
      return {
        type,
        generated: false,
        error: "Unable to generate report at this time",
      };
    }
  }

  /**
   * Track goals
   */
  private async trackGoals(userId: string): Promise<any> {
    const goals = await this.getFinancialGoals(userId);
    return {
      goals,
      onTrack: goals.filter((g: any) => g.progress >= 50).length,
      total: goals.length,
    };
  }

  /**
   * Analyze spending patterns and provide insights.
   * Returns spending breakdown by category with recommendations.
   */
  private async analyzeSpending(userId: string, parameters: any): Promise<any> {
    try {
      const days = parameters.days || 30;
      const startDate = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data: transactions } = await this.supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lt("amount", 0); // Expenses are negative

      if (!transactions || transactions.length === 0) {
        return {
          totalSpending: 0,
          categories: [],
          insights: [
            "No spending data available for the selected period. Link your accounts to track spending.",
          ],
          period: `${days} days`,
        };
      }

      // Group by category
      const categoryTotals: Record<string, number> = {};
      transactions.forEach((t: any) => {
        const category = t.category || "Uncategorized";
        categoryTotals[category] =
          (categoryTotals[category] || 0) + Math.abs(t.amount);
      });

      const totalSpending = Object.values(categoryTotals).reduce(
        (sum, val) => sum + val,
        0,
      );

      const categories = Object.entries(categoryTotals)
        .map(([name, amount]) => ({
          name,
          amount: Math.round(amount * 100) / 100,
          percentage: Math.round((amount / totalSpending) * 100),
        }))
        .sort((a, b) => b.amount - a.amount);

      // Generate insights
      const insights: string[] = [];
      const topCategory = categories[0];
      if (topCategory) {
        insights.push(
          `Your highest spending category is ${topCategory.name} at ${topCategory.percentage}% of total spending.`,
        );
      }
      if (categories.length > 1 && categories[0].percentage > 40) {
        insights.push(
          `Consider reducing ${categories[0].name} spending - it represents over 40% of your budget.`,
        );
      }
      const avgDaily = totalSpending / days;
      insights.push(
        `You're spending an average of $${avgDaily.toFixed(2)} per day.`,
      );

      return {
        totalSpending: Math.round(totalSpending * 100) / 100,
        categories,
        insights,
        period: `${days} days`,
        transactionCount: transactions.length,
      };
    } catch (error) {
      // Chat engine error:('Spending analysis error:', error);
      return {
        totalSpending: 0,
        categories: [],
        insights: ["Unable to analyze spending at this time."],
      };
    }
  }

  /**
   * Recommend personalized financial strategy.
   * Based on user's risk profile, goals, and current situation.
   */
  private async recommendStrategy(context: ChatContext): Promise<any> {
    try {
      const [riskProfile, goals, portfolio] = await Promise.all([
        this.getRiskProfile(context.userId),
        this.getFinancialGoals(context.userId),
        this.getPortfolioData(context.userId),
      ]);

      // Determine strategy based on risk tolerance and goals
      const riskTolerance = riskProfile?.risk_tolerance || "moderate";
      const hasRetirementGoal = goals?.some(
        (g: any) => g.type === "retirement",
      );
      const hasShortTermGoals = goals?.some((g: any) => {
        const targetDate = new Date(g.target_date);
        return (
          targetDate.getTime() - Date.now() < 2 * 365 * 24 * 60 * 60 * 1000
        ); // < 2 years
      });

      let strategy = "balanced";
      let reasoning =
        "Based on your moderate risk profile and diversified goals";
      const actions: string[] = [];

      if (riskTolerance === "conservative" || hasShortTermGoals) {
        strategy = "conservative";
        reasoning =
          "Given your conservative risk tolerance or near-term goals, preserving capital is prioritized";
        actions.push("Shift 60% of portfolio to bonds and stable assets");
        actions.push("Maintain 6-month emergency fund in high-yield savings");
        actions.push("Focus on dividend-paying stocks for income");
      } else if (riskTolerance === "aggressive" && !hasShortTermGoals) {
        strategy = "growth";
        reasoning =
          "Your higher risk tolerance and long time horizon support a growth-focused approach";
        actions.push("Allocate 80% to growth stocks and emerging markets");
        actions.push("Consider small-cap and technology sector exposure");
        actions.push("Reinvest all dividends for compound growth");
      } else {
        actions.push("Maintain 60/40 stock/bond allocation");
        actions.push("Rebalance quarterly to target allocation");
        actions.push("Dollar-cost average into positions");
      }

      if (hasRetirementGoal) {
        actions.push(
          "Maximize tax-advantaged retirement account contributions",
        );
      }

      return {
        strategy,
        reasoning,
        actions,
        riskProfile: riskTolerance,
        goalsConsidered: goals?.length || 0,
        portfolioValue: portfolio?.totalValue || 0,
      };
    } catch (error) {
      // Chat engine error:('Strategy recommendation error:', error);
      return {
        strategy: "balanced",
        reasoning:
          "Default recommendation - complete your profile for personalized strategy",
        actions: [
          "Set up your risk profile",
          "Define your financial goals",
          "Connect your investment accounts",
        ],
      };
    }
  }
}
