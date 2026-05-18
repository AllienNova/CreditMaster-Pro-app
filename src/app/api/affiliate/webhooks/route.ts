import { NextRequest, NextResponse } from "next/server";
import { revenueTracker } from "@/lib/affiliate/revenue-tracker";
import type { RevenueEventType } from "@/lib/affiliate/revenue-tracker";
import { commissionCalculator } from "@/lib/commerce/affiliate";
import type { ConversionType } from "@/lib/commerce/affiliate";
import { timingSafeEqual } from "@/lib/security/timing-safe-equal";

/**
 * POST /api/affiliate/webhooks
 *
 * MoneyLion webhook endpoint for conversion events.
 * Verifies HMAC-SHA256 signature, then dispatches to revenue tracker.
 *
 * Headers:
 *   X-MoneyLion-Signature - HMAC-SHA256(body, webhook_secret)
 *   X-MoneyLion-Timestamp - Unix timestamp (replay protection)
 *
 * Body: { event, data: { clickId, productId, partnerId, userId?, amount?, commission? } }
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-moneylion-signature");
    const timestamp = request.headers.get("x-moneylion-timestamp");

    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing signature headers" },
        { status: 401 },
      );
    }

    // Replay protection: reject events older than 5 minutes
    const eventAge = Date.now() - Number.parseInt(timestamp) * 1000;
    if (eventAge > 5 * 60 * 1000 || eventAge < -30 * 1000) {
      return NextResponse.json(
        { error: "Timestamp out of range" },
        { status: 401 },
      );
    }

    const rawBody = await request.text();

    // Verify HMAC-SHA256 signature
    const webhookSecret = process.env.MONEYLION_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("MONEYLION_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signaturePayload = `${timestamp}.${rawBody}`;
    const expectedSig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signaturePayload),
    );
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!timingSafeEqual(signature, expectedHex)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    const body = JSON.parse(rawBody);

    if (!body.event || !body.data) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    }

    // Map MoneyLion webhook events to our revenue event types
    const eventMap: Record<string, RevenueEventType> = {
      "click.created": "click",
      "application.started": "application",
      "application.submitted": "application",
      "approval.granted": "approval",
      "conversion.completed": "conversion",
    };

    // Map revenue event types to ConversionType for commission calculation.
    // `conversion` -> `purchase`: a conversion.completed event is a fulfilled
    // transaction (a sale), not a lead. cpl partners intentionally pay 0 for a
    // `purchase` — fulfilment events belong to cpa/revenue_share/hybrid partners.
    const conversionTypeMap: Record<RevenueEventType, ConversionType> = {
      click: "click",
      application: "application",
      approval: "approval",
      conversion: "purchase",
    };

    const eventType = eventMap[body.event];
    if (!eventType) {
      // Acknowledge unknown events without processing
      return NextResponse.json({ success: true, skipped: true });
    }

    const { data } = body;
    const partnerId = String(data.partnerId || "");
    const amount = typeof data.amount === "number" ? data.amount : 0;

    // Recompute commission server-side from trusted inputs.
    // The inbound data.commission is IGNORED — a signed webhook proves origin,
    // not that the body's money values are correct.
    // calculateCommission returns 0 for an unknown/missing partner rather than throwing.
    const commissionAmount = await commissionCalculator.calculateCommission(
      partnerId,
      conversionTypeMap[eventType],
      amount,
    );

    await revenueTracker.trackEvent({
      eventType,
      productId: String(data.productId || ""),
      partnerId,
      userId: String(data.userId || "anonymous"),
      commissionAmount,
      timestamp: new Date(),
      metadata: {
        clickId: String(data.clickId || ""),
        webhookEvent: body.event,
        webhookTimestamp: String(timestamp),
      },
    });

    return NextResponse.json({ success: true, event: body.event });
  } catch (error) {
    console.error("Error processing affiliate webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
