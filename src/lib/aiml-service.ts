/**
 * AIML API Service
 *
 * Unified service wrapper for AIML API providing access to 300+ AI models
 * including GPT-5, Claude 4.5, DeepSeek R1, Gemini 2.5, and more.
 *
 * @see https://aimlapi.com
 * @see https://docs.aimlapi.com
 */

// Import OpenAI shims for Node.js environment (required before OpenAI import)
import 'openai/shims/node';
import OpenAI from 'openai';

export interface AIMLConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ImageGenerationOptions {
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  n?: number;
}

export interface EmbeddingOptions {
  dimensions?: number;
}

/**
 * AIML Service Class
 * 
 * Provides methods to interact with AIML API's 300+ models
 */
export class AIMLService {
  private client: OpenAI;
  private config: AIMLConfig;

  constructor(config?: AIMLConfig) {
    this.config = {
      apiKey: config?.apiKey || process.env.AIML_API_KEY || '',
      baseURL: config?.baseURL || process.env.AIML_BASE_URL || 'https://api.aimlapi.com/v1',
      defaultModel: config?.defaultModel || process.env.AIML_DEFAULT_CHAT_MODEL || 'anthropic/claude-4.5-sonnet',
    };

    if (!this.config.apiKey) {
      throw new Error('AIML API key is required. Set AIML_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Chat completion with specified model
   * 
   * @param model - Model ID (e.g., 'anthropic/claude-4.5-sonnet', 'openai/gpt-5-pro')
   * @param messages - Array of chat messages
   * @param options - Optional chat parameters
   * @returns Chat completion response
   */
  async chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      const response = await this.client.chat.completions.create({
        model: model || this.config.defaultModel!,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2000,
        top_p: options?.top_p,
        frequency_penalty: options?.frequency_penalty,
        presence_penalty: options?.presence_penalty,
        stream: false,
      });

      return response as OpenAI.Chat.Completions.ChatCompletion;
    } catch (error) {
      console.error('AIML Chat Error:', error);
      throw new Error(`AIML chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chat completion with streaming
   * 
   * @param model - Model ID
   * @param messages - Array of chat messages
   * @param options - Optional chat parameters
   * @returns Stream of chat completion chunks
   */
  async chatStream(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    try {
      const stream = await this.client.chat.completions.create({
        model: model || this.config.defaultModel!,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2000,
        stream: true,
      });

      return stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    } catch (error) {
      console.error('AIML Chat Stream Error:', error);
      throw new Error(`AIML chat stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image from text prompt
   * 
   * @param prompt - Text description of the image
   * @param model - Image generation model (e.g., 'flux-pro', 'stable-diffusion-xl')
   * @param options - Optional image generation parameters
   * @returns Image generation response with URLs
   */
  async generateImage(
    prompt: string,
    model: string = 'flux-pro',
    options?: ImageGenerationOptions
  ): Promise<OpenAI.Images.ImagesResponse> {
    try {
      const response = await this.client.images.generate({
        model,
        prompt,
        size: options?.size ?? '1024x1024',
        quality: options?.quality ?? 'standard',
        n: options?.n ?? 1,
      });

      return response;
    } catch (error) {
      console.error('AIML Image Generation Error:', error);
      throw new Error(`AIML image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for text
   * 
   * @param text - Text to generate embeddings for
   * @param model - Embedding model (e.g., 'text-embedding-3-large')
   * @param options - Optional embedding parameters
   * @returns Embedding response
   */
  async createEmbedding(
    text: string | string[],
    model: string = 'text-embedding-3-large',
    options?: EmbeddingOptions
  ): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
    try {
      const response = await this.client.embeddings.create({
        model,
        input: text,
        dimensions: options?.dimensions,
      });

      return response;
    } catch (error) {
      console.error('AIML Embedding Error:', error);
      throw new Error(`AIML embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio to text
   * 
   * @param audioFile - Audio file to transcribe
   * @param model - Speech-to-text model (e.g., 'whisper-1')
   * @returns Transcription response
   */
  async transcribe(
    audioFile: File,
    model: string = 'whisper-1'
  ): Promise<OpenAI.Audio.Transcription> {
    try {
      const response = await this.client.audio.transcriptions.create({
        model,
        file: audioFile,
      });

      return response;
    } catch (error) {
      console.error('AIML Transcription Error:', error);
      throw new Error(`AIML transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate speech from text
   * 
   * @param text - Text to convert to speech
   * @param model - Text-to-speech model (e.g., 'tts-1', 'tts-1-hd')
   * @param voice - Voice to use (alloy, echo, fable, onyx, nova, shimmer)
   * @returns Audio buffer
   */
  async generateSpeech(
    text: string,
    model: string = 'tts-1-hd',
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'
  ): Promise<ArrayBuffer> {
    try {
      const response = await this.client.audio.speech.create({
        model,
        voice,
        input: text,
      });

      return await response.arrayBuffer();
    } catch (error) {
      console.error('AIML Speech Generation Error:', error);
      throw new Error(`AIML speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Moderate content for safety
   * 
   * @param text - Text to moderate
   * @returns Moderation response
   */
  async moderate(text: string): Promise<OpenAI.Moderations.ModerationCreateResponse> {
    try {
      const response = await this.client.moderations.create({
        input: text,
      });

      return response;
    } catch (error) {
      console.error('AIML Moderation Error:', error);
      throw new Error(`AIML moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the underlying OpenAI client for advanced usage
   * 
   * @returns OpenAI client instance
   */
  getClient(): OpenAI {
    return this.client;
  }

  /**
   * Get current configuration
   * 
   * @returns AIML configuration
   */
  getConfig(): AIMLConfig {
    return { ...this.config };
  }
}

/**
 * Create a singleton instance of AIML service
 */
let aimlInstance: AIMLService | null = null;

export function getAIMLService(config?: AIMLConfig): AIMLService {
  if (!aimlInstance) {
    aimlInstance = new AIMLService(config);
  }
  return aimlInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetAIMLService(): void {
  aimlInstance = null;
}

export default AIMLService;

