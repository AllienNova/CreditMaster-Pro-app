/**
 * AIML API Provider Wrapper
 *
 * Wraps the existing AIMLService so it fits the AIProvider interface.
 * This is the catch-all fallback: when a model ID does not match any direct
 * provider, or when no direct provider keys are configured, AIML API steps in.
 *
 * AIMLService is imported dynamically so that the OpenAI SDK shim does not
 * get loaded eagerly in test environments that never call AIML.
 */

import type { ChatMessage, ChatOptions } from "@/lib/aiml-service";
import {
	type AIProvider,
	type NormalizedChatCompletion,
	type NormalizedChatCompletionChunk,
	ProviderError,
} from "./types";

export class AIMLProvider implements AIProvider {
	readonly name = "AIML";
	private service: import("@/lib/aiml-service").AIMLService | null = null;

	isAvailable(): boolean {
		return !!process.env.AIML_API_KEY && process.env.AIML_API_KEY.length > 0;
	}

	private async getService(): Promise<
		import("@/lib/aiml-service").AIMLService
	> {
		if (!this.service) {
			const { AIMLService: AIMLServiceClass } = await import(
				"@/lib/aiml-service"
			);
			this.service = new AIMLServiceClass();
		}
		return this.service;
	}

	async chat(
		modelId: string,
		messages: ChatMessage[],
		options?: ChatOptions,
	): Promise<NormalizedChatCompletion> {
		try {
			const res = await (await this.getService()).chat(
				modelId,
				messages,
				options,
			);
			return {
				id: res.id,
				object: "chat.completion",
				created: res.created,
				model: res.model || modelId,
				choices: res.choices.map((c) => ({
					index: c.index,
					message: {
						role: "assistant" as const,
						content: c.message.content ?? "",
					},
					finish_reason: c.finish_reason,
				})),
				usage: {
					prompt_tokens: res.usage?.prompt_tokens ?? 0,
					completion_tokens: res.usage?.completion_tokens ?? 0,
					total_tokens: res.usage?.total_tokens ?? 0,
				},
			};
		} catch (err) {
			throw this.toProviderError(err, modelId, "chat");
		}
	}

	async chatStream(
		modelId: string,
		messages: ChatMessage[],
		options?: ChatOptions,
	): Promise<AsyncIterable<NormalizedChatCompletionChunk>> {
		try {
			const stream = await (await this.getService()).chatStream(
				modelId,
				messages,
				options,
			);

			async function* normalize(
				source: AsyncIterable<{
					id: string;
					object: string;
					created: number;
					model: string;
					choices: Array<{
						index: number;
						delta: {
							role?: string;
							content?: string | null;
						};
						finish_reason: string | null;
					}>;
				}>,
			): AsyncIterable<NormalizedChatCompletionChunk> {
				for await (const chunk of source) {
					yield {
						id: chunk.id,
						object: "chat.completion.chunk",
						created: chunk.created,
						model: chunk.model || modelId,
						choices: chunk.choices.map((c) => ({
							index: c.index,
							delta: {
								role: c.delta.role as "assistant" | undefined,
								content: c.delta.content ?? undefined,
							},
							finish_reason: c.finish_reason,
						})),
					};
				}
			}

			return normalize(stream);
		} catch (err) {
			throw this.toProviderError(err, modelId, "chatStream");
		}
	}

	private toProviderError(
		err: unknown,
		modelId: string,
		operation: string,
	): ProviderError {
		const message = err instanceof Error ? err.message : "Unknown error";
		const status =
			err && typeof err === "object" && "status" in err
				? Number((err as Record<string, unknown>).status)
				: undefined;

		const retryable =
			status === 429 ||
			(status !== undefined && status >= 500) ||
			message.toLowerCase().includes("timeout");

		return new ProviderError(
			`AIML ${operation} failed: ${message}`,
			this.name,
			modelId,
			retryable,
			status,
			err,
		);
	}
}

export function createAIMLProvider(): AIMLProvider {
	return new AIMLProvider();
}
