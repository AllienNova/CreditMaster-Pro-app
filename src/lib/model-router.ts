/**
 * Model Router
 *
 * Intelligent routing system to select the best AI model for each task.
 * Routes requests to optimal models based on task type, complexity, and requirements.
 *
 * Supports 300+ models from AIML API including:
 * - OpenAI (GPT-5, GPT-4o, GPT-4o-mini)
 * - Anthropic (Claude 4.5 Sonnet, Claude 4.5 Haiku, Claude 4.5 Opus)
 * - DeepSeek (DeepSeek R1, DeepSeek V3.1)
 * - Google (Gemini 2.5 Pro, Gemini 2.5 Flash)
 * - Meta (Llama 4)
 * - xAI (Grok 4)
 */

import type {
  AIMLService,
  ChatMessage,
  ChatOptions,
} from "./aiml-service";
import type OpenAI from "openai";

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

/**
 * Model Router Class
 *
 * Intelligently routes tasks to the best AI model and executes calls via
 * AIMLService. ModelRouter is the single legitimate owner of AIMLService —
 * it selects the model AND runs the call. (CMP-4 / FND-061)
 */
export class ModelRouter {
  // AIMLService instance — lazily constructed on first use to avoid throwing
  // when AIML_API_KEY is unset at module load time. Can be constructor-injected
  // (e.g. for tests) to skip lazy construction entirely.
  private aiml: AIMLService | null;

  constructor(aiml?: AIMLService) {
    this.aiml = aiml ?? null;
  }

  // Model mapping for each task type
  private modelMap: Record<TaskType, string[]> = {
    // Credit Repair - Use Claude 4.5 Sonnet for legal writing, GPT-5 for compliance
    [TaskType.DISPUTE_GENERATION]: [
      "anthropic/claude-4.5-sonnet", // Best for legal writing
      "openai/gpt-5-pro", // Excellent compliance knowledge
      "openai/gpt-4o", // Fast and reliable
    ],

    [TaskType.CREDIT_ANALYSIS]: [
      "deepseek/deepseek-r1", // Best reasoning capabilities
      "openai/gpt-5-pro", // Strong analytical skills
      "anthropic/claude-4.5-sonnet", // Detailed analysis
    ],

    [TaskType.CREDIT_REPORT_REVIEW]: [
      "openai/gpt-5-pro", // Comprehensive review
      "anthropic/claude-4.5-sonnet", // Attention to detail
      "google/gemini-2.5-pro", // Multi-modal capabilities
    ],

    [TaskType.LEGAL_COMPLIANCE]: [
      "openai/gpt-5-pro", // Best legal knowledge
      "anthropic/claude-4.5-sonnet", // Ethical AI, careful analysis
      "deepseek/deepseek-r1", // Reasoning for edge cases
    ],

    [TaskType.FINANCIAL_ADVICE]: [
      "anthropic/claude-4.5-sonnet", // Empathetic, detailed advice
      "openai/gpt-5-pro", // Comprehensive knowledge
      "google/gemini-2.5-pro", // Multi-faceted analysis
    ],

    // Student Loan - Use reasoning models for complex calculations
    [TaskType.STUDENT_LOAN_STRATEGY]: [
      "deepseek/deepseek-v3.1-terminus", // Best for mathematical reasoning
      "anthropic/claude-4.5-sonnet", // Detailed strategy planning
      "openai/gpt-5-pro", // Comprehensive knowledge
    ],

    [TaskType.LOAN_CALCULATION]: [
      "deepseek/deepseek-v3.1-terminus", // Mathematical reasoning
      "deepseek/deepseek-r1", // Advanced calculations
      "openai/gpt-5-pro", // Reliable calculations
    ],

    [TaskType.REPAYMENT_PLANNING]: [
      "anthropic/claude-4.5-sonnet", // Long-term planning
      "deepseek/deepseek-v3.1-terminus", // Optimization
      "openai/gpt-5-pro", // Comprehensive plans
    ],

    [TaskType.FORGIVENESS_ANALYSIS]: [
      "openai/gpt-5-pro", // Policy knowledge
      "anthropic/claude-4.5-sonnet", // Detailed analysis
      "deepseek/deepseek-r1", // Complex eligibility logic
    ],

    // Document Processing
    [TaskType.DOCUMENT_OCR]: [
      "openai/gpt-4o", // Excellent OCR capabilities
      "google/gemini-2.5-pro", // Multi-modal processing
    ],

    [TaskType.DOCUMENT_ANALYSIS]: [
      "anthropic/claude-4.5-sonnet", // Thorough document review
      "openai/gpt-5-pro", // Comprehensive analysis
      "google/gemini-2.5-pro", // Multi-modal understanding
    ],

    [TaskType.DOCUMENT_GENERATION]: [
      "anthropic/claude-4.5-sonnet", // Best for professional writing
      "openai/gpt-5-pro", // Versatile generation
      "openai/gpt-4o", // Fast generation
    ],

    // General Tasks
    [TaskType.QUICK_RESPONSE]: [
      "openai/gpt-4o-mini", // Fast and cheap
      "anthropic/claude-4.5-haiku", // Quick responses
      "google/gemini-2.5-flash", // Lightning fast
    ],

    [TaskType.GENERAL_CHAT]: [
      "openai/gpt-4o", // Balanced performance
      "anthropic/claude-4.5-sonnet", // Engaging conversation
      "google/gemini-2.5-pro", // Versatile chat
    ],

    [TaskType.REASONING]: [
      "deepseek/deepseek-r1", // Best reasoning model
      "deepseek/deepseek-v3.1-terminus", // Advanced reasoning
      "openai/gpt-5-pro", // Strong reasoning
    ],

    [TaskType.CODE_GENERATION]: [
      "openai/gpt-5-pro", // Excellent coding
      "anthropic/claude-4.5-sonnet", // Clean code
      "deepseek/deepseek-r1", // Algorithm design
    ],

    // Specialized Tasks
    [TaskType.IMAGE_GENERATION]: [
      "flux-pro", // High quality images
      "stable-diffusion-xl", // Versatile generation
      "imagen-4.0-ultra", // Google's best
    ],

    [TaskType.VOICE_SYNTHESIS]: [
      "tts-1-hd", // OpenAI high quality
      "elevenlabs-multilingual", // Best voice quality
      "qwen3-tts-flash", // Fast synthesis
    ],

    [TaskType.TRANSCRIPTION]: [
      "whisper-1", // OpenAI Whisper
      "whisper-large-v3", // Most accurate
    ],

    [TaskType.EMBEDDING]: [
      "text-embedding-3-large", // Best embeddings
      "text-embedding-3-small", // Fast embeddings
    ],

    [TaskType.MODERATION]: [
      "openai-moderation", // Content safety
    ],
  };

