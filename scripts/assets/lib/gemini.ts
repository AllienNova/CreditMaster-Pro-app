import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in environment or .env.local");
  return new GoogleGenAI({ apiKey: key });
}

export interface GenerateImageResult {
  path: string;
  bytes: number;
  model: string;
  prompt: string;
  resolution?: string;
  ms?: number;
}

export async function generateImage(params: {
  prompt: string;
  model: string;
  outPath: string;
  resolution?: string;
}): Promise<GenerateImageResult> {
  const ai = getClient();
  const start = Date.now();

  const imageConfig =
    params.resolution !== undefined
      ? { imageSize: params.resolution }
      : undefined;

  const response = await ai.models.generateContent({
    model: params.model,
    contents: params.prompt,
    config: {
      responseModalities: ["IMAGE"],
      ...(imageConfig ? { imageConfig } : {}),
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    const candidateText = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join(" ");
    throw new Error(
      `No image part in response. Candidate text: "${candidateText}". ` +
        `Parts: ${JSON.stringify(parts.map((p) => ({ hasText: !!p.text, hasBlobData: !!p.inlineData?.data })))}`
    );
  }

  const imageData = Buffer.from(imagePart.inlineData.data, "base64");
  fs.mkdirSync(path.dirname(params.outPath), { recursive: true });
  fs.writeFileSync(params.outPath, imageData);

  return {
    path: params.outPath,
    bytes: imageData.length,
    model: params.model,
    prompt: params.prompt,
    resolution: params.resolution,
    ms: Date.now() - start,
  };
}
