/**
 * Voice Synthesis API
 *
 * Converts text to speech using AIML API's voice models.
 * The model is validated server-side against an allowlist (FND-060 / CMP-6).
 * (OpenAI TTS-1 HD or ElevenLabs)
 *
 * NOTE: This route imports AIMLService directly because ModelRouter.complete()
 * targets chat completions only; TTS is a distinct audio.speech call with no
 * ModelRouter execution path. Exempt in no-direct-aiml-service lint rule.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { getAIMLService } from "@/lib/aiml-service";

const VALID_TTS_MODELS = ["tts-1", "tts-1-hd"] as const;
type TTSModel = (typeof VALID_TTS_MODELS)[number];

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Validate required fields
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: text",
        },
        { status: 400 },
      );
    }

    if (text.length > 4096) {
      return NextResponse.json(
        {
          success: false,
          error: "Text too long. Maximum 4096 characters.",
        },
        { status: 400 },
      );
    }

    // Validate model against server-side whitelist (FND-060)
    const requestedModel: string = body.model ?? "tts-1-hd";
    if (!VALID_TTS_MODELS.includes(requestedModel as TTSModel)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid model. Must be one of: ${VALID_TTS_MODELS.join(", ")}`,
        },
        { status: 400 },
      );
    }
    const model = requestedModel as TTSModel;

    const voice = body.voice || "alloy";

    // Validate voice
    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    if (!validVoices.includes(voice)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid voice. Must be one of: ${validVoices.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Generate speech
    const aiml = getAIMLService();
    const audioBuffer = await aiml.generateSpeech(text, model, voice);

    // Convert ArrayBuffer to Buffer for Next.js response
    const buffer = Buffer.from(audioBuffer);

    // Return audio as response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": 'inline; filename="speech.mp3"',
      },
    });
  } catch (error) {
    console.error("Voice synthesis error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to synthesize speech",
      },
      { status: 500 },
    );
  }
});

export const GET = withAuth(async () => {
  return NextResponse.json({
    message: "Voice Synthesis API",
    method: "POST",
    endpoint: "/api/voice/synthesize",
    requiredFields: ["text"],
    optionalFields: ["model", "voice"],
    availableVoices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    availableModels: VALID_TTS_MODELS,
    maxTextLength: 4096,
  });
});
