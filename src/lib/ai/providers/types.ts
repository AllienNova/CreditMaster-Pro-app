/**
 * AI Provider — shared types and interfaces
 *
 * Normalizes across OpenAI, Anthropic, Google, Mistral, DeepSeek, and AIML API
 * so that ModelRouter can route and fallback across providers transparently.
 */

// Re-export the canonical message / options shapes from aiml-service so the
// entire AI layer speaks one dialect.
export type { ChatMessage, ChatOptions } from "@/lib/aiml-service";

/** Token usage common to every provider. */
export interface TokenUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}

/** Normalized chat-completion shape — provider-agnostic. */
export interface NormalizedChatCompletion {
	id: string;
	object: "chat.completion";
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: "assistant";
			content: string;
		};
		finish_reason: string | null;
	}>;
	usage: TokenUsage;
}

/** Normalized streaming chunk — provider-agnostic. */
export interface NormalizedChatCompletionChunk {
	id: string;
	object: "chat.completion.chunk";
	created: number;
	model: string;
	choices: Array<{
		index: number;
		delta: {
			role?: "assistant";
			content?: string;
		};
		finish_reason: string | null;
	}>;
}

/**
 * ProviderError — wraps any failure from a provider so ModelRouter can decide
 * whether to retry the same provider, fall back to the next model/provider, or
 * surface the error immediately.
 */
export class ProviderError extends Error {
	constructor(
		message: string,
		public readonly provider: string,
		public readonly modelId: string,
		public readonly retryable: boolean,
		public readonly statusCode?: number,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "ProviderError";
	}
}

/**
 * Every direct provider (and the AIML fallback wrapper) implements this.
 */
export interface AIProvider {
	/** Human-readable provider name, e.g. "OpenAI", "Anthropic". */
	readonly name: string;

	/** Whether this provider is configured and ready (API key present). */
	isAvailable(): boolean;

	/** Non-streaming chat completion. */
	chat(
		modelId: string,
		messages: import("@/lib/aiml-service").ChatMessage[],
		options?: import("@/lib/aiml-service").ChatOptions,
	): Promise<NormalizedChatCompletion>;

	/** Streaming chat completion. */
	chatStream(
		modelId: string,
		messages: import("@/lib/aiml-service").ChatMessage[],
		options?: import("@/lib/aiml-service").ChatOptions,
	): Promise<AsyncIterable<NormalizedChatCompletionChunk>>;
}
