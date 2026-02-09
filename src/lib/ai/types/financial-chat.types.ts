/**
 * Financial Chat Types
 *
 * Phase 6.1.1: Type definitions for conversational AI financial planning
 * Comprehensive types for chat sessions, messages, intents, and responses
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum IntentType {
  QUESTION = 'question',
  ACTION = 'action',
  EDUCATION = 'education',
  PORTFOLIO_ANALYSIS = 'portfolio_analysis',
  INVESTMENT_ADVICE = 'investment_advice',
  BUDGET_PLANNING = 'budget_planning',
  DEBT_STRATEGY = 'debt_strategy',
  CREDIT_IMPROVEMENT = 'credit_improvement',
  MARKET_INSIGHTS = 'market_insights',
  RISK_ASSESSMENT = 'risk_assessment',
}

export enum ActionType {
  VIEW_PORTFOLIO = 'view_portfolio',
  CREATE_BUDGET = 'create_budget',
  ANALYZE_INVESTMENT = 'analyze_investment',
  GENERATE_REPORT = 'generate_report',
  OPTIMIZE_DEBT = 'optimize_debt',
  ASSESS_RISK = 'assess_risk',
  GET_TRADING_SIGNAL = 'get_trading_signal',
  TRACK_GOALS = 'track_goals',
  ANALYZE_SPENDING = 'analyze_spending',
  RECOMMEND_STRATEGY = 'recommend_strategy',
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface ChatSession {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  metadata?: ChatMetadata;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface ChatContext {
  userId: string;
  portfolioData?: PortfolioContext;
  recentTransactions?: TransactionContext[];
  userPreferences?: UserPreferences;
  sessionHistory?: ChatMessage[];
  financialGoals?: FinancialGoal[];
  riskProfile?: RiskProfile;
}

export interface ChatIntent {
  type: IntentType;
  confidence: number;
  entities?: EntityExtraction[];
  action?: ActionType;
  parameters?: Record<string, any>;
}

export interface ChatResponse {
  message: string;
  intent?: ChatIntent;
  suggestedActions?: ActionSuggestion[];
  educationalContent?: EducationalContent[];
  metadata?: ResponseMetadata;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface ChatMetadata {
  messageCount?: number;
  lastMessageAt?: Date;
  tags?: string[];
  category?: string;
  archived?: boolean;
}

export interface MessageMetadata {
  tokens?: number;
  model?: string;
  processingTime?: number;
  intentConfidence?: number;
  actionExecuted?: boolean;
  suggestedActions?: Array<{ label: string; action: string }>;
  educationalContent?: Array<{ title: string; summary: string }>;
}

export interface PortfolioContext {
  totalValue: number;
  holdings: Array<{
    symbol: string;
    quantity: number;
    currentValue: number;
    gainLoss: number;
  }>;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  allocation: {
    stocks: number;
    bonds: number;
    crypto: number;
    cash: number;
  };
}

export interface TransactionContext {
  id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal';
  symbol?: string;
  amount: number;
  date: Date;
  category?: string;
}

export interface UserPreferences {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentHorizon: 'short' | 'medium' | 'long';
  preferredAssets: string[];
  communicationStyle: 'concise' | 'detailed' | 'educational';
  notificationPreferences: {
    marketAlerts: boolean;
    portfolioUpdates: boolean;
    educationalContent: boolean;
  };
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  priority: 'high' | 'medium' | 'low';
  category: 'retirement' | 'emergency' | 'investment' | 'debt' | 'other';
}

export interface RiskProfile {
  score: number; // 0-100
  category: 'conservative' | 'moderate' | 'aggressive';
  factors: {
    age: number;
    income: number;
    netWorth: number;
    investmentExperience: string;
    timeHorizon: number;
  };
}

export interface EntityExtraction {
  type: 'symbol' | 'amount' | 'date' | 'percentage' | 'category' | 'asset_type';
  value: string | number | Date;
  confidence: number;
  context?: string;
}

export interface ActionSuggestion {
  type: ActionType;
  label: string;
  description: string;
  parameters?: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact?: string;
}

export interface EducationalContent {
  title: string;
  summary: string;
  category: 'investing' | 'budgeting' | 'debt' | 'credit' | 'retirement' | 'taxes';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: number; // minutes
  url?: string;
  keyTakeaways?: string[];
}

export interface ResponseMetadata {
  processingTime: number;
  model: string;
  tokensUsed: number;
  confidence: number;
  sources?: string[];
  disclaimer?: string;
}

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

export interface CreateSessionRequest {
  userId: string;
  title?: string;
  initialContext?: Partial<ChatContext>;
}

export interface SendMessageRequest {
  sessionId: string;
  message: string;
  streaming?: boolean;
}

export interface GetMessagesRequest {
  sessionId: string;
  limit?: number;
  offset?: number;
  beforeTimestamp?: Date;
}

export interface UpdateSessionRequest {
  title?: string;
  metadata?: Partial<ChatMetadata>;
}

// ============================================================================
// DATABASE SCHEMAS
// ============================================================================

export interface ChatSessionDB {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  metadata: Record<string, any> | null;
  message_count: number;
  last_message_at: string | null;
  archived: boolean;
}

export interface ChatMessageDB {
  id: string;
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: Record<string, any> | null;
  intent_type: string | null;
  intent_confidence: number | null;
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

export interface StreamChunk {
  type: 'token' | 'intent' | 'action' | 'complete' | 'error';
  content?: string;
  intent?: ChatIntent;
  action?: ActionSuggestion;
  error?: string;
}

export interface StreamOptions {
  onToken?: (token: string) => void;
  onIntent?: (intent: ChatIntent) => void;
  onAction?: (action: ActionSuggestion) => void;
  onComplete?: (response: ChatResponse) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const ChatSessionSchema = {
  id: 'string',
  userId: 'string',
  createdAt: 'Date',
  updatedAt: 'Date',
  title: 'string?',
  metadata: 'object?',
} as const;

export const ChatMessageSchema = {
  id: 'string',
  sessionId: 'string',
  role: 'MessageRole',
  content: 'string',
  timestamp: 'Date',
  metadata: 'object?',
} as const;

export const ChatIntentSchema = {
  type: 'IntentType',
  confidence: 'number',
  entities: 'array?',
  action: 'ActionType?',
  parameters: 'object?',
} as const;
