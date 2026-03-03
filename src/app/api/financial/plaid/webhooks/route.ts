/**
 * POST /api/financial/plaid/webhooks
 *
 * Receives Plaid webhook events. Verifies the signature using the
 * Plaid-Verification JWT header, parses the body, and dispatches the
 * event to the PlaidWebhookService.
 *
 * This endpoint is NOT authenticated via the normal JWT/RBAC middleware
 * because the caller is Plaid's infrastructure, not a logged-in user.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  plaidWebhookService,
  type PlaidWebhookEvent,
} from "@/lib/financial/plaid-webhook-handler";

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isPlaidWebhookEvent(value: unknown): value is PlaidWebhookEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.webhook_type === "string" &&
    typeof obj.webhook_code === "string" &&
    typeof obj.item_id === "string"
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Read raw body for signature verification
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 },
    );
  }

  // 2. Build a headers map for verification
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // 3. Verify the webhook signature
  let signatureValid: boolean;
  try {
    signatureValid = await plaidWebhookService.verifyWebhookSignature(
      rawBody,
      headers,
    );
  } catch {
    return NextResponse.json(
      { error: "Signature verification error" },
      { status: 401 },
    );
  }

  if (!signatureValid) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  // 4. Parse the JSON body
  let event: PlaidWebhookEvent;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isPlaidWebhookEvent(parsed)) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    }
    event = parsed;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // 5. Dispatch to the webhook service
  try {
    await plaidWebhookService.handleEvent(event);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PlaidWebhookRoute] Handler error:", message);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 },
    );
  }
}
