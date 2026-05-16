/**
 * Individual Trading Signal API
 *
 * Phase 5.1.3: Enhanced with Zod validation and rate limiting
 * Endpoints for managing individual trading signals
 */

import { NextRequest, NextResponse } from "next/server";
import { SignalGenerator } from "@/lib/investments/signal-generator";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { rateLimit } from "@/lib/security/redis-rate-limiting";
import { z } from "zod";

// Initialize signal generator
const signalGenerator = new SignalGenerator();

// Rate limiter: 100 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Validation schema for outcome tracking
const TrackOutcomeSchema = z.object({
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional(),
  status: z.enum(["executed", "expired", "cancelled"]),
});

/**
 * GET /api/investments/signals/[id]
 * Get a specific signal by ID with current strength evaluation
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Rate limiting
    try {
      await limiter.check(100, user.id); // 100 requests per hour
    } catch {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 100 requests per hour." },
        { status: 429 },
      );
    }

    const id = request.nextUrl.pathname.split("/").pop() ?? "";

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid signal ID format" },
        { status: 400 },
      );
    }

    const signals = await signalGenerator.getSignalHistory(user.id);
    const signal = signals.find((s) => s.id === id);

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    // Evaluate current strength
    const evaluation = await signalGenerator.evaluateSignalStrength(id);

    return NextResponse.json({
      success: true,
      data: {
        ...signal,
        currentEvaluation: evaluation,
      },
    });
  } catch (error) {
    console.error("Error fetching signal:", error);
    return NextResponse.json(
      { error: "Failed to fetch signal" },
      { status: 500 },
    );
  }
});

/**
 * PATCH /api/investments/signals/[id]
 * Update signal outcome (track execution)
 *
 * Request Body:
 * {
 *   entryPrice: number (required) - Entry price
 *   exitPrice: number (optional) - Exit price if closed
 *   status: 'executed' | 'expired' | 'cancelled' (required)
 * }
 */
export const PATCH = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Rate limiting
    try {
      await limiter.check(100, user.id); // 100 requests per hour
    } catch {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 100 requests per hour." },
        { status: 429 },
      );
    }

    const id = request.nextUrl.pathname.split("/").pop() ?? "";

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid signal ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body with Zod
    const validatedData = TrackOutcomeSchema.parse(body);

    // Authorization: a user may only mutate their own signal. Confirm the
    // signal belongs to the caller before tracking its outcome — mirrors GET.
    const ownedSignals = await signalGenerator.getSignalHistory(user.id);
    if (!ownedSignals.some((s) => s.id === id)) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const outcome = await signalGenerator.trackSignalOutcome(id, validatedData);

    return NextResponse.json({
      success: true,
      data: outcome,
      message: `Signal ${validatedData.status}`,
    });
  } catch (error) {
    console.error("Error updating signal:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update signal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
