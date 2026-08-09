/**
 * AI Provider Adapter + Registry Tests
 *
 * Covers:
 * - ProviderRegistry model-to-provider resolution
 * - Availability checks (isAvailable when env key present / absent)
 * - Cross-provider fallback in ModelRouter.complete
 * - ProviderError classification (retryable vs non-retryable)
 */

import { ModelRouter, TaskType, resetModelRouter } from "@/lib/model-router";
import {
	ProviderRegistry,
	resetProviderRegistry,
} from "@/lib/ai/providers/registry";
import { ProviderError } from "@/lib/ai/providers/types";
import type {
	AIProvider,
	NormalizedChatCompletion,
} from "@/lib/ai/providers/types";
import type { ChatMessage } from "@/lib/aiml-service";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeMockProvider(
	name: string,
	available: boolean,
	behavior: "success" | "retryable-error" | "fatal-error",
	responseText = "mock-response",
): AIProvider {
	return {
		name,
		isAvailable: () => available,
		chat: jest
			.fn()
			.mockImplementation(async (): Promise<NormalizedChatCompletion> => {
				if (behavior === "success") {
					return {
						id: `mock-${name}`,
						object: "chat.completion",
						created: Math.floor(Date.now() / 1000),
						model: "mock-model",
						choices: [
							{
								index: 0,
								message: { role: "assistant", content: responseText },
								finish_reason: "stop",
							},
						],
						usage: {
							prompt_tokens: 10,
							completion_tokens: 5,
							total_tokens: 15,
						},
					};
				}
				if (behavior === "retryable-error") {
					throw new ProviderError(
						`${name} rate limited`,
						name,
						"mock-model",
						true,
						429,
					);
				}
				throw new ProviderError(
					`${name} auth failed`,
					name,
					"mock-model",
					false,
					401,
				);
			}),
		chatStream: jest.fn().mockRejectedValue(new Error("stream not mocked")),
	};
}

// ---------------------------------------------------------------------------
// ProviderRegistry
// ---------------------------------------------------------------------------

describe("ProviderRegistry", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Isolate env for each test so host env vars do not leak.
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
		resetProviderRegistry();
	});

	it("maps openai/* model IDs to the OpenAI provider when key is present", () => {
		process.env.OPENAI_API_KEY = "test-openai";
		const registry = new ProviderRegistry();
		const provider = registry.getProvider("openai/gpt-4o");
		expect(provider.name).toBe("OpenAI");
	});

	it("maps anthropic/* model IDs to the Anthropic provider when key is present", () => {
		process.env.ANTHROPIC_API_KEY = "test-anthropic";
		const registry = new ProviderRegistry();
		const provider = registry.getProvider("anthropic/claude-4.5-sonnet");
		expect(provider.name).toBe("Anthropic");
	});

	it("maps google/* model IDs to the Google provider when key is present", () => {
		process.env.GOOGLE_API_KEY = "test-google";
		const registry = new ProviderRegistry();
		const provider = registry.getProvider("google/gemini-2.5-pro");
		expect(provider.name).toBe("Google");
	});

	it("maps deepseek/* model IDs to the DeepSeek provider when key is present", () => {
		process.env.DEEPSEEK_API_KEY = "test-deepseek";
		const registry = new ProviderRegistry();
		const provider = registry.getProvider("deepseek/deepseek-r1");
		expect(provider.name).toBe("DeepSeek");
	});

	it("maps mistral/* model IDs to the Mistral provider when key is present", () => {
		process.env.MISTRAL_API_KEY = "test-mistral";
		const registry = new ProviderRegistry();
		const provider = registry.getProvider("mistral/mistral-large");
		expect(provider.name).toBe("Mistral");
	});

	it("falls back to AIML provider for unknown prefixes", () => {
		process.env.AIML_API_KEY = "test-aiml";
		const registry = new ProviderRegistry();
		const provider = registry.getProvider("flux-pro");
		expect(provider.name).toBe("AIML");
	});

	it("falls back to AIML when forceAimlFallback is true", () => {
		process.env.OPENAI_API_KEY = "test-openai";
		const registry = new ProviderRegistry({ forceAimlFallback: true });
		const provider = registry.getProvider("openai/gpt-4o");
		expect(provider.name).toBe("AIML");
	});

	it("returns AIML when direct provider exists but is not available", () => {
		delete process.env.OPENAI_API_KEY;
		process.env.AIML_API_KEY = "test-aiml";
		const registry = new ProviderRegistry();
		const provider = registry.getProvider("openai/gpt-4o");
		expect(provider.name).toBe("AIML");
	});
});

// ---------------------------------------------------------------------------
// ModelRouter cross-provider fallback
// ---------------------------------------------------------------------------