  // Model information database
  private modelInfo: Record<string, ModelInfo> = {
    "anthropic/claude-4.5-sonnet": {
      id: "anthropic/claude-4.5-sonnet",
      name: "Claude 4.5 Sonnet",
      provider: "Anthropic",
      contextWindow: 200000,
      strengths: [
        "Legal writing",
        "Ethical AI",
        "Long documents",
        "Detailed analysis",
      ],
      costTier: "high",
    },
    "openai/gpt-5-pro": {
      id: "openai/gpt-5-pro",
      name: "GPT-5 Pro",
      provider: "OpenAI",
      contextWindow: 400000,
      strengths: [
        "Comprehensive knowledge",
        "Coding",
        "Reasoning",
        "Versatility",
      ],
      costTier: "high",
    },
    "deepseek/deepseek-r1": {
      id: "deepseek/deepseek-r1",
      name: "DeepSeek R1",
      provider: "DeepSeek",
      contextWindow: 128000,
      strengths: ["Reasoning", "Mathematics", "Logic", "Problem solving"],
      costTier: "medium",
    },
    "deepseek/deepseek-v3.1-terminus": {
      id: "deepseek/deepseek-v3.1-terminus",
      name: "DeepSeek V3.1 Terminus",
      provider: "DeepSeek",
      contextWindow: 128000,
      strengths: ["Advanced reasoning", "Optimization", "Complex calculations"],
      costTier: "medium",
    },
    "openai/gpt-4o": {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      provider: "OpenAI",
      contextWindow: 128000,
      strengths: ["Fast", "Reliable", "Multi-modal", "OCR"],
      costTier: "medium",
    },
    "openai/gpt-4o-mini": {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "OpenAI",
      contextWindow: 128000,
      strengths: ["Fast", "Cheap", "Efficient", "Quick responses"],
      costTier: "low",
    },
    "anthropic/claude-4.5-haiku": {
      id: "anthropic/claude-4.5-haiku",
      name: "Claude 4.5 Haiku",
      provider: "Anthropic",
      contextWindow: 200000,
      strengths: ["Fast", "Efficient", "Quick responses"],
      costTier: "low",
    },
    "google/gemini-2.5-pro": {
      id: "google/gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      provider: "Google",
      contextWindow: 1000000,
      strengths: ["Huge context", "Multi-modal", "Versatile"],
      costTier: "high",
    },
    "google/gemini-2.5-flash": {
      id: "google/gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      provider: "Google",
      contextWindow: 1000000,
      strengths: ["Lightning fast", "Large context", "Efficient"],
      costTier: "low",
    },
  };

  /**
   * Get the best model for a specific task
   *
   * @param taskType - Type of task to perform
   * @param preferredIndex - Index of preferred model (0 = primary, 1 = first fallback, etc.)
   * @returns Model ID
   */
  getModel(taskType: TaskType, preferredIndex: number = 0): string {
    const models = this.modelMap[taskType];
    if (!models || models.length === 0) {
      throw new Error(`No models configured for task type: ${taskType}`);
    }
    return models[Math.min(preferredIndex, models.length - 1)];
  }

