/**
 * OpenAI-Compatible Provider Base
 *
 * OpenAI, DeepSeek, and Mistral all expose an OpenAI-compatible HTTP API.
 * This base class centralises the shared logic; subclasses only supply
 * baseURL + apiKey env var name + provider name.
 */

import "openai/shims/node";
import OpenAI from "openai";
import type { ChatMessage, ChatOptions } from "@/lib/aiml-service";
import {
	type AIProvider,
	type NormalizedChatCompletion,
	type NormalizedChatCompletionChunk,
	ProviderError,
} from "./types";

export interface OpenAICompatibleConfig {
	apiKey: string;
	baseURL: string;
	providerName: string;
	defaultModel?: string;
}

export class OpenAICompatibleProvider implements AIProvider {
	readonly name: string;
	private client: OpenAI | null = null;
	private config: OpenAICompatibleConfig;

	constructor(config: OpenAICompatibleConfig) {
		this.name = config.providerName;
		this.config = config;
	}

	isAvailable(): boolean {
		return !!this.config.apiKey && this.config.apiKey.length > 0;
	}

	private getClient(): OpenAI {
		if (!this.client) {
			this.client = new OpenAI({
				apiKey: this.config.apiKey,
				baseURL: this.config.baseURL,
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
			const res = await this.getClient().chat.completions.create({
				model: modelId || this.config.defaultModel || "gpt-4o",
				messages:
					messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
				temperature: options?.temperature ?? 0.7,
				max_tokens: options?.max_tokens ?? 2000,
				top_p: options?.top_p,
				frequency_penalty: options?.frequency_penalty,
				presence_penalty: options?.presence_penalty,
				stream: false,
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
			const stream = await this.getClient().chat.completions.create({
				model: modelId || this.config.defaultModel || "gpt-4o",
				messages:
					messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
				temperature: options?.temperature ?? 0.7,
				max_tokens: options?.max_tokens ?? 2000,
				stream: true,
			});

			return this.normalizeStream(stream, modelId);
		} catch (err) {
			throw this.toProviderError(err, modelId, "chatStream");
		}
	}

	private normalizeCompletion(
		res: OpenAI.Chat.Completions.ChatCompletion,
		modelId: string,
	): NormalizedChatCompletion {
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
	}

	private async *normalizeStream(
		source: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
		modelId: string,
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

		// Retryable: 429 (rate limit), 5xx, timeouts, network errors
		const retryable =
			status === 429 ||
			(status !== undefined && status >= 500) ||
			message.toLowerCase().includes("timeout") ||
			message.toLowerCase().includes("econnreset") ||
			message.toLowerCase().includes("etimedout");

		return new ProviderError(
			`${this.name} ${operation} failed: ${message}`,
			this.name,
			modelId,
			retryable,
			status,
			err,
		);
	}
}
