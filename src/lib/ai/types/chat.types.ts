/**
 * Financial Chat Assistant Types
 *
 * Type definitions for the AI-powered financial chat system
 */

// ============================================================================
// CHAT SESSION TYPES
// ============================================================================

export type SessionType =
  | 'general'           // General financial questions
  | 'budget'            // Budget-focused conversation
  | 'goals'             // Goal planning conversation
  | 'debt'              // Debt management conversation
  | 'investing'         // Investment advice
  | 'credit_repair'     // Credit repair guidance
  | 'tax_planning';     // Tax optimization

export type SessionStatus = 'active' | 'archived' | 'deleted';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  sessionType: SessionType;
  context: Record<string, unknown>;
  financialSnapshot: FinancialSnapshot | null;
  messageCount: number;
  totalTokensUsed: number;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
}

export interface FinancialSnapshot {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashFlow: number;
  healthScore: number;
  totalDebt: number;
  totalSavings: number;
  activeGoals: number;
  budgets: Array<{
    category: string;
    limit: number;
    spent: number;
    remaining: number;
  }>;
  capturedAt: Date;
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: MessageRole;
  content: string;
  intent: IntentType | null;
  entities: ExtractedEntities | null;
  actionTaken: ActionTaken | null;
  actionResult: ActionResult | null;
  referencedData: Record<string, unknown> | null;
  tokensUsed: number;
  modelUsed: string | null;
  latencyMs: number;
  feedbackRating: number | null;
  feedbackText: string | null;
  createdAt: Date;
}

// ============================================================================
// INTENT RECOGNITION TYPES
// ============================================================================

export type IntentType =
  | 'create_goal'          // User wants to create a financial goal
  | 'create_budget'        // User wants to create a budget
  | 'analyze_spending'     // User wants spending analysis
  | 'get_recommendations'  // User wants financial advice
  | 'debt_strategy'        // User wants debt help
  | 'account_summary'      // User wants financial overview
  | 'investment_advice'    // User wants investment guidance
  | 'credit_score'         // User wants credit score info
  | 'general_question'     // General financial education
  | 'greeting'             // Conversation starters
  | 'execute_action'       // Confirm and execute action
  | 'cancel_action'        // Cancel pending action
  | 'clarification'        // User providing clarification
  | 'feedback';            // User providing feedback

export interface Intent {
  type: IntentType;
  confidence: number;       // 0-1
  reason: string;          // Why this intent was chosen
  requiresConfirmation: boolean;
  metadata: Record<string, unknown>;
}

// ============================================================================
// ENTITY EXTRACTION TYPES
// ============================================================================

export interface ExtractedEntities {
  amounts?: MoneyAmount[];
  dates?: DateEntity[];
  categories?: string[];
  accountTypes?: string[];
  goalTypes?: string[];
  percentages?: number[];
  timeframes?: string[];
  [key: string]: MoneyAmount[] | DateEntity[] | string[] | number[] | undefined;
}

export interface MoneyAmount {
  value: number;
  currency: string;
  originalText: string;
  confidence: number;
}