  /**
   * Get all models for a specific task (primary + fallbacks)
   *
   * @param taskType - Type of task to perform
   * @returns Array of model IDs
   */
  getAllModels(taskType: TaskType): string[] {
    return this.modelMap[taskType] || [];
  }

  /**
   * Get model recommendation with reasoning
   *
   * @param taskType - Type of task to perform
   * @returns Model recommendation with primary and fallbacks
   */
  getRecommendation(taskType: TaskType): ModelRecommendation {
    const models = this.getAllModels(taskType);
    if (models.length === 0) {
      throw new Error(`No models configured for task type: ${taskType}`);
    }

    const primary = models[0];
    const fallbacks = models.slice(1);
    const primaryInfo = this.modelInfo[primary];

    const reasoning = primaryInfo
      ? `${primaryInfo.name} is recommended for ${taskType} because of its strengths in: ${primaryInfo.strengths.join(", ")}.`
      : `${primary} is the primary model for ${taskType}.`;

    return {
      primary,
      fallbacks,
      reasoning,
    };
  }

  /**
   * Get information about a specific model
   *
   * @param modelId - Model ID
   * @returns Model information
   */
  getModelInfo(modelId: string): ModelInfo | undefined {
    return this.modelInfo[modelId];
  }

  /**
   * Get all available models
   *
   * @returns Array of all model IDs
   */
  getAllAvailableModels(): string[] {
    return Object.keys(this.modelInfo);
  }

  /**
   * Get models by provider
   *
   * @param provider - Provider name (e.g., 'OpenAI', 'Anthropic')
   * @returns Array of model IDs from that provider
   */
  getModelsByProvider(provider: string): string[] {
    return Object.entries(this.modelInfo)
      .filter(([, info]) => info.provider === provider)
      .map(([id]) => id);
  }

  /**
   * Get models by cost tier
   *
   * @param costTier - Cost tier (free, low, medium, high)
   * @returns Array of model IDs in that cost tier
   */
  getModelsByCostTier(costTier: "free" | "low" | "medium" | "high"): string[] {
    return Object.entries(this.modelInfo)
      .filter(([, info]) => info.costTier === costTier)
      .map(([id]) => id);
  }

  /**
   * Select best model based on requirements
   *
   * @param taskType - Type of task
   * @param requirements - Requirements (e.g., { costTier: 'low', provider: 'OpenAI' })
   * @returns Model ID that best matches requirements
   */
  selectModel(
    taskType: TaskType,
    requirements?: {
      costTier?: "free" | "low" | "medium" | "high";
      provider?: string;
      contextWindow?: number;
    },
  ): string {
    const models = this.getAllModels(taskType);

    if (!requirements) {
      return models[0]; // Return primary model
    }

    // Filter models based on requirements
    const filtered = models.filter((modelId) => {
      const info = this.modelInfo[modelId];
      if (!info) return true; // Include if no info available

      if (requirements.costTier && info.costTier !== requirements.costTier) {
        return false;
      }

      if (requirements.provider && info.provider !== requirements.provider) {
        return false;
      }

      if (
        requirements.contextWindow &&
        info.contextWindow < requirements.contextWindow
      ) {
        return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      // ModelRouter warning: No models match requirements, using primary model
      return models[0];
    }

    return filtered[0];
  }

  /**
   * Execute an AI call for the given task type.
   *
   * Selects the primary model via the router's existing routing logic, then
   * calls AIMLService.chat with it. This is the single execution entry point
   * that the ~20 engine files should call instead of constructing AIMLService
   * directly (CMP-5 migration). Multi-model consensus paths (e.g. signal-generator,
   * ai-orchestrator.multiModelConsensus) are exempt and continue using AIMLService
   * directly with deliberate model arrays.
   *
   * @param taskType   - Task type used to select the model
   * @param messages   - Chat messages to forward verbatim to the model
   * @param options    - Optional ChatOptions passed through to AIMLService.chat
   * @returns          - ChatCompletion from AIMLService.chat
   */
  async complete(
    taskType: TaskType,
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    if (!this.aiml) {
      // Lazy construction: only runs when AIML_API_KEY must be present.
      // The import is deferred to avoid a module-load throw in environments
      // where the env var is not set (e.g. test runs that don't inject a mock).
      const { AIMLService: AIMLServiceClass } = await import("./aiml-service");
      this.aiml = new AIMLServiceClass();
    }
    const model = this.getModel(taskType);
    return this.aiml.chat(model, messages, options);
  }
}

/**
 * Create a singleton instance of ModelRouter
 */
let routerInstance: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
  if (!routerInstance) {
    routerInstance = new ModelRouter();
  }
  return routerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetModelRouter(): void {
  routerInstance = null;
}

export default ModelRouter;
