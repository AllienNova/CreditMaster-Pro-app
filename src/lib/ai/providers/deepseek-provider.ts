/**
 * DeepSeek Direct Provider
 *
 * DeepSeek exposes an OpenAI-compatible API at api.deepseek.com/v1.
 */

import { OpenAICompatibleProvider } from "./openai-compatible-provider";

export function createDeepSeekProvider(): OpenAICompatibleProvider {
	return new OpenAICompatibleProvider({
		providerName: "DeepSeek",
		apiKey: process.env.DEEPSEEK_API_KEY ?? "",
		baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
		defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL ?? "deepseek-chat",
	});
}
