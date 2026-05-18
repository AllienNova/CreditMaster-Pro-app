/**
 * Model Router — shared types and enums
 *
 * This module contains ONLY pure enums and interfaces with no runtime
 * dependencies on Node.js builtins or server-only packages. It is safe
 * to import from both client and server components.
 *
 * Server-only execution logic lives in model-router.ts.
 */

export enum TaskType {
  // Credit Repair Tasks
  DISPUTE_GENERATION = "dispute_generation",
  CREDIT_ANALYSIS = "credit_analysis",
  CREDIT_REPORT_REVIEW = "credit_report_review",
  LEGAL_COMPLIANCE = "legal_compliance",
  FINANCIAL_ADVICE = "financial_advice",

  // Student Loan Tasks
  STUDENT_LOAN_STRATEGY = "student_loan_strategy",
  LOAN_CALCULATION = "loan_calculation",
  REPAYMENT_PLANNING = "repayment_planning",
  FORGIVENESS_ANALYSIS = "forgiveness_analysis",

  // Document Processing
  DOCUMENT_OCR = "document_ocr",
  DOCUMENT_ANALYSIS = "document_analysis",
  DOCUMENT_GENERATION = "document_generation",

  // General Tasks
  QUICK_RESPONSE = "quick_response",
  GENERAL_CHAT = "general_chat",
  REASONING = "reasoning",
  CODE_GENERATION = "code_generation",

  // Specialized Tasks
  IMAGE_GENERATION = "image_generation",
  VOICE_SYNTHESIS = "voice_synthesis",
  TRANSCRIPTION = "transcription",
  EMBEDDING = "embedding",
  MODERATION = "moderation",
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  strengths: string[];
  costTier: "free" | "low" | "medium" | "high";
}

export interface ModelRecommendation {
  primary: string;
  fallbacks: string[];
  reasoning: string;
}
