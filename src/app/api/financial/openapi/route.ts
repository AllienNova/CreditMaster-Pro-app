/**
 * OpenAPI Specification Endpoint
 *
 * Serves the OpenAPI 3.0 specification for the Financial API
 * Can be used with Swagger UI, Postman, or other API documentation tools
 */

import { NextResponse } from "next/server";
import { openAPISpec } from "@/lib/api/openapi-spec";

export async function GET() {
  return NextResponse.json(openAPISpec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
