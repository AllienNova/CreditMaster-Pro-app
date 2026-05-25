/**
 * Mistral Direct Provider
 *
 * Mistral exposes an OpenAI-compatible API at api.mistral.ai/v1.
 */

import { OpenAICompatibleProvider } from "./openai-compatible-provider";

export function createMistralProvider(): OpenAICompatibleProvider {
	return new OpenAICompatibleProvider({
		providerName: "Mistral",
		apiKey: process.env.MISTRAL_API_KEY ?? "",
		baseURL: process.env.MISTRAL_BASE_URL ?? "https://api.mistral.ai/v1",
		defaultModel: process.env.MISTRAL_DEFAULT_MODEL ?? "mistral-large-latest",
	});
}
