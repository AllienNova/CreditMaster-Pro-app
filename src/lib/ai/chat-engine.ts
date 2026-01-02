/**
 * Financial Chat Engine
 *
 * Core orchestrator for the AI-powered financial chat system
 * Manages conversations, integrates with AI models, and coordinates all chat operations
 */

import { AIMLService } from '@/lib/aiml-service';
import { chatDbService } from './chat-db-service';
import { getIntentRecognizer } from './intent-recognizer';
import { getEntityExtractor } from './entity-extractor';
import { getActionExecutor } from './action-executor';
import { ChatError } from './types/chat.types';
import type {
  ChatSession,
  ChatMessage,
  ChatResponse,
  SendMessageRequest,
  SendMessageOptions,
  Intent,
  ExtractedEntities,
  ConversationContext,
  FinancialSnapshot,
  PromptTemplate,
  BuiltPrompt,
  BuildPromptOptions,
  IntentType,
  MessageRole,
  ActionResult,
} from './types/chat.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_SYSTEM_PROMPT = `You are a professional financial advisor assistant for CreditMaster Pro, a comprehensive financial intelligence platform.

Your role is to help users with:
- Credit repair and improvement strategies
- Budget creation and management
- Financial goal planning and tracking
- Debt management and payoff strategies
- Investment advice and portfolio analysis
- Spending analysis and insights
- Tax planning optimization

Guidelines:
1. Be professional, clear, and empathetic
2. Ask clarifying questions when needed
3. Provide actionable, specific advice
4. Reference the user's financial data when available
5. Suggest relevant actions (create budget, set goal, etc.)
6. Be transparent about what you can and cannot do
7. Never make guarantees about financial outcomes
8. Comply with financial advice regulations

