/**
 * OpenAI Direct Provider
 *
 * Routes to api.openai.com/v1 instead of AIML API proxy.
 */

import { OpenAICompatibleProvider } from "./openai-compatible-provider";

export function createOpenAIProvider(): OpenAICompatibleProvider {
	return new OpenAICompatibleProvider({
		providerName: "OpenAI",
		apiKey: process.env.OPENAI_API_KEY ?? "",
		baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
		defaultModel: process.env.OPENAI_DEFAULT_MODEL ?? "gpt-4o",
	});
}
