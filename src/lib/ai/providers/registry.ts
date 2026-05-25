/**
 * Provider Registry
 *
 * Maps model-ID prefixes to direct-provider adapters so ModelRouter can route
 * a request to the correct backend without hard-coding provider logic in the
 * router itself.
 *
 * Example:
 *   "anthropic/claude-4.5-sonnet" → AnthropicProvider
 *   "openai/gpt-5-pro"            → OpenAIProvider
 *   "deepseek/deepseek-r1"        → DeepSeekProvider
 *   "google/gemini-2.5-pro"       → GoogleProvider
 *   "mistral/mistral-large"       → MistralProvider
 *   anything else                 → AIMLProvider (catch-all)
 */

import { type AIProvider } from "./types";
import { createOpenAIProvider } from "./openai-provider";
import { createAnthropicProvider } from "./anthropic-provider";
import { createGoogleProvider } from "./google-provider";
import { createDeepSeekProvider } from "./deepseek-provider";
import { createMistralProvider } from "./mistral-provider";
import { createAIMLProvider } from "./aiml-provider";

export interface ProviderRegistryConfig {
	/** When true, always use AIML API even if direct keys exist. */
	forceAimlFallback?: boolean;
}

export class ProviderRegistry {
	private providers: Map<string, AIProvider> = new Map();
	private aiml: AIProvider;
	private config: ProviderRegistryConfig;

	constructor(config: ProviderRegistryConfig = {}) {
		this.config = config;
		this.aiml = createAIMLProvider();

		// Register direct providers. Order matters only for introspection, not
		// for routing — routing is prefix-based.
		this.register("openai", createOpenAIProvider());
		this.register("anthropic", createAnthropicProvider());
		this.register("google", createGoogleProvider());
		this.register("deepseek", createDeepSeekProvider());
		this.register("mistral", createMistralProvider());
	}

	private register(prefix: string, provider: AIProvider): void {
		this.providers.set(prefix, provider);
	}

	/**
	 * Resolve a model ID to the best provider.
	 *
	 * If `forceAimlFallback` is set, or no direct provider is available for the
	 * prefix, the AIMLProvider is returned (it proxies every model).
	 */
	getProvider(modelId: string): AIProvider {
		if (this.config.forceAimlFallback) {
			return this.aiml;
		}

		const prefix = modelId.split("/")[0];
		const direct = this.providers.get(prefix);

		if (direct && direct.isAvailable()) {
			return direct;
		}

		return this.aiml;
	}

	/** List every registered direct provider. */
	getDirectProviders(): AIProvider[] {
		return Array.from(this.providers.values());
	}

	/** The AIML catch-all provider. */
	getAimlProvider(): AIProvider {
		return this.aiml;
	}

	/** Quick health check: which direct providers are configured? */
	availableDirectProviders(): string[] {
		return this.getDirectProviders()
			.filter((p) => p.isAvailable())
			.map((p) => p.name);
	}
}

let registryInstance: ProviderRegistry | null = null;

export function getProviderRegistry(
	config?: ProviderRegistryConfig,
): ProviderRegistry {
	if (!registryInstance) {
		registryInstance = new ProviderRegistry(config);
	}
	return registryInstance;
}

export function resetProviderRegistry(): void {
	registryInstance = null;
}