When you identify a clear user intent to perform an action (like creating a budget or goal), confirm the details and offer to execute it.`;

const MODEL_CONFIG = {
  chat: 'openai/gpt-4o',                  // Fast, cost-effective for chat
  chatAlternate: 'google/gemini-2.0-flash', // Alternative chat model
  intent: 'openai/gpt-4o-mini',           // Quick intent recognition
  extract: 'openai/gpt-4o-mini',          // Entity extraction
  complex: 'anthropic/claude-4.5-sonnet', // Complex financial advice
  complexAlternate: 'x-ai/grok-2-1212',   // Alternative complex reasoning
  creative: 'google/gemini-2.5-pro',      // Creative financial planning
};

// ============================================================================
// CHAT ENGINE
// ============================================================================

export class FinancialChatEngine {
  private aimlService: AIMLService;

  constructor() {
    this.aimlService = new AIMLService();
  }

  // ==========================================================================
  // MAIN CHAT OPERATIONS
  // ==========================================================================

  /**
   * Send a message in a chat session
   */
  async sendMessage(
    userId: string,
    request: SendMessageRequest,
    options: SendMessageOptions = {}
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // 1. Get or validate session
      const session = await chatDbService.getSession(request.sessionId, userId);
      if (!session) {
        throw new ChatError(
          'Session not found',
          'SESSION_NOT_FOUND',
          { sessionId: request.sessionId }
        );
      }

      if (session.status !== 'active') {
        throw new ChatError(
          'Session is not active',
          'SESSION_NOT_FOUND',
          { status: session.status }
        );
      }

      // 2. Validate message length
      if (request.message.length > 10000) {
        throw new ChatError(
          'Message too long (max 10,000 characters)',
          'MESSAGE_TOO_LONG'
        );
      }

      // 3. Create user message record
      const userMessage = await chatDbService.createMessage(
        request.sessionId,
        userId,
        {
          sessionId: request.sessionId,
          userId,
          role: 'user',
          content: request.message,
          intent: null,
          entities: null,
          actionTaken: null,
          actionResult: null,
          referencedData: null,
          tokensUsed: this.estimateTokens(request.message),
          modelUsed: null,
          latencyMs: 0,
          feedbackRating: null,
          feedbackText: null,
        }
      );

      // 4. Build conversation context
      const context = await this.buildContext(session, userId);

      // 5. Build prompt with context
      const prompt = await this.buildPrompt(
        request.message,
        context,
        options
      );

      // 6. Get AI response
      const aiResponse = await this.getAIResponse(prompt, session.sessionType);

      // 7. Parse intent and entities (if needed)
      const intent = await this.recognizeIntent(request.message, aiResponse.content, context);
      const entities = await this.extractEntities(request.message, intent);

      // 8. Execute action if requested and intent is clear
      let actionResult: ActionResult | null = null;
      if (options.executeAction && intent.confidence > 0.8 && !intent.requiresConfirmation) {
        const actionExecutor = getActionExecutor();

        // Validate action can be executed
        const validation = actionExecutor.canExecute(intent.type, entities);

        if (validation.canExecute) {
          try {
            actionResult = await actionExecutor.execute(
              userId,
              intent.type,
              entities,
              context
            );
          } catch (error) {
            console.error('Action execution failed:', error);
            actionResult = {
              success: false,
              type: intent.type,
              data: null,
              message: 'Failed to execute action',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        } else {
          actionResult = {
            success: false,
            type: intent.type,
            data: null,
            message: validation.reason || 'Cannot execute action',
            error: validation.missingData?.join(', '),
          };
        }
      }

      // 9. Calculate latency
      const latency = Date.now() - startTime;

      // 10. Create assistant message record
      const assistantMessage = await chatDbService.createMessage(
        request.sessionId,
        userId,
        {
          sessionId: request.sessionId,
          userId,
          role: 'assistant',
          content: aiResponse.content,
          intent: intent.type,
          entities,
          actionTaken: null,
          actionResult,
          referencedData: context.financialContext ? { snapshot: context.financialContext } : null,
          tokensUsed: aiResponse.tokensUsed,
          modelUsed: aiResponse.model,
          latencyMs: latency,
          feedbackRating: null,
          feedbackText: null,
        }
      );

      // 11. Generate response suggestions
      const suggestions = this.generateSuggestions(intent, context);
      const relatedQuestions = this.generateRelatedQuestions(session.sessionType, intent);

      return {
        message: assistantMessage,
        intent,
        entities,
        actionNeeded: intent.requiresConfirmation,
        actionResult,
        suggestions,
        relatedQuestions,
      };
    } catch (error) {
      // Log error and re-throw
      console.error('Chat engine error:', error);

      if (error instanceof ChatError) {
        throw error;
      }

      throw new ChatError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'AI_SERVICE_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Stream a message response (for real-time UI updates)
   */
  async streamMessage(
    userId: string,
    request: SendMessageRequest,
    onChunk: (chunk: string) => void
  ): Promise<ChatResponse> {
    // TODO: Implement streaming support
    // For now, fall back to non-streaming
    return this.sendMessage(userId, request, {
      stream: false,
    });
  }

  // ==========================================================================
  // CONTEXT BUILDING
  // ==========================================================================

  /**
   * Build conversation context from session and user data
   */
  private async buildContext(
    session: ChatSession,
    userId: string
  ): Promise<ConversationContext> {
    // Get recent messages for context
    const recentMessages = await chatDbService.getRecentMessages(
      session.id,
      userId,
      10
    );

    // Get financial snapshot if available
    const financialContext = session.financialSnapshot;

    return {
      userId,
      sessionId: session.id,
      recentMessages,
      financialContext,
      pendingAction: null, // Will be populated by action executor
      conversationSummary: this.summarizeConversation(recentMessages),
      topics: this.extractTopics(recentMessages),
      metadata: session.context,
    };
  }

  /**
   * Build AI prompt with context
   */
  private async buildPrompt(
    userMessage: string,
    context: ConversationContext,
    options: SendMessageOptions
  ): Promise<BuiltPrompt> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // 1. System prompt
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;

    // Add financial context if available
    if (options.includeContext !== false && context.financialContext) {
      systemPrompt += '\n\n' + this.buildFinancialContextPrompt(context.financialContext);
    }

    // Add conversation summary if available
    if (context.conversationSummary) {
      systemPrompt += '\n\nConversation Summary:\n' + context.conversationSummary;
    }

    messages.push({ role: 'system', content: systemPrompt });

    // 2. Add recent message history
    if (options.includeContext !== false && context.recentMessages.length > 0) {
      const maxHistory = options.maxTokens ? Math.min(5, options.maxTokens / 500) : 5;
      const recentToInclude = context.recentMessages.slice(-maxHistory);

      for (const msg of recentToInclude) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // 3. Add current user message
    messages.push({ role: 'user', content: userMessage });

    // 4. Estimate tokens
    const tokenEstimate = messages.reduce(
      (sum, msg) => sum + this.estimateTokens(msg.content),
      0
    );

    return {
      messages,
      tokenEstimate,
      includedContext: {
        financialSnapshot: !!context.financialContext,
        knowledge: false, // Knowledge base not yet implemented
        historyMessages: context.recentMessages.length,
      },
    };
  }

  /**
   * Build financial context prompt section
   */
  private buildFinancialContextPrompt(snapshot: FinancialSnapshot): string {
    const parts: string[] = ['User\'s Current Financial Snapshot:'];

    parts.push(`- Net Worth: $${snapshot.netWorth.toLocaleString()}`);
    parts.push(`- Monthly Income: $${snapshot.monthlyIncome.toLocaleString()}`);
    parts.push(`- Monthly Expenses: $${snapshot.monthlyExpenses.toLocaleString()}`);
    parts.push(`- Monthly Cash Flow: $${snapshot.cashFlow.toLocaleString()}`);
    parts.push(`- Financial Health Score: ${snapshot.healthScore}/100`);
    parts.push(`- Total Debt: $${snapshot.totalDebt.toLocaleString()}`);
    parts.push(`- Total Savings: $${snapshot.totalSavings.toLocaleString()}`);
    parts.push(`- Active Goals: ${snapshot.activeGoals}`);

    if (snapshot.budgets.length > 0) {
      parts.push('\nBudgets:');
      for (const budget of snapshot.budgets.slice(0, 5)) {
        const utilization = ((budget.spent / budget.limit) * 100).toFixed(0);
        parts.push(
          `  - ${budget.category}: $${budget.spent}/$${budget.limit} (${utilization}% used)`
        );
      }
    }

    return parts.join('\n');
  }

  // ==========================================================================
  // AI RESPONSE
  // ==========================================================================

  /**
   * Get AI response from AIML service
   */
  private async getAIResponse(
    prompt: BuiltPrompt,
    sessionType: string
  ): Promise<{ content: string; tokensUsed: number; model: string }> {
    // Select model based on complexity
    const model = sessionType === 'general' ? MODEL_CONFIG.chat : MODEL_CONFIG.complex;

    try {
      const response = await this.aimlService.chat(model, prompt.messages, {
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      return {
        content,
        tokensUsed,
        model,
      };
    } catch (error) {
      console.error('AI response error:', error);
      throw new ChatError(
        'Failed to get AI response',
        'AI_SERVICE_ERROR',
        { error }
      );
    }
  }

  // ==========================================================================
  // INTENT & ENTITY RECOGNITION
  // ==========================================================================

  /**
   * Recognize user intent from message
   * Uses AI-powered IntentRecognizer for accurate classification
   */
  private async recognizeIntent(
    userMessage: string,
    aiResponse: string,
    context?: ConversationContext
  ): Promise<Intent> {
    const intentRecognizer = getIntentRecognizer();

    // Build conversation context for intent recognizer
    const intentContext = {
      recentIntents: context?.recentMessages
        .filter((m) => m.intent)
        .map((m) => m.intent!)
        .slice(-5) || [],
      pendingAction: context?.pendingAction?.intent || null,
    };

    try {
      return await intentRecognizer.recognize(userMessage, intentContext);
    } catch (error) {
      console.error('Intent recognition failed, using fallback:', error);

      // Fallback to simple keyword detection
      return {
        type: 'general_question',
        confidence: 0.5,
        reason: 'Intent recognition failed, defaulting to general question',
        requiresConfirmation: false,
        metadata: {},
      };
    }
  }

  /**
   * Extract entities from message
   * Uses AI-powered EntityExtractor for comprehensive extraction
   */
  private async extractEntities(
    userMessage: string,
    intent: Intent
  ): Promise<ExtractedEntities | null> {
    const entityExtractor = getEntityExtractor();

    try {
      return await entityExtractor.extract(userMessage, intent.type);
    } catch (error) {
      console.error('Entity extraction failed:', error);
      // Return null on failure - non-critical
      return null;
    }
  }

  // ==========================================================================
  // SUGGESTIONS & RELATED QUESTIONS
  // ==========================================================================

  /**
   * Generate contextual suggestions
   */
  private generateSuggestions(intent: Intent, context: ConversationContext): string[] {
    const suggestions: string[] = [];

    switch (intent.type) {
      case 'create_budget':
        suggestions.push('Show me my spending categories');
        suggestions.push('Help me set realistic budget limits');
        break;
      case 'create_goal':
        suggestions.push('What goals should I prioritize?');
        suggestions.push('Show me goal templates');
        break;
      case 'analyze_spending':
        suggestions.push('Compare this month to last month');
        suggestions.push('Show unusual transactions');
        break;
      case 'debt_strategy':
        suggestions.push('Calculate debt payoff timeline');
        suggestions.push('Compare avalanche vs snowball methods');
        break;
      default:
        suggestions.push('Tell me about my financial health');
        suggestions.push('What can you help me with?');
    }

    return suggestions;
  }

  /**
   * Generate related questions
   */
  private generateRelatedQuestions(sessionType: string, intent: Intent): string[] {
    const questions: string[] = [];

    if (sessionType === 'budget') {
      questions.push('How can I reduce my monthly expenses?');
      questions.push('What percentage should I allocate to savings?');
    } else if (sessionType === 'debt') {
      questions.push('Should I focus on high-interest debt first?');
      questions.push('Can I negotiate lower interest rates?');
    } else if (sessionType === 'investing') {
      questions.push('What\'s my risk tolerance?');
      questions.push('How should I diversify my portfolio?');
    } else {
      questions.push('How can I improve my credit score?');
      questions.push('What are smart saving strategies?');
    }

    return questions;
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Summarize recent conversation
   */
  private summarizeConversation(messages: ChatMessage[]): string | null {
    if (messages.length < 3) return null;

    // Simple summary: extract key topics
    const topics = messages
      .filter((m) => m.intent)
      .map((m) => m.intent)
      .filter((intent, index, self) => self.indexOf(intent) === index)
      .join(', ');

    if (!topics) return null;

    return `Recent topics discussed: ${topics}`;
  }

  /**
   * Extract conversation topics
   */
  private extractTopics(messages: ChatMessage[]): string[] {
    const topics = new Set<string>();

    for (const message of messages) {
      if (message.intent) {
        topics.add(message.intent);
      }
    }

    return Array.from(topics);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let chatEngineInstance: FinancialChatEngine | null = null;

export function getChatEngine(): FinancialChatEngine {
  if (!chatEngineInstance) {
    chatEngineInstance = new FinancialChatEngine();
  }
  return chatEngineInstance;
}

export default getChatEngine();
