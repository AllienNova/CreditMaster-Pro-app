/**
 * Intent Recognizer
 *
 * AI-powered intent classification for financial chat messages
 * Uses GPT-4o-mini for fast, cost-effective intent recognition
 */

import { AIMLService } from '@/lib/aiml-service';
import type { Intent, IntentType } from './types/chat.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const INTENT_MODEL = 'openai/gpt-4o-mini';

const INTENT_SYSTEM_PROMPT = `You are an intent classification expert for a financial advisory chatbot.

Your task is to analyze user messages and classify them into one of these intent categories:

1. **create_goal** - User wants to create a financial goal
   - Examples: "I want to save $10,000", "Help me set a retirement goal", "Create a goal for vacation"

2. **create_budget** - User wants to create or modify a budget
   - Examples: "Create a budget for groceries", "I need help budgeting", "Set up monthly budget"

3. **analyze_spending** - User wants to analyze their spending patterns
   - Examples: "Where does my money go?", "Show me my spending", "Analyze my expenses"

4. **get_recommendations** - User wants financial advice or recommendations
   - Examples: "What should I do?", "Give me advice", "How can I improve?"

5. **debt_strategy** - User wants help with debt management
   - Examples: "How do I pay off my debt?", "Debt snowball vs avalanche", "Help with credit cards"

6. **account_summary** - User wants an overview of their finances
   - Examples: "Show me my accounts", "Financial overview", "How am I doing?"

7. **investment_advice** - User wants investment guidance
   - Examples: "Should I invest in stocks?", "Portfolio recommendations", "What about crypto?"

8. **credit_score** - User wants credit score information
   - Examples: "What's my credit score?", "How to improve credit?", "Credit report help"

9. **general_question** - General financial education questions
   - Examples: "What is compound interest?", "Explain 401k", "How does tax work?"

10. **greeting** - Conversation starters, greetings
    - Examples: "Hello", "Hi there", "Good morning", "Hey"

11. **execute_action** - User confirms they want to execute a pending action
    - Examples: "Yes, do it", "Confirm", "Go ahead", "Create it"

12. **cancel_action** - User wants to cancel a pending action
    - Examples: "No, cancel", "Never mind", "Don't do that", "Stop"

13. **clarification** - User is providing more information or clarifying
    - Examples: "I mean...", "Actually...", "Let me clarify..."

14. **feedback** - User is providing feedback about the service
    - Examples: "This is helpful", "That didn't work", "Great job"

Respond ONLY with a JSON object in this exact format:
{
  "intent": "intent_name",
  "confidence": 0.95,
  "reason": "Brief explanation of why this intent was chosen",
  "requiresConfirmation": false,
  "extractedDetails": {}
}

Rules:
- confidence must be between 0 and 1
- requiresConfirmation should be true if the action needs user confirmation before execution
- extractedDetails can contain any relevant information from the message
- If uncertain, use the intent with highest probability but lower the confidence score`;

const INTENT_EXAMPLES = [
  {
    user: 'I want to save $5000 for a vacation by next summer',
    assistant: JSON.stringify({
      intent: 'create_goal',
      confidence: 0.95,
      reason: 'Clear goal creation with specific amount and deadline',
      requiresConfirmation: true,
      extractedDetails: {
        amount: 5000,
        purpose: 'vacation',
        deadline: 'next summer',
      },
    }),
  },
  {
    user: 'Show me where I spent money last month',
    assistant: JSON.stringify({
      intent: 'analyze_spending',
      confidence: 0.92,
      reason: 'User wants to analyze past spending patterns',
      requiresConfirmation: false,
      extractedDetails: {
        timeframe: 'last month',
      },
    }),
  },
  {
    user: 'Should I pay off my credit card or save for emergency fund?',
    assistant: JSON.stringify({
      intent: 'get_recommendations',
      confidence: 0.88,
      reason: 'User is asking for advice on financial priorities',
      requiresConfirmation: false,
      extractedDetails: {
        options: ['pay off credit card', 'save for emergency fund'],
      },
    }),
  },
  {
    user: 'Yes, create that budget',
    assistant: JSON.stringify({
      intent: 'execute_action',
      confidence: 0.98,
      reason: 'Clear confirmation to execute pending action',
      requiresConfirmation: false,
      extractedDetails: {
        action: 'create_budget',
      },
    }),
  },
  {
    user: 'What is compound interest?',
    assistant: JSON.stringify({
      intent: 'general_question',
      confidence: 0.96,
      reason: 'Educational question about financial concept',
      requiresConfirmation: false,
      extractedDetails: {
        topic: 'compound interest',
      },
    }),
  },
];

