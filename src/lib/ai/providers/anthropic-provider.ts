/**
 * Anthropic Direct Provider
 *
 * Native integration with api.anthropic.com using the official SDK.
 * Converts OpenAI-style messages to Anthropic's format on the way in and
 * normalises the response on the way out.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ChatOptions } from "@/lib/aiml-service";
import {
	type AIProvider,
	type NormalizedChatCompletion,
	type NormalizedChatCompletionChunk,
	ProviderError,
} from "./types";

export class AnthropicProvider implements AIProvider {
	readonly name = "Anthropic";
	private client: Anthropic | null = null;

	isAvailable(): boolean {
		return (
			!!process.env.ANTHROPIC_API_KEY &&
			process.env.ANTHROPIC_API_KEY.length > 0
		);
	}

	private getClient(): Anthropic {
		if (!this.client) {
			this.client = new Anthropic({
				apiKey: process.env.ANTHROPIC_API_KEY,
				baseURL: process.env.ANTHROPIC_BASE_URL,
			});
		}
		return this.client;
	}

	async chat(
		modelId: string,
		messages: ChatMessage[],
		options?: ChatOptions,
	): Promise<NormalizedChatCompletion> {
		try {
			const { system, conversation } = this.splitSystem(messages);
			const res = await this.getClient().messages.create({
				model: modelId || "claude-3-5-sonnet-20241022",
				max_tokens: options?.max_tokens ?? 2000,
				temperature: options?.temperature ?? 0.7,
				top_p: options?.top_p,
				system: system || undefined,
				messages: conversation,
			});

			return this.normalizeCompletion(res, modelId);
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
			const { system, conversation } = this.splitSystem(messages);
			const stream = await this.getClient().messages.create({
				model: modelId || "claude-3-5-sonnet-20241022",
				max_tokens: options?.max_tokens ?? 2000,
				temperature: options?.temperature ?? 0.7,
				top_p: options?.top_p,
				system: system || undefined,
				messages: conversation,
				stream: true,
			});

			return this.normalizeStream(stream, modelId);
		} catch (err) {
			throw this.toProviderError(err, modelId, "chatStream");
		}
	}

	/** Extract system message ( Anthropic uses a top-level `system` param ). */
	private splitSystem(messages: ChatMessage[]): {
		system: string | null;
		conversation: Anthropic.MessageParam[];
	} {
		const systemMsgs = messages.filter((m) => m.role === "system");
		const system =
			systemMsgs.length > 0
				? systemMsgs.map((m) => m.content).join("\n")
				: null;

		const conversation: Anthropic.MessageParam[] = messages
			.filter((m) => m.role !== "system")
			.map((m) => ({
				role: m.role as "user" | "assistant",
				content: m.content,
			}));

		return { system, conversation };
	}

	private normalizeCompletion(
		res: Anthropic.Message,
		modelId: string,
	): NormalizedChatCompletion {
		const text = res.content.find((c) => c.type === "text")?.text ?? "";

		return {
			id: res.id,
			object: "chat.completion",
			created: Math.floor(Date.now() / 1000),
			model: res.model || modelId,
			choices: [
				{
					index: 0,
					message: { role: "assistant", content: text },
					finish_reason: res.stop_reason ?? "stop",
				},
			],
			usage: {
				prompt_tokens: res.usage?.input_tokens ?? 0,
				completion_tokens: res.usage?.output_tokens ?? 0,
				total_tokens:
					(res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0),
			},
		};
	}

	private async *normalizeStream(
		source: AsyncIterable<Anthropic.MessageStreamEvent>,
		modelId: string,
	): AsyncIterable<NormalizedChatCompletionChunk> {
		let buffer = "";
		for await (const event of source) {
			if (
				event.type === "content_block_delta" &&
				event.delta.type === "text_delta"
			) {
				const text = event.delta.text;
				buffer += text;
				yield {
					id: `anthropic-${Date.now()}`,
					object: "chat.completion.chunk",
					created: Math.floor(Date.now() / 1000),
					model: modelId,
					choices: [
						{
							index: 0,
							delta: { role: "assistant", content: text },
							finish_reason: null,
						},
					],
				};
			}
			if (event.type === "message_stop") {
				yield {
					id: `anthropic-${Date.now()}`,
					object: "chat.completion.chunk",
					created: Math.floor(Date.now() / 1000),
					model: modelId,
					choices: [
						{
							index: 0,
							delta: {},
							finish_reason: "stop",
						},
					],
				};
			}
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
			`Anthropic ${operation} failed: ${message}`,
			this.name,
			modelId,
			retryable,
			status,
			err,
		);
	}
}

export function createAnthropicProvider(): AnthropicProvider {
	return new AnthropicProvider();
}
