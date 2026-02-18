/**
 * Voice Synthesis API
 *
 * Converts text to speech using AIML API's voice models
 * (OpenAI TTS-1 HD or ElevenLabs)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAIMLService } from "@/lib/aiml-service";

export async function POST(request: NextRequest) {
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

    const model = body.model || "tts-1-hd";
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
}

export async function GET() {
  return NextResponse.json({
    message: "Voice Synthesis API",
    method: "POST",
    endpoint: "/api/voice/synthesize",
    requiredFields: ["text"],
    optionalFields: ["model", "voice"],
    availableVoices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    availableModels: ["tts-1", "tts-1-hd"],
    maxTextLength: 4096,
  });
}
