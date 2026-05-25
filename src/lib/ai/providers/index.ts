/**
 * AI Provider Adapters — unified interface for multi-provider routing.
 *
 * Export the registry and types so consumers can inspect which direct
 * providers are configured without pulling in every SDK.
 */

export {
	ProviderRegistry,
	getProviderRegistry,
	resetProviderRegistry,
} from "./registry";
export type { ProviderRegistryConfig } from "./registry";

export {
	ProviderError,
	type AIProvider,
	type NormalizedChatCompletion,
	type NormalizedChatCompletionChunk,
	type TokenUsage,
} from "./types";

export { OpenAICompatibleProvider } from "./openai-compatible-provider";
export { createOpenAIProvider } from "./openai-provider";
export {
	createAnthropicProvider,
	AnthropicProvider,
} from "./anthropic-provider";
export { createGoogleProvider, GoogleProvider } from "./google-provider";
export { createDeepSeekProvider } from "./deepseek-provider";
export { createMistralProvider } from "./mistral-provider";
export { createAIMLProvider, AIMLProvider } from "./aiml-provider";