describe("ModelRouter — cross-provider fallback", () => {
	let router: ModelRouter;

	beforeEach(() => {
		resetModelRouter();
		resetProviderRegistry();
		router = new ModelRouter();
	});

	it("uses primary model when it succeeds", async () => {
		const mockProvider = makeMockProvider(
			"MockPrimary",
			true,
			"success",
			"primary-ok",
		);
		const registry = new ProviderRegistry();
		(registry as unknown as Record<string, unknown>).providers = new Map([
			["openai", mockProvider],
		]);

		// Inject registry via internal field for testing
		(router as unknown as { registry: ProviderRegistry }).registry = registry;

		const messages: ChatMessage[] = [{ role: "user", content: "hello" }];
		const result = await router.complete(TaskType.GENERAL_CHAT, messages);

		expect(result.choices[0].message.content).toBe("primary-ok");
		expect(mockProvider.chat).toHaveBeenCalledTimes(1);
	});

	it("falls back to next model when primary returns retryable error", async () => {
		const primary = makeMockProvider("MockPrimary", true, "retryable-error");
		const fallback = makeMockProvider(
			"MockFallback",
			true,
			"success",
			"fallback-ok",
		);

		const registry = new ProviderRegistry();
		(registry as unknown as Record<string, unknown>).providers = new Map([
			["openai", primary],
			["anthropic", fallback],
		]);

		(router as unknown as { registry: ProviderRegistry }).registry = registry;

		// Override the model map so PRIMARY = openai/... and FALLBACK = anthropic/...
		const originalMap = (
			router as unknown as { modelMap: Record<string, string[]> }
		).modelMap;
		(router as unknown as { modelMap: Record<string, string[]> }).modelMap = {
			...originalMap,
			[TaskType.GENERAL_CHAT]: ["openai/gpt-4o", "anthropic/claude-4.5-sonnet"],
		};

		const messages: ChatMessage[] = [{ role: "user", content: "hello" }];
		const result = await router.complete(TaskType.GENERAL_CHAT, messages);

		expect(result.choices[0].message.content).toBe("fallback-ok");
		expect(primary.chat).toHaveBeenCalledTimes(1);
		expect(fallback.chat).toHaveBeenCalledTimes(1);
	});

	it("stops immediately on non-retryable (fatal) error", async () => {
		const primary = makeMockProvider("MockPrimary", true, "fatal-error");
		const fallback = makeMockProvider(
			"MockFallback",
			true,
			"success",
			"should-not-reach",
		);

		const registry = new ProviderRegistry();
		(registry as unknown as Record<string, unknown>).providers = new Map([
			["openai", primary],
			["anthropic", fallback],
		]);

		(router as unknown as { registry: ProviderRegistry }).registry = registry;

		const originalMap = (
			router as unknown as { modelMap: Record<string, string[]> }
		).modelMap;
		(router as unknown as { modelMap: Record<string, string[]> }).modelMap = {
			...originalMap,
			[TaskType.GENERAL_CHAT]: ["openai/gpt-4o", "anthropic/claude-4.5-sonnet"],
		};

		const messages: ChatMessage[] = [{ role: "user", content: "hello" }];

		await expect(
			router.complete(TaskType.GENERAL_CHAT, messages),
		).rejects.toThrow("auth failed");
		expect(primary.chat).toHaveBeenCalledTimes(1);
		expect(fallback.chat).not.toHaveBeenCalled();
	});

	it("throws when all providers fail with retryable errors", async () => {
		const primary = makeMockProvider("MockPrimary", true, "retryable-error");
		const fallback = makeMockProvider("MockFallback", true, "retryable-error");

		const registry = new ProviderRegistry();
		(registry as unknown as Record<string, unknown>).providers = new Map([
			["openai", primary],
			["anthropic", fallback],
		]);

		(router as unknown as { registry: ProviderRegistry }).registry = registry;

		const originalMap = (
			router as unknown as { modelMap: Record<string, string[]> }
		).modelMap;
		(router as unknown as { modelMap: Record<string, string[]> }).modelMap = {
			...originalMap,
			[TaskType.GENERAL_CHAT]: ["openai/gpt-4o", "anthropic/claude-4.5-sonnet"],
		};

		const messages: ChatMessage[] = [{ role: "user", content: "hello" }];

		// When every provider fails with a retryable error, the last error is
		// surfaced so the caller has the most specific diagnostic possible.
		await expect(
			router.complete(TaskType.GENERAL_CHAT, messages),
		).rejects.toThrow("MockFallback rate limited");
	});
});

// ---------------------------------------------------------------------------
// ProviderError
// ---------------------------------------------------------------------------

describe("ProviderError", () => {
	it("carries retryable flag", () => {
		const err = new ProviderError("boom", "OpenAI", "gpt-4o", true, 429);
		expect(err.retryable).toBe(true);
		expect(err.provider).toBe("OpenAI");
		expect(err.modelId).toBe("gpt-4o");
		expect(err.statusCode).toBe(429);
	});

	it("carries non-retryable flag", () => {
		const err = new ProviderError("boom", "Anthropic", "claude", false, 401);
		expect(err.retryable).toBe(false);
	});
});