export interface DateEntity {
  value: Date;
  originalText: string;
  precision: 'day' | 'week' | 'month' | 'quarter' | 'year';
  confidence: number;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface ActionTaken {
  type: IntentType;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
  confirmedAt: Date | null;
}

export interface ActionResult {
  success: boolean;
  type: string;
  data: unknown;
  message: string;
  error?: string;
}

// ============================================================================
// CHAT ENGINE REQUEST/RESPONSE TYPES
// ============================================================================

export interface SendMessageRequest {
  sessionId: string;
  message: string;
  stream?: boolean;
  executeAction?: boolean;
  voiceInput?: boolean;
}

export interface SendMessageOptions {
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  executeAction?: boolean;
  includeContext?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  message: ChatMessage;
  intent: Intent;
  entities: ExtractedEntities | null;
  actionNeeded: boolean;
  actionResult: ActionResult | null;
  suggestions?: string[];
  relatedQuestions?: string[];
}

export interface CreateSessionRequest {
  sessionType: SessionType;
  initialMessage?: string;
  context?: Record<string, unknown>;
}

export interface ListSessionsRequest {
  status?: SessionStatus;
  sessionType?: SessionType;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastMessageAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateSessionRequest {
  title?: string;
  status?: SessionStatus;
  context?: Record<string, unknown>;
}

// ============================================================================
// KNOWLEDGE BASE TYPES
// ============================================================================

export interface KnowledgeDocument {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  embedding: number[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type KnowledgeCategory =
  | 'credit_repair'
  | 'budgeting'
  | 'investing'
  | 'debt_management'
  | 'tax_planning'
  | 'financial_literacy'
  | 'regulations'
  | 'best_practices';

export interface KnowledgeSearchResult {
  document: KnowledgeDocument;
  relevance: number;
  excerpt: string;
}

// ============================================================================
// CONVERSATION CONTEXT TYPES
// ============================================================================

export interface ConversationContext {
  userId: string;
  sessionId: string;
  recentMessages: ChatMessage[];
  financialContext: FinancialSnapshot | null;
  pendingAction: PendingAction | null;
  conversationSummary: string | null;
  topics: string[];
  metadata: Record<string, unknown>;
}

export interface PendingAction {
  intent: IntentType;
  entities: ExtractedEntities;
  confirmationMessage: string;
  expiresAt: Date;
  createdAt: Date;
}

// ============================================================================
// PROMPT BUILDING TYPES
// ============================================================================

export interface PromptTemplate {
  system: string;
  examples?: PromptExample[];
  instructions: string[];
  contextTemplate: string;
}

export interface PromptExample {
  user: string;
  assistant: string;
}

export interface BuildPromptOptions {
  includeFinancialContext: boolean;
  includeKnowledge: boolean;
  includeHistory: boolean;
  maxHistoryMessages: number;
  knowledgeLimit: number;
}

export interface BuiltPrompt {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  tokenEstimate: number;
  includedContext: {
    financialSnapshot: boolean;
    knowledge: boolean;
    historyMessages: number;
  };
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface ChatAnalytics {
  sessionId: string;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalTokens: number;
  averageLatency: number;
  intents: Record<IntentType, number>;
  actionsExecuted: number;
  actionsSuccessful: number;
  actionsFailed: number;
  averageRating: number | null;
  commonTopics: string[];
  costEstimate: number;
}

export interface ChatMetrics {
  period: 'day' | 'week' | 'month';
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  totalTokens: number;
  averageCostPerSession: number;
  topIntents: Array<{ intent: IntentType; count: number }>;
  successRate: number;
  averageUserRating: number;
}

// ============================================================================
// VOICE TYPES
// ============================================================================

export interface VoiceInputRequest {
  audioFile: Blob | Buffer;
  format: 'mp3' | 'wav' | 'ogg' | 'webm';
  language?: string;
  sessionId?: string;
}

export interface VoiceInputResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  processingTime: number;
}

export interface TextToSpeechRequest {
  text: string;
  voice?: 'male' | 'female' | 'neutral';
  speed?: number;
  format?: 'mp3' | 'wav';
}

export interface TextToSpeechResult {
  audioUrl: string;
  duration: number;
  format: string;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportChatRequest {
  sessionId: string;
  format: 'pdf' | 'markdown' | 'json';
  includeActions: boolean;
  includeContext: boolean;
}

export interface ExportChatResult {
  downloadUrl: string;
  format: string;
  size: number;
  expiresAt: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ChatError extends Error {
  constructor(
    message: string,
    public code: ChatErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

export type ChatErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'MESSAGE_TOO_LONG'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INTENT'
  | 'ACTION_FAILED'
  | 'CONTEXT_UNAVAILABLE'
  | 'AI_SERVICE_ERROR'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_PARAMETERS';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}
