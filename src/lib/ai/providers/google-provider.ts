/**
 * Google Gemini Direct Provider
 *
 * Native integration with Google GenAI using the official `@google/genai` SDK.
 */

import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, ChatOptions } from "@/lib/aiml-service";
import {
	type AIProvider,
	type NormalizedChatCompletion,
	type NormalizedChatCompletionChunk,
	ProviderError,
} from "./types";

export class GoogleProvider implements AIProvider {
	readonly name = "Google";
	private client: GoogleGenAI | null = null;

	isAvailable(): boolean {
		return (
			!!process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 0
		);
	}

	private getClient(): GoogleGenAI {
		if (!this.client) {
			this.client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
		}
		return this.client;
	}

	async chat(
		modelId: string,
		messages: ChatMessage[],
		options?: ChatOptions,
	): Promise<NormalizedChatCompletion> {
		try {
			const { system, contents } = this.toGeminiFormat(messages);
			const model =
				modelId ||
				process.env.GOOGLE_DEFAULT_MODEL ||
				"gemini-2.5-pro-preview-03-25";

			const result = await this.getClient().models.generateContent({
				model,
				contents,
				config: {
					systemInstruction: system || undefined,
					temperature: options?.temperature ?? 0.7,
					maxOutputTokens: options?.max_tokens ?? 2000,
					topP: options?.top_p,
				},
			});

			return this.normalizeCompletion(result, model);
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
			const { system, contents } = this.toGeminiFormat(messages);
			const model =
				modelId ||
				process.env.GOOGLE_DEFAULT_MODEL ||
				"gemini-2.5-pro-preview-03-25";

			const stream = await this.getClient().models.generateContentStream({
				model,
				contents,
				config: {
					systemInstruction: system || undefined,
					temperature: options?.temperature ?? 0.7,
					maxOutputTokens: options?.max_tokens ?? 2000,
					topP: options?.top_p,
				},
			});

			return this.normalizeStream(stream, model);
		} catch (err) {
			throw this.toProviderError(err, modelId, "chatStream");
		}
	}

	private toGeminiFormat(messages: ChatMessage[]): {
		system: string | null;
		contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
	} {
		const systemMsgs = messages.filter((m) => m.role === "system");
		const system =
			systemMsgs.length > 0
				? systemMsgs.map((m) => m.content).join("\n")
				: null;

		const contents = messages
			.filter((m) => m.role !== "system")
			.map((m) => ({
				role: m.role === "assistant" ? ("model" as const) : ("user" as const),
				parts: [{ text: m.content }],
			}));

		return { system, contents };
	}

	private normalizeCompletion(
		res: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>,
		modelId: string,
	): NormalizedChatCompletion {
		const text = res.text ?? "";
		return {
			id: `google-${Date.now()}`,
			object: "chat.completion",
			created: Math.floor(Date.now() / 1000),
			model: modelId,
			choices: [
				{
					index: 0,
					message: { role: "assistant", content: text },
					finish_reason: "stop",
				},
			],
			usage: {
				prompt_tokens: res.usageMetadata?.promptTokenCount ?? 0,
				completion_tokens: res.usageMetadata?.candidatesTokenCount ?? 0,
				total_tokens: res.usageMetadata?.totalTokenCount ?? 0,
			},
		};
	}

	private async *normalizeStream(
		source: AsyncIterable<unknown>,
		modelId: string,
	): AsyncIterable<NormalizedChatCompletionChunk> {
		for await (const chunk of source) {
			const c = chunk as {
				text?: string;
				usageMetadata?: {
					promptTokenCount?: number;
					candidatesTokenCount?: number;
					totalTokenCount?: number;
				};
			};
			if (c.text) {
				yield {
					id: `google-${Date.now()}`,
					object: "chat.completion.chunk",
					created: Math.floor(Date.now() / 1000),
					model: modelId,
					choices: [
						{
							index: 0,
							delta: { role: "assistant", content: c.text },
							finish_reason: null,
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
			`Google ${operation} failed: ${message}`,
			this.name,
			modelId,
			retryable,
			status,
			err,
		);
	}
}

export function createGoogleProvider(): GoogleProvider {
	return new GoogleProvider();
}