// ============================================================================
// INTENT RECOGNIZER
// ============================================================================

export class IntentRecognizer {
  private aimlService: AIMLService;
  private cache: Map<string, Intent>;

  constructor() {
    this.aimlService = new AIMLService();
    this.cache = new Map();
  }

  /**
   * Recognize intent from user message
   */
  async recognize(
    userMessage: string,
    conversationContext?: {
      recentIntents?: IntentType[];
      pendingAction?: IntentType | null;
    }
  ): Promise<Intent> {
    // Check cache first
    const cacheKey = this.getCacheKey(userMessage, conversationContext);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build messages for AI
    const messages = this.buildIntentPrompt(userMessage, conversationContext);

    try {
      // Call AI model
      const response = await this.aimlService.chat(INTENT_MODEL, messages, {
        temperature: 0.3, // Lower temperature for more consistent classification
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '';

      // Parse JSON response
      const result = this.parseIntentResponse(content);

      // Validate and normalize
      const intent = this.validateIntent(result);

      // Cache result
      this.cache.set(cacheKey, intent);

      // Limit cache size
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      return intent;
    } catch (_error) {
      // IntentRecognizer error: Intent recognition error
      void _error;

      // Fallback to rule-based classification
      return this.fallbackRecognition(userMessage, conversationContext);
    }
  }

  /**
   * Batch recognize intents for multiple messages
   */
  async recognizeBatch(messages: string[]): Promise<Intent[]> {
    const results = await Promise.all(
      messages.map((msg) => this.recognize(msg))
    );
    return results;
  }

  // ==========================================================================
  // PROMPT BUILDING
  // ==========================================================================

  /**
   * Build prompt for intent recognition
   */
  private buildIntentPrompt(
    userMessage: string,
    conversationContext?: {
      recentIntents?: IntentType[];
      pendingAction?: IntentType | null;
    }
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    // System prompt
    let systemPrompt = INTENT_SYSTEM_PROMPT;

    // Add context if available
    if (conversationContext) {
      if (
        conversationContext.recentIntents &&
        conversationContext.recentIntents.length > 0
      ) {
        systemPrompt += `\n\nRecent conversation intents: ${conversationContext.recentIntents.join(', ')}`;
      }

      if (conversationContext.pendingAction) {
        systemPrompt += `\n\nThere is a pending action: ${conversationContext.pendingAction}`;
        systemPrompt +=
          '\nIf the user says "yes", "confirm", "do it", etc., classify as execute_action';
        systemPrompt +=
          '\nIf the user says "no", "cancel", "never mind", etc., classify as cancel_action';
      }
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add few-shot examples
    for (const example of INTENT_EXAMPLES) {
      messages.push({ role: 'user', content: example.user });
      messages.push({ role: 'assistant', content: example.assistant });
    }

    // Add user message
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  // ==========================================================================
  // RESPONSE PARSING
  // ==========================================================================

  /**
   * Parse AI response to intent object
   */
  private parseIntentResponse(content: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const json = JSON.parse(jsonMatch[0]);
      return json;
    } catch (error) {
      // IntentRecognizer error: Failed to parse intent response
      throw error;
    }
  }

  /**
   * Validate and normalize intent response
   */
  private validateIntent(result: any): Intent {
    // Validate required fields
    if (!result.intent || typeof result.intent !== 'string') {
      throw new Error('Invalid intent: missing or invalid intent field');
    }

    if (
      typeof result.confidence !== 'number' ||
      result.confidence < 0 ||
      result.confidence > 1
    ) {
      result.confidence = 0.5; // Default to medium confidence
    }

    // Normalize intent type
    const type = this.normalizeIntentType(result.intent);

    // Build Intent object
    const intent: Intent = {
      type,
      confidence: result.confidence,
      reason: result.reason || 'Intent recognized by AI',
      requiresConfirmation:
        result.requiresConfirmation ?? this.shouldRequireConfirmation(type),
      metadata: result.extractedDetails || {},
    };

    return intent;
  }

  /**
   * Normalize intent string to IntentType
   */
  private normalizeIntentType(intent: string): IntentType {
    const validIntents: IntentType[] = [
      'create_goal',
      'create_budget',
      'analyze_spending',
      'get_recommendations',
      'debt_strategy',
      'account_summary',
      'investment_advice',
      'credit_score',
      'general_question',
      'greeting',
      'execute_action',
      'cancel_action',
      'clarification',
      'feedback',
    ];

    const normalized = intent.toLowerCase().replace(/-/g, '_');

    if (validIntents.includes(normalized as IntentType)) {
      return normalized as IntentType;
    }

    // Default to general_question if invalid
    // IntentRecognizer warning: Unknown intent type, defaulting to general_question
    return 'general_question';
  }

  /**
   * Determine if intent should require confirmation
   */
  private shouldRequireConfirmation(type: IntentType): boolean {
    // Actions that modify data should require confirmation
    const requiresConfirmation: IntentType[] = [
      'create_goal',
      'create_budget',
      'execute_action',
    ];

    return requiresConfirmation.includes(type);
  }

  // ==========================================================================
  // FALLBACK RECOGNITION
  // ==========================================================================

  /**
   * Rule-based fallback when AI fails
   */
  private fallbackRecognition(
    userMessage: string,
    conversationContext?: {
      recentIntents?: IntentType[];
      pendingAction?: IntentType | null;
    }
  ): Intent {
    const lower = userMessage.toLowerCase().trim();

    // Check for confirmation/cancellation first
    if (conversationContext?.pendingAction) {
      if (this.isConfirmation(lower)) {
        return {
          type: 'execute_action',
          confidence: 0.85,
          reason: 'Confirmation keyword detected',
          requiresConfirmation: false,
          metadata: { pendingAction: conversationContext.pendingAction },
        };
      }

      if (this.isCancellation(lower)) {
        return {
          type: 'cancel_action',
          confidence: 0.85,
          reason: 'Cancellation keyword detected',
          requiresConfirmation: false,
          metadata: { pendingAction: conversationContext.pendingAction },
        };
      }
    }

    // Greeting
    if (
      /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(lower)
    ) {
      return {
        type: 'greeting',
        confidence: 0.9,
        reason: 'Greeting pattern detected',
        requiresConfirmation: false,
        metadata: {},
      };
    }

    // Create goal
    if (
      /(create|set|make|start).*(goal|target|objective)/i.test(lower) ||
      /save.*for|saving.*for/i.test(lower)
    ) {
      return {
        type: 'create_goal',
        confidence: 0.75,
        reason: 'Goal creation keywords detected',
        requiresConfirmation: true,
        metadata: {},
      };
    }

    // Create budget
    if (
      /(create|set|make|build).*(budget|spending plan)/i.test(lower) ||
      /budget.*for|budgeting/i.test(lower)
    ) {
      return {
        type: 'create_budget',
        confidence: 0.75,
        reason: 'Budget creation keywords detected',
        requiresConfirmation: true,
        metadata: {},
      };
    }

    // Analyze spending
    if (
      /(show|analyze|review|check).*(spending|expenses|transactions)/i.test(
        lower
      ) ||
      /where.*(money|spending)/i.test(lower)
    ) {
      return {
        type: 'analyze_spending',
        confidence: 0.7,
        reason: 'Spending analysis keywords detected',
        requiresConfirmation: false,
        metadata: {},
      };
    }

    // Debt strategy
    if (
      /(pay off|payoff|eliminate).*(debt|loan|credit card)/i.test(lower) ||
      /(debt|loan).*(strategy|plan|help)/i.test(lower)
    ) {
      return {
        type: 'debt_strategy',
        confidence: 0.7,
        reason: 'Debt management keywords detected',
        requiresConfirmation: false,
        metadata: {},
      };
    }

    // Investment advice
    if (
      /(invest|portfolio|stocks|bonds|crypto|etf)/i.test(lower) ||
      /investment.*(advice|recommendation)/i.test(lower)
    ) {
      return {
        type: 'investment_advice',
        confidence: 0.7,
        reason: 'Investment keywords detected',
        requiresConfirmation: false,
        metadata: {},
      };
    }

    // Credit score
    if (/(credit score|credit report|fico|improve credit)/i.test(lower)) {
      return {
        type: 'credit_score',
        confidence: 0.8,
        reason: 'Credit score keywords detected',
        requiresConfirmation: false,
        metadata: {},
      };
    }

    // Account summary
    if (
      /(overview|summary|snapshot).*(account|finance)/i.test(lower) ||
      /(show|display).*(account|balance|net worth)/i.test(lower)
    ) {
      return {
        type: 'account_summary',
        confidence: 0.7,
        reason: 'Account summary keywords detected',
        requiresConfirmation: false,
        metadata: {},
      };
    }

    // Recommendations
    if (/(what should|should i|recommend|advice|suggest)/i.test(lower)) {
      return {
        type: 'get_recommendations',
        confidence: 0.65,
        reason: 'Recommendation request keywords detected',
        requiresConfirmation: false,
        metadata: {},
      };
    }

    // Feedback
    if (
      /(thank|thanks|helpful|great|good job|not working|error|bug)/i.test(lower)
    ) {
      return {
        type: 'feedback',
        confidence: 0.6,
        reason: 'Feedback keywords detected',
        requiresConfirmation: false,
        metadata: {},
      };
    }

    // Default to general question
    return {
      type: 'general_question',
      confidence: 0.5,
      reason: 'No specific intent pattern matched',
      requiresConfirmation: false,
      metadata: {},
    };
  }

  /**
   * Check if message is a confirmation
   */
  private isConfirmation(message: string): boolean {
    const confirmationPatterns = [
      /^(yes|yeah|yep|yup|sure|ok|okay|alright|right|correct|exactly|absolutely|definitely)\b/i,
      /^do it/i,
      /^go ahead/i,
      /^confirm/i,
      /^proceed/i,
      /^create it/i,
      /^make it/i,
    ];

    return confirmationPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Check if message is a cancellation
   */
  private isCancellation(message: string): boolean {
    const cancellationPatterns = [
      /^(no|nope|nah|not|never mind|nevermind|cancel|stop|don't)\b/i,
      /^forget it/i,
      /^cancel that/i,
      /^don't do/i,
    ];

    return cancellationPatterns.some((pattern) => pattern.test(message));
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Generate cache key
   */
  private getCacheKey(
    message: string,
    context?: {
      recentIntents?: IntentType[];
      pendingAction?: IntentType | null;
    }
  ): string {
    let key = message.toLowerCase().trim();

    if (context?.pendingAction) {
      key += `|pending:${context.pendingAction}`;
    }

    return key;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let intentRecognizerInstance: IntentRecognizer | null = null;

export function getIntentRecognizer(): IntentRecognizer {
  if (!intentRecognizerInstance) {
    intentRecognizerInstance = new IntentRecognizer();
  }
  return intentRecognizerInstance;
}

export default getIntentRecognizer();
