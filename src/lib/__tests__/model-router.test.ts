/**
 * ModelRouter — Unit Tests
 *
 * Tests model selection, fallback logic, provider/cost filtering,
 * recommendation generation, singleton management, and execution method.
 */

import { ModelRouter, TaskType, getModelRouter, resetModelRouter } from "../model-router";
import type { AIMLService, ChatMessage, ChatOptions } from "../aiml-service";

describe("ModelRouter", () => {
  let router: ModelRouter;

  beforeEach(() => {
    resetModelRouter();
    router = new ModelRouter();
  });

  // ---------------------------------------------------------------------------
  // getModel
  // ---------------------------------------------------------------------------

  describe("getModel", () => {
    it("should return the primary model for a task type", () => {
      const model = router.getModel(TaskType.DISPUTE_GENERATION);
      expect(model).toBe("anthropic/claude-4.5-sonnet");
    });

    it("should return fallback model when preferredIndex is specified", () => {
      const fallback = router.getModel(TaskType.DISPUTE_GENERATION, 1);
      expect(fallback).toBe("openai/gpt-5-pro");
    });

    it("should clamp preferredIndex to last model when out of bounds", () => {
      const model = router.getModel(TaskType.DISPUTE_GENERATION, 100);
      // Should return the last model in the array, not throw
      expect(model).toBe("openai/gpt-4o");
    });

    it("should return primary model when preferredIndex is 0", () => {
      const model = router.getModel(TaskType.CREDIT_ANALYSIS, 0);
      expect(model).toBe("deepseek/deepseek-r1");
    });

    it.each([
      [TaskType.QUICK_RESPONSE, "openai/gpt-4o-mini"],
      [TaskType.REASONING, "deepseek/deepseek-r1"],
      [TaskType.CODE_GENERATION, "openai/gpt-5-pro"],
      [TaskType.DOCUMENT_OCR, "openai/gpt-4o"],
      [TaskType.FINANCIAL_ADVICE, "anthropic/claude-4.5-sonnet"],
      [TaskType.STUDENT_LOAN_STRATEGY, "deepseek/deepseek-v3.1-terminus"],
      [TaskType.EMBEDDING, "text-embedding-3-large"],
      [TaskType.MODERATION, "openai-moderation"],
    ])("should return correct primary model for %s", (taskType, expectedModel) => {
      expect(router.getModel(taskType)).toBe(expectedModel);
    });
  });

  // ---------------------------------------------------------------------------
  // getAllModels
  // ---------------------------------------------------------------------------

  describe("getAllModels", () => {
    it("should return all models for a task type", () => {
      const models = router.getAllModels(TaskType.DISPUTE_GENERATION);
      expect(models).toEqual([
        "anthropic/claude-4.5-sonnet",
        "openai/gpt-5-pro",
        "openai/gpt-4o",
      ]);
    });

    it("should return 3 models for most task types", () => {
      const models = router.getAllModels(TaskType.CREDIT_ANALYSIS);
      expect(models).toHaveLength(3);
    });

    it("should return 2 models for DOCUMENT_OCR", () => {
      const models = router.getAllModels(TaskType.DOCUMENT_OCR);
      expect(models).toHaveLength(2);
    });

    it("should return 1 model for MODERATION", () => {
      const models = router.getAllModels(TaskType.MODERATION);
      expect(models).toHaveLength(1);
    });

    it("should return empty array for unknown task type", () => {
      const models = router.getAllModels("unknown_task" as TaskType);
      expect(models).toEqual([]);
    });

    it("should cover all TaskType enum values", () => {
      const taskTypes = Object.values(TaskType);
      for (const taskType of taskTypes) {
        const models = router.getAllModels(taskType);
        expect(models.length).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getRecommendation
  // ---------------------------------------------------------------------------

  describe("getRecommendation", () => {
    it("should return recommendation with primary and fallbacks", () => {
      const rec = router.getRecommendation(TaskType.DISPUTE_GENERATION);

      expect(rec.primary).toBe("anthropic/claude-4.5-sonnet");
      expect(rec.fallbacks).toEqual(["openai/gpt-5-pro", "openai/gpt-4o"]);
      expect(rec.reasoning).toContain("Claude 4.5 Sonnet");
      expect(rec.reasoning).toContain("Legal writing");
    });

    it("should include model strengths in reasoning", () => {
      const rec = router.getRecommendation(TaskType.REASONING);

      expect(rec.reasoning).toContain("DeepSeek R1");
      expect(rec.reasoning).toContain("Reasoning");
    });

    it("should handle models without info in reasoning", () => {
      const rec = router.getRecommendation(TaskType.IMAGE_GENERATION);

      // flux-pro is not in modelInfo, so reasoning should be generic
      expect(rec.primary).toBe("flux-pro");
      expect(rec.reasoning).toContain("flux-pro");
      expect(rec.reasoning).toContain("image_generation");
    });

    it("should throw for unknown task type with no models", () => {
      expect(() =>
        router.getRecommendation("nonexistent" as TaskType),
      ).toThrow("No models configured for task type");
    });

    it("should have empty fallbacks when only one model exists", () => {
      const rec = router.getRecommendation(TaskType.MODERATION);

      expect(rec.primary).toBe("openai-moderation");
      expect(rec.fallbacks).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getModelInfo
  // ---------------------------------------------------------------------------

  describe("getModelInfo", () => {
    it("should return model information for known models", () => {
      const info = router.getModelInfo("anthropic/claude-4.5-sonnet");

      expect(info).toBeDefined();
      expect(info!.name).toBe("Claude 4.5 Sonnet");
      expect(info!.provider).toBe("Anthropic");
      expect(info!.contextWindow).toBe(200000);
      expect(info!.costTier).toBe("high");
      expect(info!.strengths).toContain("Legal writing");
    });

    it("should return undefined for unknown models", () => {
      const info = router.getModelInfo("unknown-model");
      expect(info).toBeUndefined();
    });

    it.each([
      ["openai/gpt-5-pro", "GPT-5 Pro", "OpenAI", 400000, "high"],
      ["deepseek/deepseek-r1", "DeepSeek R1", "DeepSeek", 128000, "medium"],
      ["openai/gpt-4o-mini", "GPT-4o Mini", "OpenAI", 128000, "low"],
      ["google/gemini-2.5-pro", "Gemini 2.5 Pro", "Google", 1000000, "high"],
      ["google/gemini-2.5-flash", "Gemini 2.5 Flash", "Google", 1000000, "low"],
    ])(
      "should return correct info for %s",
      (id, name, provider, contextWindow, costTier) => {
        const info = router.getModelInfo(id);
        expect(info).toBeDefined();
        expect(info!.name).toBe(name);
        expect(info!.provider).toBe(provider);
        expect(info!.contextWindow).toBe(contextWindow);
        expect(info!.costTier).toBe(costTier);
      },
    );
  });

  // ---------------------------------------------------------------------------
  // getAllAvailableModels
  // ---------------------------------------------------------------------------

  describe("getAllAvailableModels", () => {
    it("should return all model IDs with info", () => {
      const models = router.getAllAvailableModels();

      expect(models.length).toBe(9);
      expect(models).toContain("anthropic/claude-4.5-sonnet");
      expect(models).toContain("openai/gpt-5-pro");
      expect(models).toContain("deepseek/deepseek-r1");
      expect(models).toContain("google/gemini-2.5-pro");
    });

    it("should not include specialized models without info entries", () => {
      const models = router.getAllAvailableModels();

      expect(models).not.toContain("flux-pro");
      expect(models).not.toContain("whisper-1");
      expect(models).not.toContain("openai-moderation");
    });
  });

  // ---------------------------------------------------------------------------
  // getModelsByProvider
  // ---------------------------------------------------------------------------

  describe("getModelsByProvider", () => {
    it("should return OpenAI models", () => {
      const models = router.getModelsByProvider("OpenAI");

      expect(models).toContain("openai/gpt-5-pro");
      expect(models).toContain("openai/gpt-4o");
      expect(models).toContain("openai/gpt-4o-mini");
      expect(models).toHaveLength(3);
    });

    it("should return Anthropic models", () => {
      const models = router.getModelsByProvider("Anthropic");

      expect(models).toContain("anthropic/claude-4.5-sonnet");
      expect(models).toContain("anthropic/claude-4.5-haiku");
      expect(models).toHaveLength(2);
    });

    it("should return DeepSeek models", () => {
      const models = router.getModelsByProvider("DeepSeek");

      expect(models).toContain("deepseek/deepseek-r1");
      expect(models).toContain("deepseek/deepseek-v3.1-terminus");
      expect(models).toHaveLength(2);
    });

    it("should return Google models", () => {
      const models = router.getModelsByProvider("Google");

      expect(models).toContain("google/gemini-2.5-pro");
      expect(models).toContain("google/gemini-2.5-flash");
      expect(models).toHaveLength(2);
    });

    it("should return empty array for unknown provider", () => {
      const models = router.getModelsByProvider("Unknown");
      expect(models).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getModelsByCostTier
  // ---------------------------------------------------------------------------

  describe("getModelsByCostTier", () => {
    it("should return low-cost models", () => {
      const models = router.getModelsByCostTier("low");

      expect(models).toContain("openai/gpt-4o-mini");
      expect(models).toContain("anthropic/claude-4.5-haiku");
      expect(models).toContain("google/gemini-2.5-flash");
    });

    it("should return medium-cost models", () => {
      const models = router.getModelsByCostTier("medium");

      expect(models).toContain("deepseek/deepseek-r1");
      expect(models).toContain("deepseek/deepseek-v3.1-terminus");
      expect(models).toContain("openai/gpt-4o");
    });

    it("should return high-cost models", () => {
      const models = router.getModelsByCostTier("high");

      expect(models).toContain("anthropic/claude-4.5-sonnet");
      expect(models).toContain("openai/gpt-5-pro");
      expect(models).toContain("google/gemini-2.5-pro");
    });

    it("should return empty array for free tier (none configured)", () => {
      const models = router.getModelsByCostTier("free");
      expect(models).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // selectModel
  // ---------------------------------------------------------------------------

  describe("selectModel", () => {
    it("should return primary model when no requirements specified", () => {
      const model = router.selectModel(TaskType.DISPUTE_GENERATION);
      expect(model).toBe("anthropic/claude-4.5-sonnet");
    });

    it("should filter by cost tier", () => {
      const model = router.selectModel(TaskType.GENERAL_CHAT, {
        costTier: "high",
      });
      // openai/gpt-4o is medium, claude-4.5-sonnet is high, gemini-2.5-pro is high
      expect(["anthropic/claude-4.5-sonnet", "google/gemini-2.5-pro"]).toContain(
        model,
      );
    });

    it("should filter by provider", () => {
      const model = router.selectModel(TaskType.DISPUTE_GENERATION, {
        provider: "OpenAI",
      });
      expect(model).toBe("openai/gpt-5-pro");
    });

    it("should filter by context window", () => {
      const model = router.selectModel(TaskType.GENERAL_CHAT, {
        contextWindow: 200000,
      });
      // Only models with >= 200k context: claude-4.5-sonnet (200k), gemini-2.5-pro (1M)
      expect(
        ["anthropic/claude-4.5-sonnet", "google/gemini-2.5-pro"].includes(model),
      ).toBe(true);
    });

    it("should fall back to primary when no models match requirements", () => {
      const model = router.selectModel(TaskType.DISPUTE_GENERATION, {
        provider: "NonExistent",
      });
      // Falls back to primary model
      expect(model).toBe("anthropic/claude-4.5-sonnet");
    });

    it("should combine multiple requirements", () => {
      const model = router.selectModel(TaskType.GENERAL_CHAT, {
        costTier: "high",
        contextWindow: 500000,
      });
      // Only gemini-2.5-pro is high cost + >= 500k context
      expect(model).toBe("google/gemini-2.5-pro");
    });

    it("should include models without info when filtering", () => {
      // Image generation models don't have modelInfo entries
      const model = router.selectModel(TaskType.IMAGE_GENERATION, {
        costTier: "low",
      });
      // Models without info pass all filters (return true)
      expect(model).toBe("flux-pro");
    });
  });

  // ---------------------------------------------------------------------------
  // Singleton
  // ---------------------------------------------------------------------------

  describe("singleton", () => {
    it("should return the same instance on repeated calls", () => {
      const a = getModelRouter();
      const b = getModelRouter();
      expect(a).toBe(b);
    });

    it("should return a new instance after reset", () => {
      const a = getModelRouter();
      resetModelRouter();
      const b = getModelRouter();
      expect(a).not.toBe(b);
    });

    it("should return a functional instance", () => {
      const instance = getModelRouter();
      const model = instance.getModel(TaskType.QUICK_RESPONSE);
      expect(model).toBe("openai/gpt-4o-mini");
    });
  });

  // ---------------------------------------------------------------------------
  // TaskType coverage
  // ---------------------------------------------------------------------------

  describe("TaskType enum coverage", () => {
    const allTaskTypes = Object.values(TaskType);

    it("should have 21 task types defined", () => {
      expect(allTaskTypes).toHaveLength(21);
    });

    it("should have models configured for every task type", () => {
      for (const taskType of allTaskTypes) {
        const models = router.getAllModels(taskType);
        expect(models.length).toBeGreaterThan(0);
      }
    });

    it("should return valid recommendations for every task type", () => {
      for (const taskType of allTaskTypes) {
        const rec = router.getRecommendation(taskType);
        expect(rec.primary).toBeTruthy();
        expect(rec.reasoning).toBeTruthy();
        expect(Array.isArray(rec.fallbacks)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // complete — execution method (CMP-4 / FND-061)
  // ---------------------------------------------------------------------------

  describe("complete", () => {
    let mockChat: jest.Mock;
    let mockAiml: AIMLService;

    beforeEach(() => {
      mockChat = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "test response" } }],
        usage: { total_tokens: 42 },
      });
      mockAiml = { chat: mockChat } as unknown as AIMLService;
    });

    it("selects the primary model for the given TaskType and forwards messages to AIMLService.chat", async () => {
      const routerWithAiml = new ModelRouter(mockAiml);
      const messages: ChatMessage[] = [
        { role: "user", content: "Help with my credit dispute" },
      ];

      await routerWithAiml.complete(TaskType.DISPUTE_GENERATION, messages);

      // Router must have called AIMLService.chat with the primary model for DISPUTE_GENERATION
      expect(mockChat).toHaveBeenCalledTimes(1);
      const [calledModel, calledMessages] = mockChat.mock.calls[0] as [string, ChatMessage[], ChatOptions?];
      expect(calledModel).toBe("anthropic/claude-4.5-sonnet");
      expect(calledMessages).toBe(messages);
    });

    it("forwards chat options to AIMLService.chat", async () => {
      const routerWithAiml = new ModelRouter(mockAiml);
      const messages: ChatMessage[] = [{ role: "user", content: "analyse my finances" }];
      const options: ChatOptions = { temperature: 0.3, max_tokens: 500 };

      await routerWithAiml.complete(TaskType.FINANCIAL_ADVICE, messages, options);

      const [, , calledOptions] = mockChat.mock.calls[0] as [string, ChatMessage[], ChatOptions?];
      expect(calledOptions).toBe(options);
    });

    it("returns the result from AIMLService.chat unchanged", async () => {
      const routerWithAiml = new ModelRouter(mockAiml);
      const messages: ChatMessage[] = [{ role: "user", content: "hello" }];

      const result = await routerWithAiml.complete(TaskType.GENERAL_CHAT, messages);

      expect(result).toEqual({
        choices: [{ message: { content: "test response" } }],
        usage: { total_tokens: 42 },
      });
    });

    it("uses router model selection (not a hardcoded model) for each TaskType", async () => {
      const routerWithAiml = new ModelRouter(mockAiml);
      const messages: ChatMessage[] = [{ role: "user", content: "reason about this" }];

      await routerWithAiml.complete(TaskType.REASONING, messages);

      const [calledModel] = mockChat.mock.calls[0] as [string, ChatMessage[], ChatOptions?];
      // REASONING primary is deepseek/deepseek-r1 — not a chat/dispute model
      expect(calledModel).toBe("deepseek/deepseek-r1");
    });
  });
});
