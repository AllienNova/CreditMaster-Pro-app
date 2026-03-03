/**
 * OpenAPI Specification Endpoint
 *
 * Serves the auto-generated OpenAPI 3.0 specification for all 275 API routes.
 * Regenerate with: npx tsx scripts/generate-openapi.ts
 */

import { NextResponse } from "next/server";
import { generatedOpenAPISpec } from "@/lib/api/generated-openapi-spec";

export async function GET() {
  return NextResponse.json(generatedOpenAPISpec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
